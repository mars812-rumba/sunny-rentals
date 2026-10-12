import { useEffect, useState } from 'react';
import { fetchParkCalendar, type ParkBooking } from '@/api/park-telegram';
import { subscribeParkCalendar } from '@/lib/park-calendar-updates';

export function useFleetAvailability(tenantId: string, admin: boolean, start: string, end: string, enabled: boolean, revision: number) {
  const [updates, setUpdates] = useState(0);
  const [result, setResult] = useState<{ key: string; bookings: ParkBooking[]; error: string }>({ key: '', bookings: [], error: '' });
  const key = JSON.stringify([tenantId, admin, start, end, revision, updates]);
  useEffect(() => subscribeParkCalendar(tenantId, () => setUpdates(value => value + 1)), [tenantId]);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetchParkCalendar(tenantId, admin, controller.signal)
      .then(bookings => { if (!controller.signal.aborted) setResult({ key, bookings, error: '' }); })
      .catch(failure => { if (!controller.signal.aborted) setResult({ key, bookings: [], error: failure instanceof Error ? failure.message : 'Не удалось проверить занятость.' }); });
    return () => controller.abort();
  }, [tenantId, admin, key, enabled]);
  return { loading: enabled && result.key !== key, bookings: result.key === key ? result.bookings : [], error: result.key === key ? result.error : '', retry: () => setUpdates(value => value + 1) };
}
