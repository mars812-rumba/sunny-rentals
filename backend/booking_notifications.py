"""Customer notifications and delayed fallback for WebApp bookings."""

from __future__ import annotations

import html
import threading
from datetime import datetime
from typing import Any, Callable, Dict, Iterable, Optional
from zoneinfo import ZoneInfo


BookingStatusLoader = Callable[[str], Optional[str]]
FallbackStarter = Callable[[int, str, Dict[str, Any]], bool]
TimerFactory = Callable[[float, Callable[[], None]], Any]
Logger = Callable[[str], None]

PHUKET_TIMEZONE = ZoneInfo("Asia/Bangkok")
ACTIVE_BOOKING_STATUSES = frozenset({"pre_booking", "confirmed"})


def format_booking_date(value: Any) -> str:
    """Format an ISO booking date in Phuket time without leaking UTC offsets."""
    if not value:
        return "—"
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if parsed.tzinfo is not None:
            parsed = parsed.astimezone(PHUKET_TIMEZONE)
        return parsed.strftime("%d.%m.%Y")
    except (TypeError, ValueError):
        return html.escape(str(value))


def booking_car_name(form_data: Dict[str, Any]) -> str:
    car = form_data.get("car") or {}
    name = car.get("name") or " ".join(
        str(car.get(field) or "").strip()
        for field in ("brand", "model", "year", "color")
    ).strip()
    return html.escape(name or "Выбранный транспорт")


def build_customer_booking_received(booking_id: str, form_data: Dict[str, Any]) -> str:
    dates = form_data.get("dates") or {}
    pricing = form_data.get("pricing") or {}
    days = dates.get("days") or "?"
    pickup_time = html.escape(str(dates.get("pickupTime") or "13:00"))
    return_time = html.escape(str(dates.get("returnTime") or "13:00"))
    total = int(pricing.get("grandTotal") or 0)
    deposit = int(pricing.get("deposit") or 0)

    return (
        f"✅ <b>Заявка #{html.escape(str(booking_id))} получена</b>\n\n"
        f"🚙 {booking_car_name(form_data)}\n"
        f"📅 {format_booking_date(dates.get('start'))} в {pickup_time} — "
        f"{format_booking_date(dates.get('end'))} в {return_time} ({days} дн.)\n"
        f"💳 Аренда и доставка: <b>{total:,} ฿</b>\n"
        f"🔐 Депозит: {deposit:,} ฿ отдельно\n\n"
        "Менеджер проверит доступность конкретной машины и напишет сюда. "
        "Бронь пока не подтверждена."
    )


def build_booking_claude_context(booking_id: str, form_data: Dict[str, Any]) -> str:
    """Build durable, explicit booking facts for every Claude turn."""
    car = form_data.get("car") or {}
    dates = form_data.get("dates") or {}
    locations = form_data.get("locations") or {}
    car_name = car.get("name") or " ".join(
        str(car.get(field) or "").strip()
        for field in ("brand", "model", "year", "color")
    ).strip() or "выбранный транспорт"
    location_names = {
        "airport": "аэропорт Пхукета",
        "hotel": "отель/город",
        "villa": "вилла/город",
    }
    pickup_location = locations.get("pickupLocation") or locations.get("pickup") or "не указано"
    return_location = (
        locations.get("returnLocation")
        or locations.get("dropoffLocation")
        or locations.get("return")
        or pickup_location
    )
    pickup_time = dates.get("pickupTime")
    return_time = dates.get("returnTime")
    pickup_when = format_booking_date(dates.get("start")) + (
        f" в {pickup_time}" if pickup_time else ", время не указано"
    )
    return_when = format_booking_date(dates.get("end")) + (
        f" в {return_time}" if return_time else ", время не указано"
    )

    return (
        f"АКТИВНАЯ ЗАЯВКА #{booking_id} — это уже известные и подтверждённые клиентом данные:\n"
        f"- Машина: {car_name}\n"
        f"- Получение: {pickup_when}\n"
        f"- Возврат: {return_when}\n"
        f"- Срок: {dates.get('days') or '?'} дн.\n"
        f"- Место получения: {location_names.get(pickup_location, pickup_location)}\n"
        f"- Место возврата: {location_names.get(return_location, return_location)}\n"
        "Не спрашивай повторно модель, даты, время или места, которые указаны выше. "
        "Можно уточнять только явно отсутствующую деталь, например неуказанное время "
        "или точный адрес отеля/виллы."
    )


def build_manager_started_message(booking_id: str) -> str:
    return (
        f"👋 <b>Менеджер взял заявку #{html.escape(str(booking_id))} в работу.</b>\n\n"
        "Сейчас проверим доступность конкретной машины и условия. "
        "Подтверждение придёт сюда отдельным сообщением."
    )


def build_booking_rejected_message(booking_id: str) -> str:
    return (
        f"По заявке <b>#{html.escape(str(booking_id))}</b> не удалось подтвердить "
        "выбранную машину. Напишите сюда — поможем подобрать альтернативу."
    )


def select_active_booking(
    bookings: Iterable[Dict[str, Any]],
    user_id: Any,
) -> Optional[Dict[str, Any]]:
    """Return the latest booking intent only when that intent is still active."""
    matching = [
        booking
        for booking in bookings
        if str(booking.get("user_id")) == str(user_id)
    ]
    if not matching:
        return None
    latest = max(
        matching,
        key=lambda booking: str(
            booking.get("created_at")
            or (booking.get("form_data") or {}).get("timestamp")
            or booking.get("updated_at")
            or ""
        ),
    )
    return latest if latest.get("status") in ACTIVE_BOOKING_STATUSES else None


def build_existing_booking_message(booking: Dict[str, Any]) -> str:
    """Explain the current booking state instead of reopening the catalogue."""
    booking_id = html.escape(str(booking.get("booking_id") or "—"))
    status = booking.get("status")
    form_data = booking.get("form_data") or {}
    dates = form_data.get("dates") or {}
    car_line = booking_car_name(form_data)
    date_line = (
        f"{format_booking_date(dates.get('start'))} в "
        f"{html.escape(str(dates.get('pickupTime') or '13:00'))} — "
        f"{format_booking_date(dates.get('end'))} в "
        f"{html.escape(str(dates.get('returnTime') or '13:00'))}"
    )

    if status == "confirmed":
        status_text = (
            "✅ Бронь подтверждена. Если нужно изменить место получения или другие "
            "детали — напиши их сюда."
        )
    else:
        status_text = (
            "Заявка уже у менеджера: проверяем доступность конкретной машины. "
            "Подтверждение придёт сюда — повторно выбирать автомобиль не нужно."
        )

    return (
        f"📋 <b>Заявка #{booking_id}</b>\n\n"
        f"🚙 {car_line}\n"
        f"📅 {date_line}\n\n"
        f"{status_text}"
    )


class BookingFallbackScheduler:
    """Start one fallback assistant response if a booking stays unhandled."""

    def __init__(
        self,
        *,
        delay_seconds: int,
        status_loader: BookingStatusLoader,
        fallback_starter: FallbackStarter,
        timer_factory: TimerFactory = threading.Timer,
        logger: Logger = print,
    ) -> None:
        self.delay_seconds = max(1, int(delay_seconds))
        self.status_loader = status_loader
        self.fallback_starter = fallback_starter
        self.timer_factory = timer_factory
        self.logger = logger
        self.pending_timers: Dict[str, Any] = {}
        self.pending_users: Dict[str, int] = {}
        self._lock = threading.RLock()

    def schedule(
        self,
        booking_id: Any,
        user_id: Any,
        form_data: Dict[str, Any],
    ) -> bool:
        booking_key = str(booking_id or "").strip()
        try:
            normalized_user_id = int(user_id)
        except (TypeError, ValueError):
            return False
        if not booking_key or normalized_user_id <= 0:
            return False

        timer = None

        def run_if_current() -> None:
            with self._lock:
                if self.pending_timers.get(booking_key) is not timer:
                    return
                self.pending_timers.pop(booking_key, None)
                self.pending_users.pop(booking_key, None)

            try:
                status = self.status_loader(booking_key)
            except Exception as error:
                self.logger(
                    f"Booking fallback skipped for {booking_key}: status error: {error}"
                )
                return
            if status != "pre_booking":
                self.logger(
                    f"Booking fallback skipped for {booking_key}: status={status!r}"
                )
                return

            try:
                started = self.fallback_starter(
                    normalized_user_id,
                    booking_key,
                    dict(form_data),
                )
            except Exception as error:
                self.logger(
                    f"Booking fallback failed for {booking_key}: start error: {error}"
                )
                return

            self.logger(
                f"Booking fallback {'started' if started else 'failed'} for {booking_key}"
            )

        timer = self.timer_factory(self.delay_seconds, run_if_current)
        timer.daemon = True

        with self._lock:
            previous = self.pending_timers.pop(booking_key, None)
            if previous is not None:
                previous.cancel()
            self.pending_timers[booking_key] = timer
            self.pending_users[booking_key] = normalized_user_id

        timer.start()
        self.logger(
            f"Booking fallback scheduled for {booking_key} in {self.delay_seconds} seconds"
        )
        return True

    def cancel(self, booking_id: Any, reason: str = "booking handled") -> bool:
        booking_key = str(booking_id or "").strip()
        with self._lock:
            timer = self.pending_timers.pop(booking_key, None)
            self.pending_users.pop(booking_key, None)
        if timer is None:
            return False
        timer.cancel()
        self.logger(f"Booking fallback cancelled for {booking_key}: {reason}")
        return True
