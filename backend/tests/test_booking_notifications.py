import unittest

from booking_notifications import (
    BookingFallbackScheduler,
    build_booking_claude_context,
    build_customer_booking_received,
    build_existing_booking_message,
    format_booking_date,
    select_active_booking,
)


class FakeTimer:
    def __init__(self, delay, callback):
        self.delay = delay
        self.callback = callback
        self.daemon = False
        self.started = False
        self.cancelled = False

    def start(self):
        self.started = True

    def cancel(self):
        self.cancelled = True

    def fire(self):
        if not self.cancelled:
            self.callback()


class BookingNotificationTests(unittest.TestCase):
    def make_scheduler(self, status="pre_booking"):
        timers = []
        started = []

        def timer_factory(delay, callback):
            timer = FakeTimer(delay, callback)
            timers.append(timer)
            return timer

        scheduler = BookingFallbackScheduler(
            delay_seconds=300,
            status_loader=lambda _booking_id: status,
            fallback_starter=lambda user_id, booking_id, form_data: (
                started.append((user_id, booking_id, form_data)) or True
            ),
            timer_factory=timer_factory,
            logger=lambda _message: None,
        )
        return scheduler, timers, started

    def test_fallback_starts_for_unhandled_booking(self):
        scheduler, timers, started = self.make_scheduler()
        self.assertTrue(scheduler.schedule("abc123", "42", {"car": {"name": "Yaris"}}))
        self.assertEqual(timers[0].delay, 300)
        timers[0].fire()
        self.assertEqual(started[0][0:2], (42, "abc123"))

    def test_fallback_is_cancelled_when_manager_handles_booking(self):
        scheduler, timers, started = self.make_scheduler()
        scheduler.schedule("abc123", 42, {})
        self.assertTrue(scheduler.cancel("abc123", "manager started"))
        timers[0].fire()
        self.assertEqual(started, [])

    def test_confirmed_booking_does_not_start_fallback(self):
        scheduler, timers, started = self.make_scheduler(status="confirmed")
        scheduler.schedule("abc123", 42, {})
        timers[0].fire()
        self.assertEqual(started, [])

    def test_customer_message_uses_phuket_date_and_clear_status(self):
        message = build_customer_booking_received(
            "abc123",
            {
                "car": {"name": "Mazda CX30"},
                "dates": {
                    "start": "2026-08-18T21:00:00.000Z",
                    "end": "2026-08-29T21:00:00.000Z",
                    "days": 12,
                },
                "pricing": {"grandTotal": 16888, "deposit": 8000},
            },
        )
        self.assertIn("19.08.2026", message)
        self.assertIn("30.08.2026", message)
        self.assertIn("в 13:00", message)
        self.assertIn("Бронь пока не подтверждена", message)

    def test_invalid_date_falls_back_to_escaped_text(self):
        self.assertEqual(format_booking_date("<bad>"), "&lt;bad&gt;")

    def test_claude_context_contains_known_booking_dates_and_times(self):
        context = build_booking_claude_context(
            "d58bc7c2",
            {
                "car": {"name": "Honda HR-V"},
                "dates": {
                    "start": "2026-08-16T10:00:00+07:00",
                    "end": "2026-08-28T18:00:00+07:00",
                    "days": 13,
                    "pickupTime": "10:00",
                    "returnTime": "18:00",
                },
                "locations": {
                    "pickupLocation": "airport",
                    "returnLocation": "hotel",
                },
            },
        )
        self.assertIn("Получение: 16.08.2026 в 10:00", context)
        self.assertIn("Возврат: 28.08.2026 в 18:00", context)
        self.assertIn("Срок: 13 дн.", context)
        self.assertIn("Не спрашивай повторно модель, даты, время", context)

    def test_claude_context_does_not_invent_missing_legacy_times(self):
        context = build_booking_claude_context(
            "legacy",
            {
                "car": {"name": "Honda HR-V"},
                "dates": {
                    "start": "2026-08-15T21:00:00.000Z",
                    "end": "2026-08-28T21:00:00.000Z",
                    "days": 14,
                },
                "locations": {"pickupLocation": "hotel"},
            },
        )
        self.assertIn("Получение: 16.08.2026, время не указано", context)
        self.assertIn("Возврат: 29.08.2026, время не указано", context)

    def test_select_active_booking_uses_newest_pending_or_confirmed(self):
        bookings = [
            {
                "booking_id": "old",
                "user_id": "42",
                "status": "pre_booking",
                "created_at": "2026-08-08T10:00:00",
            },
            {
                "booking_id": "rejected",
                "user_id": "42",
                "status": "rejected",
                "created_at": "2026-08-10T10:00:00",
            },
            {
                "booking_id": "new",
                "user_id": 42,
                "status": "pre_booking",
                "created_at": "2026-08-09T10:00:00",
            },
        ]
        self.assertEqual(select_active_booking(bookings, 42)["booking_id"], "new")

    def test_existing_pending_booking_message_has_no_catalogue_cta(self):
        message = build_existing_booking_message(
            {
                "booking_id": "d58bc7c2",
                "status": "pre_booking",
                "form_data": {
                    "car": {"name": "Toyota Vios 2022 Белый"},
                    "dates": {
                        "start": "2026-08-15T21:00:00.000Z",
                        "end": "2026-08-27T21:00:00.000Z",
                    },
                },
            }
        )
        self.assertIn("повторно выбирать автомобиль не нужно", message)
        self.assertNotIn("Показать доступные варианты", message)


if __name__ == "__main__":
    unittest.main()
