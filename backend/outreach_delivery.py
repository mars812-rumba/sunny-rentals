"""Safe delivery errors shared by the Telegram adapter and campaign runner."""
import re
from typing import Any


ERROR_LABELS = {
    "bot_blocked": "Пользователь заблокировал бота",
    "user_deactivated": "Аккаунт Telegram деактивирован",
    "chat_not_found": "Чат Telegram недоступен",
    "rate_limited": "Лимит Telegram: повторите позже",
    "bot_unauthorized": "Ошибка авторизации Telegram-бота",
    "delivery_unavailable": "Сервис отправки временно недоступен",
    "delivery_unknown": "Доставка не подтверждена",
    "activation_failed": "Сообщение отправлено, но Claude не включён",
}
PERMANENT_REASONS = {"bot_blocked", "user_deactivated", "chat_not_found"}
TELEGRAM_DESCRIPTIONS = {
    "bot_blocked": "Forbidden: bot was blocked by the user",
    "user_deactivated": "Forbidden: user is deactivated",
    "chat_not_found": "Bad Request: chat not found",
}


class OutreachDeliveryError(RuntimeError):
    def __init__(self, code: Any = None, description: str = "", retry_after: Any = None):
        # Older bot processes return HTTP 500 with the SDK error in detail.
        # Parse that exact response too, so a rolling upgrade preserves reasons.
        match = re.search(r"Error code:\s*(\d{3})", description, re.I)
        try:
            self.error_code = int(match[1] if match else code)
        except (ValueError, TypeError):
            self.error_code = None
        lower = description.lower()
        if self.error_code == 403 and "bot was blocked by the user" in lower:
            self.reason = "bot_blocked"
        elif self.error_code == 403 and "user is deactivated" in lower:
            self.reason = "user_deactivated"
        elif self.error_code == 400 and "chat not found" in lower:
            self.reason = "chat_not_found"
        elif self.error_code == 429:
            self.reason = "rate_limited"
        elif self.error_code == 401:
            self.reason = "bot_unauthorized"
        elif self.error_code is not None and self.error_code >= 500:
            self.reason = "delivery_unavailable"
        else:
            self.reason = "delivery_unknown"
        self.permanent = self.reason in PERMANENT_REASONS
        if retry_after is None:
            retry_match = re.search(r"retry after\s+(\d+)", description, re.I)
            if retry_match:
                retry_after = retry_match[1]
        try:
            self.retry_after = max(1, int(retry_after)) if retry_after is not None else None
        except (ValueError, TypeError, OverflowError):
            self.retry_after = None
        if self.reason == "rate_limited" and self.retry_after is None:
            self.retry_after = 60
        # No raw exception/URL/token is returned to CRM or persisted in campaign state.
        super().__init__(ERROR_LABELS[self.reason])

    def as_event(self):
        result = {"error": str(self), "error_code": self.error_code,
                  "error_reason": self.reason, "permanent_failure": self.permanent}
        if self.retry_after is not None:
            result["retry_after"] = self.retry_after
        return result

    @classmethod
    def from_exception(cls, error):
        payload = getattr(error, "result_json", None) or {}
        if not isinstance(payload, dict):
            payload = {}
        parameters = payload.get("parameters") or {}
        return cls(payload.get("error_code", getattr(error, "error_code", 503)),
                   str(payload.get("description", getattr(error, "description", str(error)))),
                   parameters.get("retry_after") if isinstance(parameters, dict) else None)


def failure_from_response(response):
    """Decode current structured responses and legacy SDK detail strings."""
    try:
        payload = response.json()
    except (ValueError, TypeError):
        payload = {}
    if not isinstance(payload, dict):
        payload = {}
    detail = payload.get("detail", payload)
    if isinstance(detail, dict):
        parameters = detail.get("parameters") or {}
        return OutreachDeliveryError(
            detail.get("error_code", response.status_code),
            str(detail.get("description", detail.get("telegram_description", ""))),
            detail.get("retry_after", parameters.get("retry_after") if isinstance(parameters, dict) else None),
        )
    return OutreachDeliveryError(response.status_code, str(detail))
