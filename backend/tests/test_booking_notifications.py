import unittest

from booking_notifications import (
    BookingFallbackScheduler,
    build_customer_booking_received,
    format_booking_date,
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
        self.assertIn("Бронь пока не подтверждена", message)

    def test_invalid_date_falls_back_to_escaped_text(self):
        self.assertEqual(format_booking_date("<bad>"), "&lt;bad&gt;")


if __name__ == "__main__":
    unittest.main()
