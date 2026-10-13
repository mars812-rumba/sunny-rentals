interface BookingEvent { booking_id: string }

/** One lane per booking for its entire visible interval (including return day).
 * Non-overlapping bookings may reuse a lane. Input/API ordering is irrelevant.
 * Multiple events for one booking on the same day reserve adjacent lanes.
 */
export function calendarBookingLanes<T extends BookingEvent>(eventsByDay: Map<string, T[]>, days: string[]) {
  const ranges = new Map<string, { id: string; start: string; end: string; width: number }>();
  for (const day of days) {
    const counts = new Map<string, number>();
    for (const event of eventsByDay.get(day) || []) counts.set(event.booking_id, (counts.get(event.booking_id) || 0) + 1);
    for (const [id, count] of counts) {
      const range = ranges.get(id);
      if (range) { range.start = day < range.start ? day : range.start; range.end = day > range.end ? day : range.end; range.width = Math.max(range.width, count); }
      else ranges.set(id, { id, start: day, end: day, width: count });
    }
  }
  const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  const laneEnds: string[] = [];
  const lanes = new Map<string, number>();
  for (const range of [...ranges.values()].sort((a, b) => compare(a.start, b.start) || compare(a.id, b.id))) {
    let lane = 0;
    while (Array.from({ length: range.width }, (_, offset) => laneEnds[lane + offset]).some(end => end && end >= range.start)) lane++;
    lanes.set(range.id, lane);
    for (let offset = 0; offset < range.width; offset++) laneEnds[lane + offset] = range.end;
  }
  return { lanes, laneCount: laneEnds.length };
}

export function calendarDaySlots<T extends BookingEvent>(events: T[], lanes: Map<string, number>, count: number) {
  const slots: (T | undefined)[] = Array.from({ length: count });
  const overflow: T[] = [];
  const offsets = new Map<string, number>();
  for (const event of events) {
    const offset = offsets.get(event.booking_id) || 0;
    offsets.set(event.booking_id, offset + 1);
    const lane = (lanes.get(event.booking_id) ?? count) + offset;
    if (lane < count) slots[lane] = event;
    else overflow.push(event);
  }
  return { slots, overflow };
}
