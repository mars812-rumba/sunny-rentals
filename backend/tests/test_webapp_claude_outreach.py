import unittest

from webapp_claude_outreach import WebAppClaudeOutreachScheduler


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


class WebAppClaudeOutreachSchedulerTests(unittest.TestCase):
    def make_scheduler(self, status=None, start_result=True):
        timers = []
        started_users = []

        def timer_factory(delay, callback):
            timer = FakeTimer(delay, callback)
            timers.append(timer)
            return timer

        scheduler = WebAppClaudeOutreachScheduler(
            delay_seconds=900,
            status_loader=lambda _user_id: status,
            dialog_starter=lambda user_id: started_users.append(user_id) or start_result,
            timer_factory=timer_factory,
            logger=lambda _message: None,
        )
        return scheduler, timers, started_users

    def test_starts_after_delay_for_silent_user(self):
        scheduler, timers, started = self.make_scheduler(
            {"claude_status": "stopped", "message_count": 0, "booking_submitted": False}
        )

        self.assertTrue(scheduler.schedule("123"))
        self.assertEqual(timers[0].delay, 900)
        self.assertTrue(timers[0].started)
        timers[0].fire()

        self.assertEqual(started, [123])
        self.assertNotIn(123, scheduler.pending_timers)

    def test_reopen_replaces_previous_timer(self):
        scheduler, timers, started = self.make_scheduler(
            {"claude_status": "stopped", "message_count": 0}
        )

        scheduler.schedule(123)
        scheduler.schedule(123)
        self.assertTrue(timers[0].cancelled)

        timers[0].fire()
        timers[1].fire()
        self.assertEqual(started, [123])

    def test_user_activity_cancels_timer(self):
        scheduler, timers, started = self.make_scheduler(
            {"claude_status": "stopped", "message_count": 0}
        )

        scheduler.schedule(123)
        self.assertTrue(scheduler.cancel(123, "message received"))
        timers[0].fire()

        self.assertEqual(started, [])

    def test_existing_dialog_or_booking_blocks_outreach(self):
        blocked_statuses = [
            {"claude_status": "active", "message_count": 0},
            {"claude_status": "paused", "message_count": 0},
            {"claude_status": "stopped", "message_count": 1},
            {"claude_status": "stopped", "message_count": 0, "booking_submitted": True},
            None,
        ]

        for status in blocked_statuses:
            with self.subTest(status=status):
                scheduler, timers, started = self.make_scheduler(status)
                scheduler.schedule(123)
                timers[0].fire()
                self.assertEqual(started, [])

    def test_web_session_id_is_not_scheduled(self):
        scheduler, timers, started = self.make_scheduler(
            {"claude_status": "stopped", "message_count": 0}
        )

        self.assertFalse(scheduler.schedule("web_session_abc"))
        self.assertEqual(timers, [])
        self.assertEqual(started, [])


if __name__ == "__main__":
    unittest.main()
