import re
from typing import Any, Dict, List, Tuple


SEASON_LABELS = {
    "low_season": "низкий сезон (апрель–октябрь)",
    "high_season": "высокий сезон (ноябрь–март)",
}


def _rate(value: Any) -> str:
    return f"{value}฿" if isinstance(value, (int, float)) and value > 0 else "нет данных"


def build_pricing_context(pricing: Dict[str, Any]) -> str:
    """Expose the real rate grids without silently choosing the wrong season."""
    lines: List[str] = []
    for season_key in ("low_season", "high_season"):
        rates = pricing.get(season_key) or {}
        lines.append(
            f"{SEASON_LABELS[season_key]}: "
            f"1-6д={_rate(rates.get('price_1_6'))} | "
            f"7-14д={_rate(rates.get('price_7_14'))} | "
            f"15-29д={_rate(rates.get('price_15_29'))} | "
            f"30+д={_rate(rates.get('price_30'))}"
        )
    return "\n".join(lines)


def parse_claude_output(raw_response: str) -> Tuple[str, List[str]]:
    """Return Telegram-ready text and unique catalogue image paths."""
    cleaned = (raw_response or "").replace("**", "")
    bracket_images = re.findall(r"\[image:([^\]]+)\]", cleaned)
    markdown_images = re.findall(r"!\[[^\]]*\]\(image:([^)]+)\)", cleaned)

    photos: List[str] = []
    seen = set()
    for path in bracket_images + markdown_images:
        normalized = path.strip()
        if normalized and normalized not in seen:
            seen.add(normalized)
            photos.append(normalized)

    text = re.sub(r"\[image:[^\]]+\]", "", cleaned)
    text = re.sub(r"!\[[^\]]*\]\(image:[^)]+\)", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text, photos


def requests_manager_handoff(text: str) -> bool:
    """Recognize only affirmative handoff statements, not questions or suggestions."""
    normalized = " ".join((text or "").lower().replace("ё", "е").split())
    patterns = (
        r"\bпереда(?:ю|м)\b.{0,80}\bменеджер",
        r"\bменеджер\b.{0,80}\bсвяжется\b",
        r"\bподключа(?:ю|ем)\b.{0,80}\bменеджер",
    )
    return any(re.search(pattern, normalized) for pattern in patterns)
