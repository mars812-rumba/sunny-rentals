import ast
import asyncio
import copy
import sys
import threading
from datetime import datetime
from typing import Optional
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from customer_bookings import (cancel_customer_booking, customer_bookings,
                              customer_crm_status, require_bot_token)


class CustomerBookingTests(unittest.TestCase):
    def setUp(self):
        self.bookings = [
            {"booking_id": "one", "user_id": "42", "status": "pre_booking", "created_at": "2026-10-01"},
            {"booking_id": "two", "user_id": 42, "status": "confirmed", "created_at": "2026-10-02"},
            {"booking_id": "other", "user_id": 99, "status": "pre_booking"},
        ]

    def test_multiple_bookings_and_identity(self):
        self.assertEqual([b["booking_id"] for b in customer_bookings(self.bookings, 42)], ["two", "one"])
        self.assertEqual(customer_crm_status(self.bookings, 42), "confirmed")

    def test_cancel_only_selected_pending_and_repeat_is_safe(self):
        original = copy.deepcopy(self.bookings)
        booking, outcome, changed = cancel_customer_booking(self.bookings, 42, "one", "now")
        self.assertEqual((outcome, changed), ("cancelled", True))
        self.assertEqual(booking["cancelled_by"], "42")
        self.assertEqual(self.bookings[1:], original[1:])
        self.assertEqual(cancel_customer_booking(self.bookings, 42, "one", "later")[1:], ("cancelled", False))
        self.assertEqual(booking["cancelled_at"], "now")
        self.assertEqual(customer_crm_status(self.bookings, 42), "confirmed")

    def test_confirmed_request_keeps_reservation_and_payment(self):
        self.bookings[1]["payment"] = {"advance": 1000}
        booking, outcome, changed = cancel_customer_booking(self.bookings, 42, "two", "now")
        self.assertEqual((outcome, changed), ("requested", True))
        self.assertEqual(booking["status"], "confirmed")
        self.assertEqual(booking["payment"], {"advance": 1000})
        self.assertEqual(cancel_customer_booking(self.bookings, 42, "two", "later")[1:], ("requested", False))

    def test_cannot_cancel_someone_elses_booking_or_closed_request(self):
        original = copy.deepcopy(self.bookings)
        for booking_id in ["other", "missing"]:
            with self.assertRaises(LookupError):
                cancel_customer_booking(self.bookings, 42, booking_id, "now")
        self.assertEqual(self.bookings, original)
        self.bookings[0]["status"] = "rejected"
        with self.assertRaises(ValueError):
            cancel_customer_booking(self.bookings, 42, "one", "now")

    def test_bot_auth_fails_closed(self):
        for received, configured in [(None, None), ("x", None), (None, "secret"), ("wrong", "secret")]:
            with self.assertRaises(PermissionError):
                require_bot_token(received, configured)
        require_bot_token("secret", "secret")

    def test_last_cancellation_does_not_archive_client(self):
        cancel_customer_booking(self.bookings, 42, "one", "now")
        self.bookings[1]["status"] = "cancelled"
        self.assertEqual(customer_crm_status(self.bookings, 42), "in_work")

    def test_start_is_not_gated_by_existing_booking(self):
        tree = ast.parse((Path(__file__).resolve().parents[1] / "telegram_bot.py").read_text())
        start = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "handle_start")
        calls = {n.func.id for n in ast.walk(start) if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)}
        self.assertNotIn("load_active_booking_for_user", calls)
        self.assertIn("InlineKeyboardButton", calls)

    def test_customer_endpoint_auth_ownership_and_durable_cancel(self):
        # Run the actual endpoint functions without importing the production app
        # (which initializes clients, logs and runtime data on import).
        class HttpError(Exception):
            def __init__(self, status_code, detail):
                self.status_code = status_code
        stored = copy.deepcopy(self.bookings)
        updates = []
        def save(_path, value):
            stored[:] = copy.deepcopy(value)
        names = {"authenticate_booking_bot", "list_customer_bookings", "customer_cancel_booking"}
        tree = ast.parse((Path(__file__).resolve().parents[1] / "web_integration.py").read_text())
        nodes = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in names]
        for node in nodes:
            node.decorator_list = []
        namespace = dict(require_bot_token=require_bot_token, WEBAPP_BOT_TOKEN="test-secret",
            HTTPException=HttpError, Optional=Optional, Header=lambda *a, **k: None,
            customer_bookings=customer_bookings, cancel_customer_booking=cancel_customer_booking,
            customer_crm_status=customer_crm_status, datetime=datetime, _lock=threading.Lock(),
            load_bookings=lambda: copy.deepcopy(stored), save_json=save, BOOKINGS_FILE="unused",
            update_all_user_records=lambda uid, fields: updates.append((uid, fields)),
            log_dialog_event=lambda *args: None)
        exec(compile(ast.Module(body=nodes, type_ignores=[]), "customer-endpoints", "exec"), namespace)
        cancel = namespace["customer_cancel_booking"]
        original = copy.deepcopy(stored)
        with self.assertRaises(HttpError) as error:
            cancel(42, "one", "wrong")
        self.assertEqual(error.exception.status_code, 401)
        with self.assertRaises(HttpError) as error:
            cancel(42, "other", "test-secret")
        self.assertEqual(error.exception.status_code, 404)
        self.assertEqual(stored, original)
        self.assertEqual(cancel(42, "one", "test-secret")["outcome"], "cancelled")
        self.assertEqual(stored[0]["status"], "cancelled")
        self.assertEqual(stored[1:], original[1:])
        self.assertEqual(updates[-1], (42, {"status": "confirmed"}))
        self.assertFalse(cancel(42, "one", "test-secret")["changed"])
        self.assertEqual(len(updates), 1)
        self.assertEqual(cancel(42, "two", "test-secret")["outcome"], "requested")
        self.assertEqual(stored[1]["status"], "confirmed")
        listed = namespace["list_customer_bookings"](42, "test-secret")["bookings"]
        self.assertEqual([b["booking_id"] for b in listed], ["two"])

    def test_manager_confirmation_cannot_revive_concurrently_cancelled_request(self):
        class HttpError(Exception):
            def __init__(self, status_code, detail):
                self.status_code = status_code
        initial = copy.deepcopy(self.bookings)
        cancelled = copy.deepcopy(initial)
        cancel_customer_booking(cancelled, 42, "one", "now")
        snapshots = iter([initial, cancelled])
        writes = []
        tree = ast.parse((Path(__file__).resolve().parents[1] / "web_integration.py").read_text())
        node = next(n for n in tree.body if isinstance(n, ast.AsyncFunctionDef) and n.name == "confirm_booking")
        node.decorator_list = []
        namespace = dict(HTTPException=HttpError, datetime=datetime, _lock=threading.Lock(),
            load_bookings=lambda: next(snapshots), save_json=lambda *args: writes.append(args),
            BOOKINGS_FILE="unused", print=lambda *args: None)
        exec(compile(ast.Module(body=[node], type_ignores=[]), "confirm-endpoint", "exec"), namespace)
        with self.assertRaises(HttpError) as error:
            asyncio.run(namespace["confirm_booking"]("one"))
        self.assertEqual(error.exception.status_code, 409)
        self.assertEqual(writes, [])
        self.assertEqual(cancelled[0]["status"], "cancelled")


if __name__ == "__main__":
    unittest.main()
