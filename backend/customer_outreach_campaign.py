#!/usr/bin/env python3
"""Resumable Telegram outreach for current and archived Sunny clients.

The command is deliberately dry-run by default. A live run requires both
``--send`` and the exact campaign confirmation token.
"""

from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable

import requests


CAMPAIGN_ID = "sunny-reengagement-2026-08-09"
CONFIRM_TOKEN = CAMPAIGN_ID
GREETING = (
    "Привет! Это Sunny Rentals 🚗 Нужна машина или байк на Пхукете? "
    "Напишите даты — помогу подобрать доступный вариант."
)
ADMIN_IDS = {6451825371}


def normalize_user_id(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    try:
        user_id = int(value)
    except (TypeError, ValueError):
        return None
    return user_id if user_id > 0 else None


def _record_timestamp(record: Dict[str, Any]) -> float:
    for field in ("updated_at", "archived_at", "timestamp", "created_at"):
        value = record.get(field)
        if not value:
            continue
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
        except ValueError:
            continue
    return 0.0


def load_recipients(data_dir: Path) -> Dict[int, Dict[str, Any]]:
    """Return one newest record per Telegram ID from live data and archive."""
    recipients: Dict[int, Dict[str, Any]] = {}
    for filename in ("user_data.json", "archive.json"):
        path = data_dir / filename
        raw = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(raw, list):
            raise ValueError(f"{path} must contain a JSON list")
        for record in raw:
            if not isinstance(record, dict):
                continue
            user_id = normalize_user_id(record.get("user_id"))
            if user_id is None or user_id in ADMIN_IDS:
                continue
            candidate = {**record, "_campaign_source": filename}
            previous = recipients.get(user_id)
            if previous is None or _record_timestamp(candidate) >= _record_timestamp(previous):
                recipients[user_id] = candidate
    return recipients


def load_campaign_state(log_path: Path) -> Dict[int, Dict[str, bool]]:
    """Fold the append-only log into delivery and activation state per user."""
    state: Dict[int, Dict[str, bool]] = {}
    if not log_path.exists():
        return state
    for line in log_path.read_text(encoding="utf-8").splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        user_id = normalize_user_id(event.get("user_id"))
        if user_id is None:
            continue
        current = state.setdefault(user_id, {"delivered": False, "claude_active": False})
        current["delivered"] = current["delivered"] or bool(event.get("delivered"))
        current["claude_active"] = current["claude_active"] or bool(event.get("claude_active"))
    return state


def load_completed(log_path: Path) -> set[int]:
    """Compatibility helper returning fully completed recipients."""
    return {
        user_id
        for user_id, status in load_campaign_state(log_path).items()
        if status["delivered"] and status["claude_active"]
    }


def append_event(log_path: Path, event: Dict[str, Any]) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, ensure_ascii=False) + "\n")


def select_recipient_batch(
    recipients: Dict[int, Dict[str, Any]],
    campaign_state: Dict[int, Dict[str, bool]],
    limit: int,
) -> list[tuple[int, Dict[str, Any]]]:
    """Select newest recipients that have not received the greeting yet."""
    pending = [
        (user_id, record)
        for user_id, record in recipients.items()
        if not campaign_state.get(user_id, {}).get("delivered")
    ]
    pending.sort(key=lambda item: _record_timestamp(item[1]), reverse=True)
    return pending[: max(0, int(limit))]


def activate_claude(session: requests.Session, api_base: str, user_id: int) -> Dict[str, Any]:
    claude_response = session.post(
        f"{api_base}/api/claude/resume/{user_id}",
        timeout=20,
    )
    claude_response.raise_for_status()
    claude_payload = claude_response.json()
    return {
        "claude_active": claude_payload.get("status") == "success",
        "claude_result": claude_payload,
    }


def send_one(session: requests.Session, api_base: str, user_id: int, message: str) -> Dict[str, Any]:
    timestamp = datetime.now(timezone.utc).isoformat()
    send_response = session.post(
        f"{api_base}/api/crm/send_message",
        json={"user_id": user_id, "text": message, "role": "manager", "timestamp": timestamp},
        timeout=20,
    )
    send_response.raise_for_status()
    send_payload = send_response.json()
    delivered = bool(send_payload.get("sent_via_bot")) and send_payload.get("status") in {
        "ok",
        "success",
    }
    if not delivered:
        return {"delivered": False, "claude_active": False, "send_result": send_payload}

    # Resume does not start a second qualification message. It only makes
    # Claude answer the client's next Telegram message.
    return {"delivered": True, "send_result": send_payload, **activate_claude(session, api_base, user_id)}


def require_service(session: requests.Session, base_url: str, name: str) -> None:
    try:
        response = session.get(f"{base_url}/openapi.json", timeout=5)
        response.raise_for_status()
    except Exception as error:
        raise RuntimeError(f"{name} is unavailable at {base_url}: {error}") from error


def run_campaign(
    recipients: Dict[int, Dict[str, Any]],
    *,
    api_base: str,
    log_path: Path,
    message: str,
    delay_seconds: float,
    limit: int | None = None,
) -> Dict[str, int]:
    campaign_state = load_campaign_state(log_path)
    stats = {"audience": len(recipients), "skipped": 0, "delivered": 0, "failed": 0}
    session = requests.Session()

    ordered_ids = [user_id for user_id, _ in select_recipient_batch(
        recipients,
        campaign_state,
        limit if limit is not None else len(recipients),
    )]
    # Activation retries never resend a greeting and do not consume the send limit.
    activation_retries = [
        user_id
        for user_id, status in campaign_state.items()
        if status.get("delivered") and not status.get("claude_active") and user_id in recipients
    ]
    for user_id in activation_retries + ordered_ids:
        previous = campaign_state.get(user_id, {})
        if previous.get("delivered") and previous.get("claude_active"):
            stats["skipped"] += 1
            continue
        record = recipients[user_id]
        event: Dict[str, Any] = {
            "campaign_id": CAMPAIGN_ID,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "source": record.get("_campaign_source"),
        }
        try:
            if previous.get("delivered"):
                result = {"delivered": True, **activate_claude(session, api_base, user_id)}
            else:
                result = send_one(session, api_base, user_id, message)
            event.update(result)
            if result["delivered"] and result["claude_active"]:
                stats["delivered"] += 1
            else:
                stats["failed"] += 1
        except Exception as error:  # one inaccessible chat must not stop the campaign
            event.update({"delivered": False, "claude_active": False, "error": str(error)})
            stats["failed"] += 1
        append_event(log_path, event)
        time.sleep(max(0.0, delay_seconds))

    return stats


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=Path(__file__).parent / "data")
    parser.add_argument("--api-base", default="http://127.0.0.1:8000")
    parser.add_argument("--bot-base", default="http://127.0.0.1:5001")
    parser.add_argument("--delay", type=float, default=0.2, help="Delay between clients")
    parser.add_argument("--limit", type=int, default=None, help="Maximum number of new greetings")
    parser.add_argument("--send", action="store_true", help="Perform external sends")
    parser.add_argument("--confirm", default="", help=f"Must equal {CONFIRM_TOKEN!r}")
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    recipients = load_recipients(args.data_dir)
    archive_count = sum(r.get("_campaign_source") == "archive.json" for r in recipients.values())
    current_count = len(recipients) - archive_count
    print(f"Campaign: {CAMPAIGN_ID}")
    print(f"Audience: {len(recipients)} (current={current_count}, archive={archive_count})")
    print(f"Greeting: {GREETING}")

    if not args.send:
        print("DRY RUN: no messages sent and no Claude statuses changed.")
        return 0
    if args.confirm != CONFIRM_TOKEN:
        raise SystemExit(f"Live run requires --confirm {CONFIRM_TOKEN}")

    session = requests.Session()
    try:
        require_service(session, args.api_base.rstrip("/"), "CRM API")
        require_service(session, args.bot_base.rstrip("/"), "Telegram bot API")
    except RuntimeError as error:
        print(f"ABORTED BEFORE SEND: {error}")
        return 3

    log_path = args.data_dir / "campaigns" / f"{CAMPAIGN_ID}.jsonl"
    stats = run_campaign(
        recipients,
        api_base=args.api_base.rstrip("/"),
        log_path=log_path,
        message=GREETING,
        delay_seconds=args.delay,
        limit=args.limit,
    )
    print(json.dumps(stats, ensure_ascii=False))
    return 0 if stats["failed"] == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
