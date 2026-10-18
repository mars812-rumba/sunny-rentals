"""Private draft queue. No publishing code; live operation requires explicit opt-in."""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen
import uuid

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config/seo-editorial.json"
STATE = ROOT / ".local/seo-editorial"


def instant(value):
    result = datetime.fromisoformat(value)
    if result.tzinfo is None:
        raise ValueError("Timezone required")
    return result


def load_config(path=CONFIG):
    config = json.loads(Path(path).read_text())
    instant(config["start_at"])
    if config["interval_hours"] != 48:
        raise ValueError("This queue requires a 48-hour interval")
    slugs = [topic["slug"] for topic in config["topics"]]
    if len(slugs) != len(set(slugs)) or not all(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) for slug in slugs):
        raise ValueError("Invalid or duplicate topic slug")
    return config


def atomic_json(path, value):
    # All paths are private queue files, never marketing content or production data.
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, delete=False, encoding="utf8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.flush()
        os.fsync(stream.fileno())
        temporary = stream.name
    os.replace(temporary, path)


def plan(config, state, now):
    topic = next((topic for topic in config["topics"] if state.get("topics", {}).get(topic["slug"], {}).get("status") != "pending_review"), None)
    due = instant(state.get("next_due", config["start_at"]))
    retry = state.get("retry_after")
    return {"topic": topic, "next_due": due.isoformat(),
            "ready": bool(topic) and now >= due and not state.get("halted") and (not retry or now >= instant(retry))}


def validate_draft(draft, topic):
    if draft.get("slug") != topic["slug"] or not draft.get("title", "").strip():
        raise ValueError("Draft identity mismatch")
    text = draft.get("draft_markdown", "")
    if not 450 <= len(text.split()) <= 1800 or not re.search(r"[а-яА-Я]", text):
        raise ValueError("Draft length or language invalid")
    if re.search(r"подмен|замен\w*\s+(?:авто|машин)|replacement vehicle", text, re.I):
        raise ValueError("Excluded topic")
    sources = draft.get("sources", [])
    for lang in ("ru", "en"):
        if len({source["url"] for source in sources if source.get("language") == lang}) < 2:
            raise ValueError("Insufficient RU/EN sources")
    hosts = set()
    for source in sources:
        parsed = urlsplit(source["url"])
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or not source.get("summary", "").strip():
            raise ValueError("Invalid source")
        hosts.add(parsed.hostname.removeprefix("www."))
    if len(hosts) < 3 or not draft.get("research_notes") or not isinstance(draft.get("owner_questions"), list):
        raise ValueError("Research notes incomplete")


def public_inventory_context(root=ROOT):
    """Small allowlisted sample of the same public inventory used by marketing.

    Not a booking availability check. Never forward supplier/contact/internal fields.
    """
    path = root / "backend/data/web_cars.json"
    if not path.is_file():
        return {"offers": [], "note": "Local public inventory unavailable; verify the public catalogue."}
    rows = json.loads(path.read_text()).get("cars", {})
    rows = rows.values() if isinstance(rows, dict) else rows
    offers, counts = [], {}
    for row in rows:
        category = row.get("class") or row.get("class_")
        if category not in ("compact", "sedan", "suv", "7s") or counts.get(category, 0) >= 2:
            continue
        pricing = row.get("pricing", {})
        tariffs = {}
        for season in ("low_season", "high_season"):
            tariffs[season] = {key: value for key, value in pricing.get(season, {}).items()
                               if re.fullmatch(r"price_\d+(?:_\d+)?", key)
                               and isinstance(value, (int, float)) and not isinstance(value, bool)
                               and value >= 0}
        photo = row.get("photos", {}).get("main", "")
        photo_path = Path(photo)
        image = None
        if photo and not photo_path.is_absolute() and ".." not in photo_path.parts:
            for public in (root / "public", root / "apps/marketing/public"):
                image_file = public / "images_web" / photo_path
                if image_file.is_file() and image_file.resolve().is_relative_to(public.resolve()):
                    from urllib.parse import quote
                    image = "/images_web/" + quote(photo, safe="/")
                    break
        offer = {"name": row.get("name"), "category": category,
                 "currency": "THB", "daily_rates": tariffs,
                 "source_updated_at": row.get("updated_at"), "photo_url": image}
        deposit = pricing.get("deposit")
        if isinstance(deposit, (int, float)) and not isinstance(deposit, bool) and deposit >= 0:
            offer["deposit_thb"] = deposit
        offers.append(offer)
        counts[category] = counts.get(category, 0) + 1
    return {"checked_at": datetime.now(timezone.utc).isoformat(),
            "source": "backend/data/web_cars.json — public marketing inventory",
            "catalogue_url": "/cars/", "offers": offers,
            "note": "Sample, not availability; verify season dates and final totals on the public site."}


def generate(topic, directory, *, wordstat=None):
    directory.mkdir(mode=0o700)
    output = directory / "response.json"
    prompt = (ROOT / "config/seo-editorial-prompt.md").read_text()
    for relative in (
        "skills/article-editor/SKILL.md",
        "config/article-project-profile.md",
        "config/article-editorial-memory.md",
    ):
        prompt += "\n\nРедакторские инструкции (" + relative + "):\n" + (ROOT / relative).read_text()
    policy = (ROOT / "apps/marketing/src/content/rental-policy.ts").read_text()
    prompt += "\nТема: " + json.dumps(topic, ensure_ascii=False) + "\nПубличная политика Sunny:\n" + policy
    prompt += "\nПубличные данные автопарка (выборка, не проверка наличия):\n" + json.dumps(public_inventory_context(), ensure_ascii=False)
    if wordstat is not None:
        prompt += (
            '\n\nПроверенные сервером данные Яндекс Wordstat:\n'
            + json.dumps(wordstat, ensure_ascii=False)
            + '\nИспользуй для понимания спроса и структуры статьи. Это частотности Яндекса, '
            'не Google и не уникальные люди; не суммируй пересекающиеся фразы. '
            'Сохраняй дату проверки и географию all; не называй это спросом только на Пхукете. '
            'При отсутствии подходящей фразы не выдумывай её частотность. '
            'В research_notes отметь использование этих данных. Они не заменяют веб-исследование источников.'
        )
    # Do not pass the Telegram token or unrelated application secrets to the model.
    allowed = ("PATH", "HOME", "CODEX_HOME", "XDG_CONFIG_HOME", "LANG", "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY", "CODEX_API_KEY")
    env = {name: os.environ[name] for name in allowed if name in os.environ}
    command = ["codex", "exec", "--ignore-user-config", "--ephemeral", "--sandbox", "read-only",
               "--disable", "shell_tool", "--disable", "multi_agent", "--disable", "apps",
               "-c", 'approval_policy="never"', "-c", 'web_search="live"',
               "--skip-git-repo-check", "-C", str(directory), "--json",
               "--output-schema", str(ROOT / "config/seo-draft.schema.json"), "-o", str(output), "-"]
    result = subprocess.run(command, input=prompt, text=True, capture_output=True, timeout=1200, env=env)
    if result.returncode != 0:
        raise RuntimeError("Draft generator failed")
    events = [json.loads(line) for line in result.stdout.splitlines() if line.startswith("{")]
    if not any(event.get("item", {}).get("type") == "web_search" and event.get("type") == "item.completed" for event in events):
        raise ValueError("No completed web research event")
    draft = json.loads(output.read_text())
    validate_draft(draft, topic)
    return draft


def review_document(draft):
    sources = "\n".join(f'- [{source["language"]}] {source["url"]}\n  {source["summary"]}' for source in draft["sources"])
    questions = "\n".join("- " + question for question in draft["owner_questions"]) or "Нет отдельных вопросов; требуется редакторская проверка."
    return f'# ЧЕРНОВИК — НЕ ОПУБЛИКОВАН\n\n{draft["draft_markdown"]}\n\n---\n## Исследование\n{draft["research_notes"]}\n\n## Источники\n{sources}\n\n## Вопросы владельцу\n{questions}\n'


def deliver(draft, token, chat):
    # One document keeps long articles intact instead of sending partial message chunks.
    boundary = "SunnySeo" + uuid.uuid4().hex
    fields = {"chat_id": chat, "caption": f'Черновик на проверку: {draft["title"][:180]}\nID: {draft["slug"]}\nНе опубликован. Ответьте в чате с правками или одобрением.'}
    body = b""
    for name, value in fields.items():
        body += f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode()
    body += f'--{boundary}\r\nContent-Disposition: form-data; name="document"; filename="{draft["slug"]}.md"\r\nContent-Type: text/markdown; charset=utf-8\r\n\r\n'.encode()
    body += review_document(draft).encode() + f"\r\n--{boundary}--\r\n".encode()
    request = Request(f"https://api.telegram.org/bot{token}/sendDocument", data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urlopen(request, timeout=40) as response:
        result = json.load(response)
    if result.get("ok") is not True:
        raise RuntimeError("Telegram delivery failed")
    return result["result"]["message_id"]


def notify_failure(token, chat, error_type, halted):
    text = f"Sunny: черновик не подготовлен/не доставлен ({error_type}). "
    text += "Три неудачи: очередь остановлена, нужна проверка." if halted else "Следующая попытка не раньше чем через 6 часов. Ничего не опубликовано."
    request = Request(f"https://api.telegram.org/bot{token}/sendMessage", data=urlencode({"chat_id": chat, "text": text}).encode())
    with urlopen(request, timeout=20) as response:
        if json.load(response).get("ok") is not True:
            raise RuntimeError("Notification failed")


def run_once(config, directory=STATE, now=None, generator=generate, sender=deliver, notifier=notify_failure):
    now = now or datetime.now(timezone.utc)
    token, chat = os.getenv("SUNNY_SEO_TELEGRAM_BOT_TOKEN"), os.getenv("SUNNY_SEO_REVIEW_CHAT_ID")
    if os.getenv("SUNNY_SEO_ENABLED") != "1":
        return "disabled"
    if not token or not chat:
        raise ValueError("Configure the dedicated review bot token and chat ID before enabling")
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (directory / "queue.lock").open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return "locked"
        state_path = directory / "state.json"
        state = json.loads(state_path.read_text()) if state_path.exists() else {"topics": {}}
        selected = plan(config, state, now)
        if not selected["ready"]:
            return "halted" if state.get("halted") else "exhausted" if selected["topic"] is None else "not_due"
        topic = selected["topic"]
        record = state["topics"].setdefault(topic["slug"], {})
        draft_path = directory / (topic["slug"] + ".json")
        try:
            if record.get("status") == "awaiting_delivery":
                draft = json.loads(draft_path.read_text())
                validate_draft(draft, topic)
            else:
                draft = generator(topic, directory / ("research-" + uuid.uuid4().hex))
                validate_draft(draft, topic)
                atomic_json(draft_path, draft)
                record["status"] = "awaiting_delivery"
                atomic_json(state_path, state)
            message_id = sender(draft, token, chat)
            record.update(status="pending_review", message_id=message_id, delivered_at=now.isoformat())
            # Advance only a successful job, never replay missed slots as a burst.
            state["next_due"] = (now + timedelta(hours=config["interval_hours"])).isoformat()
            state.pop("retry_after", None)
            state["failures"] = 0
            atomic_json(state_path, state)
            return "pending_review"
        except Exception as error:
            state["failures"] = state.get("failures", 0) + 1
            state["retry_after"] = (now + timedelta(hours=6)).isoformat()
            state["halted"] = state["failures"] >= 3
            state["last_error_type"] = type(error).__name__
            atomic_json(state_path, state)
            try:
                notifier(token, chat, type(error).__name__, state["halted"])
            except Exception:
                pass  # A Telegram outage must not discard the saved retry state.
            # Never log exception text: network errors may contain the Telegram token URL.
            raise RuntimeError("Editorial job failed; inspect private state, retry capped at three") from None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    config = load_config()
    if args.dry_run:
        state_path = STATE / "state.json"
        state = json.loads(state_path.read_text()) if state_path.exists() else {}
        print(json.dumps({"enabled": os.getenv("SUNNY_SEO_ENABLED") == "1", **plan(config, state, datetime.now(timezone.utc))}, ensure_ascii=False))
    else:
        print(run_once(config))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Editorial check failed: " + type(error).__name__)
        raise SystemExit(1)
