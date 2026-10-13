import type { ParkBooking } from '@/api/park-telegram';

// Calendar-date intersection for display only; return events are included.
// Compare park-local ISO dates, not timestamps shifted to the visitor's timezone.
export function filterParkRequests(bookings: ParkBooking[], status: string, start = '', end = ''): ParkBooking[] {
  if (start && end && end < start) return [];
  return bookings.filter(item => item.entry_type !== 'block'
    && (status === 'all' || item.status === status)
    && (!start || item.pricing.end_date >= start)
    && (!end || item.pricing.start_date <= end))
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
}
