import type { ParkBooking } from '@/api/park-telegram';

// Calendar-date intersection for display only; return events are included.
// Compare park-local ISO dates, not timestamps shifted to the visitor's timezone.
export function filterParkRequests(bookings: ParkBooking[], status: string, start = '', end = ''): ParkBooking[] {
  if (start && end && end < start) return [];
  // Cancelled requests form a separate historical archive. Never delete records
  // or change booking status just to keep the working list tidy.
  const archive = status === 'archive' || status === 'cancelled';
  return bookings.filter(item => item.entry_type !== 'block'
    && (archive ? item.status === 'cancelled' : item.status !== 'cancelled' && (status === 'all' || item.status === status))
    && (!start || item.pricing.end_date >= start)
    && (!end || item.pricing.start_date <= end))
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
}
