"""Run with both system Python (v1) and backend/venv Python (v2)."""

import unittest

from pydantic import ValidationError
from platform_core.park_bookings import ParkBookingRequest, ParkOwnerStatusRequest


class PatternCompatibilityTests(unittest.TestCase):
    def test_booking_patterns_still_reject_invalid_values(self):
        valid = dict(
            tenant_id="example", init_data="signed-data", asset_id="a" * 32,
            start_date="2026-10-10", end_date="2026-10-11",
            request_id="request_123456789", quote_token="b" * 64,
        )
        ParkBookingRequest(**valid)
        for field, value in (
            ("asset_id", "not-an-id"), ("request_id", "short"),
            ("quote_token", "z" * 64),
        ):
            with self.subTest(field=field), self.assertRaises(ValidationError):
                ParkBookingRequest(**{**valid, field: value})

    def test_status_patterns_still_reject_invalid_values(self):
        valid = dict(
            tenant_id="example", init_data="signed-data", booking_id="a" * 64,
            status="confirmed", expected_status="requested",
        )
        ParkOwnerStatusRequest(**valid)
        for field, value in (
            ("booking_id", "invalid"), ("status", "arbitrary"),
            ("expected_status", "cancelled"),
        ):
            with self.subTest(field=field), self.assertRaises(ValidationError):
                ParkOwnerStatusRequest(**{**valid, field: value})
