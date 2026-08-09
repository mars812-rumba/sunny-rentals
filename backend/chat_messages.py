"""Stable identities and backward-compatible deduplication for CRM chat logs."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional


def _timestamp(value: Any) -> Optional[datetime]:
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def _content_key(entry: Dict[str, Any]) -> str:
    content = entry.get("content", entry.get("text", ""))
    if isinstance(content, str):
        return " ".join(content.split())
    return json.dumps(content, ensure_ascii=False, sort_keys=True, default=str)


def _same_legacy_message(left: Dict[str, Any], right: Dict[str, Any]) -> bool:
    return (
        str(left.get("user_id")) == str(right.get("user_id"))
        and left.get("role") == right.get("role") == "user"
        and _content_key(left) == _content_key(right)
    )


def deduplicate_chat_entries(entries: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Remove known double-writes while preserving distinct customer messages."""
    source = [entry for entry in entries if isinstance(entry, dict)]
    result: List[Dict[str, Any]] = []
    seen_ids = set()

    for index, entry in enumerate(source):
        stable_id = entry.get("id") or entry.get("external_message_id")
        if stable_id:
            stable_id = str(stable_id)
            if stable_id in seen_ids:
                continue
            seen_ids.add(stable_id)

        # Legacy pattern: Telegram wrote the user message, then backend wrote the
        # same message immediately before its assistant response. Only suppress
        # that second copy; an intentional repeated message remains untouched.
        if result and _same_legacy_message(result[-1], entry):
            previous_at = _timestamp(result[-1].get("timestamp"))
            current_at = _timestamp(entry.get("timestamp"))
            next_entry = source[index + 1] if index + 1 < len(source) else None
            next_at = _timestamp(next_entry.get("timestamp")) if next_entry else None
            follows_with_assistant = bool(
                next_entry
                and str(next_entry.get("user_id")) == str(entry.get("user_id"))
                and next_entry.get("role") == "assistant"
                and current_at
                and next_at
                and 0 <= (next_at - current_at).total_seconds() <= 1
            )
            close_double_write = bool(
                previous_at
                and current_at
                and 0 <= (current_at - previous_at).total_seconds() <= 5
            )
            if close_double_write and follows_with_assistant:
                continue

        result.append(entry)

    return result
