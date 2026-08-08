"""Delayed Claude outreach after a Telegram WebApp open event."""

from __future__ import annotations

import threading
from typing import Any, Callable, Dict, Optional


StatusLoader = Callable[[int], Optional[Dict[str, Any]]]
DialogStarter = Callable[[int], bool]
TimerFactory = Callable[[float, Callable[[], None]], Any]
Logger = Callable[[str], None]


class WebAppClaudeOutreachScheduler:
    """Keep one delayed, fail-closed Claude outreach per Telegram user."""

    def __init__(
        self,
        *,
        delay_seconds: int,
        status_loader: StatusLoader,
        dialog_starter: DialogStarter,
        timer_factory: TimerFactory = threading.Timer,
        logger: Logger = print,
    ) -> None:
        self.delay_seconds = max(1, int(delay_seconds))
        self.status_loader = status_loader
        self.dialog_starter = dialog_starter
        self.timer_factory = timer_factory
        self.logger = logger
        self.pending_timers: Dict[int, Any] = {}
        self._lock = threading.RLock()

    @staticmethod
    def normalize_user_id(user_id: Any) -> Optional[int]:
        if isinstance(user_id, bool):
            return None
        try:
            normalized = int(user_id)
        except (TypeError, ValueError):
            return None
        return normalized if normalized > 0 else None

    def schedule(self, user_id: Any) -> bool:
        normalized = self.normalize_user_id(user_id)
        if normalized is None:
            self.logger(f"Skipping Claude outreach for non-Telegram user {user_id!r}")
            return False

        timer = None

        def run_if_current() -> None:
            with self._lock:
                if self.pending_timers.get(normalized) is not timer:
                    return
                self.pending_timers.pop(normalized, None)

            try:
                status = self.status_loader(normalized)
            except Exception as error:
                self.logger(
                    f"Claude outreach skipped for {normalized}: status error: {error}"
                )
                return
            if not status:
                self.logger(f"Claude outreach skipped for {normalized}: status unavailable")
                return

            claude_status = str(status.get("claude_status") or "stopped").lower()
            try:
                message_count = int(status.get("message_count") or 0)
            except (TypeError, ValueError):
                self.logger(
                    f"Claude outreach skipped for {normalized}: invalid message count"
                )
                return
            booking_submitted = bool(status.get("booking_submitted"))

            if claude_status not in {"idle", "stopped"}:
                self.logger(
                    f"Claude outreach skipped for {normalized}: status={claude_status}"
                )
                return
            if message_count > 0:
                self.logger(
                    f"Claude outreach skipped for {normalized}: dialog already has messages"
                )
                return
            if booking_submitted:
                self.logger(
                    f"Claude outreach skipped for {normalized}: booking already submitted"
                )
                return

            try:
                started = self.dialog_starter(normalized)
            except Exception as error:
                self.logger(
                    f"Claude outreach failed for {normalized}: start error: {error}"
                )
                return

            if started:
                self.logger(f"Claude outreach started for {normalized}")
            else:
                self.logger(f"Claude outreach failed to start for {normalized}")

        timer = self.timer_factory(self.delay_seconds, run_if_current)
        timer.daemon = True

        with self._lock:
            previous = self.pending_timers.pop(normalized, None)
            if previous is not None:
                previous.cancel()
            self.pending_timers[normalized] = timer

        timer.start()
        self.logger(
            f"Claude outreach scheduled for {normalized} in {self.delay_seconds} seconds"
        )
        return True

    def cancel(self, user_id: Any, reason: str = "user activity") -> bool:
        normalized = self.normalize_user_id(user_id)
        if normalized is None:
            return False
        with self._lock:
            timer = self.pending_timers.pop(normalized, None)
        if timer is None:
            return False
        timer.cancel()
        self.logger(f"Claude outreach cancelled for {normalized}: {reason}")
        return True
