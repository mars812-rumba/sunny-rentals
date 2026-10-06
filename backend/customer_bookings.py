"""Per-booking customer actions; never cancel other bookings or refund money."""

import hmac

ACTIVE_STATUSES = frozenset({"new", "pre_booking", "confirmed"})


def require_bot_token(received, configured):
    if not configured or not received or not hmac.compare_digest(str(received), str(configured)):
        raise PermissionError("Bot authentication required")


def customer_bookings(bookings, user_id):
    return sorted(
        [b for b in bookings if str(b.get("user_id")) == str(user_id)
         and b.get("status") in ACTIVE_STATUSES],
        key=lambda b: str(b.get("created_at") or ""), reverse=True,
    )


def cancel_customer_booking(bookings, user_id, booking_id, now):
    booking = next((b for b in bookings if str(b.get("booking_id")) == str(booking_id)), None)
    if booking is None or str(booking.get("user_id")) != str(user_id):
        raise LookupError("Booking not found")
    if booking.get("status") == "cancelled":
        return booking, "cancelled", False
    if booking.get("status") == "confirmed":
        if booking.get("cancellation_requested_at"):
            return booking, "requested", False
        booking["cancellation_requested_at"] = now
        booking["cancellation_requested_by"] = str(user_id)
        booking["updated_at"] = now
        return booking, "requested", True
    if booking.get("status") not in {"new", "pre_booking"}:
        raise ValueError("Booking is already closed")
    booking.update(status="cancelled", cancelled_at=now, updated_at=now,
                   cancelled_by=str(user_id), cancellation_reason="customer")
    return booking, "cancelled", True


def customer_crm_status(bookings, user_id):
    active = customer_bookings(bookings, user_id)
    if any(b.get("status") == "confirmed" for b in active):
        return "confirmed"
    return "pre_booking" if active else "in_work"
