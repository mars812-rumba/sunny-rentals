import re
from typing import Any, Dict, List, Tuple


SEASON_LABELS = {
    "low_season": "низкий сезон (апрель–октябрь)",
    "high_season": "высокий сезон (ноябрь–март)",
}


def _rate(value: Any) -> str:
    return f"{value} {_baht_word(value)}" if isinstance(value, (int, float)) and value > 0 else "нет данных"


def _baht_word(value: Any) -> str:
    """Use the Russian form after a number; fractional amounts take 'бата'."""
    try:
        amount = float(str(value).replace(" ", "").replace(",", ""))
    except (TypeError, ValueError):
        return "батов"
    if not amount.is_integer():
        return "бата"
    number = int(amount)
    if 11 <= number % 100 <= 14:
        return "батов"
    return {1: "бат", 2: "бата", 3: "бата", 4: "бата"}.get(number % 10, "батов")


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
    normalized = text.lower().replace("ё", "е")
    manager_quote = (
        r"\bменеджер\b.{0,100}\b(?:посчитает|рассчитает|расчет|стоимость|цену)\b"
        r"|\b(?:расчет|сумму|стоимость|цену)\b.{0,100}\b(?:посчитает|рассчитает|подтвердит)\b.{0,50}\bменеджер\b"
        r"|\bпередам\b.{0,30}\bменеджер\b.{0,30}\bрасчет\b"
    )
    if re.search(manager_quote, normalized, re.DOTALL):
        text = "Проверю ваши даты и точную стоимость. Скоро вернусь с ответом."
    amount = r"\d+(?:[,\s]\d{3})*(?:[.,]\d{1,2})?"
    text = re.sub(
        rf"({amount})\s*฿",
        lambda match: f"{match.group(1)} {_baht_word(match.group(1))}",
        text,
    )
    text = re.sub(
        rf"฿\s*({amount})",
        lambda match: f"{match.group(1)} {_baht_word(match.group(1))}",
        text,
    )
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
    quote_followup = (
        "скоро вернусь с ответом" in normalized
        and re.search(r"\b(?:дат|датам|даты|цен|стоимост|расчет)", normalized)
    )
    return bool(quote_followup or any(re.search(pattern, normalized) for pattern in patterns))


def is_short_affirmative(text: str) -> bool:
    """Return True for a short confirmation such as "да" or "покажи"."""
    normalized = re.sub(r"[^a-zа-я0-9]+", " ", (text or "").lower().replace("ё", "е")).strip()
    if not normalized or len(normalized.split()) > 4:
        return False
    return normalized in {
        "да",
        "ага",
        "угу",
        "ок",
        "окей",
        "давай",
        "покажи",
        "покажите",
        "да покажи",
        "да покажите",
        "хочу",
        "можно",
        "конечно",
    }


def offers_to_show_photo(text: str) -> bool:
    """Recognize that the assistant is waiting for permission to show photos."""
    normalized = " ".join((text or "").lower().replace("ё", "е").split())
    if not re.search(r"\bфото(?:графи(?:ю|и))?\b", normalized):
        return False
    return bool(re.search(r"\b(?:показать|показать вам|покажу|скинуть|скину|отправить|отправлю)\b", normalized))


def find_offered_car_main_photo(text: str, cars: Any) -> str:
    """Find the main photo of the real catalogue car named in an AI offer."""
    if isinstance(cars, dict):
        car_items = list(cars.values())
    elif isinstance(cars, list):
        car_items = cars
    else:
        return ""

    haystack = re.sub(r"[^a-zа-я0-9]+", " ", (text or "").lower().replace("ё", "е"))
    best_score = 0
    best_photo = ""

    for car in car_items:
        if not isinstance(car, dict) or not car.get("available", True):
            continue
        main_photo = (car.get("photos") or {}).get("main")
        if not main_photo:
            continue

        brand = str(car.get("brand") or "").lower()
        model = str(car.get("model") or "").lower()
        year = str(car.get("year") or "").lower()
        name = str(car.get("name") or "").lower()
        model_tokens = [token for token in re.findall(r"[a-zа-я0-9]+", model) if len(token) > 1]

        # A model match is mandatory. This prevents a generic "Toyota" mention
        # from selecting an unrelated catalogue car.
        if not model_tokens or not all(re.search(rf"\b{re.escape(token)}\b", haystack) for token in model_tokens):
            continue

        score = 8
        if brand and re.search(rf"\b{re.escape(brand)}\b", haystack):
            score += 4
        if year and re.search(rf"\b{re.escape(year)}\b", haystack):
            score += 3
        normalized_name = " ".join(re.findall(r"[a-zа-я0-9]+", name))
        if normalized_name and normalized_name in haystack:
            score += 10

        if score > best_score:
            best_score = score
            best_photo = str(main_photo).strip()

    return best_photo
