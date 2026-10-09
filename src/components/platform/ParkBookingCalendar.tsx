import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { changeParkBookingStatus, fetchParkCalendar, ParkBooking } from '@/api/park-telegram';

const statuses: Record<string, string> = { requested: 'Ожидает подтверждения', confirmed: 'Подтверждено', cancelled: 'Отменено', in_progress: 'В аренде', completed: 'Завершено' };

export function ParkBookingCalendar({ tenantId, admin = false }: { tenantId: string; admin?: boolean }) {
  const id = useId();
  const [bookings, setBookings] = useState<ParkBooking[]>([]);
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetchParkCalendar(tenantId, admin, controller.signal).then((items) => { if (!controller.signal.aborted) setBookings(items); })
      .catch((failure) => { if (!controller.signal.aborted) { setBookings([]); setError(failure instanceof Error ? failure.message : 'Не удалось загрузить календарь.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tenantId, admin, reload]);
  const action = async (booking: ParkBooking, status: 'confirmed' | 'cancelled') => {
    if (status === 'cancelled' && !window.confirm(`Отменить заявку на ${booking.pricing.asset_name}? Период освободится для других клиентов.`)) return;
    setBusy(true); setError('');
    try { await changeParkBookingStatus(tenantId, booking, status, admin); setReload((value) => value + 1); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Не удалось изменить статус.'); }
    finally { setBusy(false); }
  };
  const visible = bookings.filter((booking) => !month || (booking.pricing.start_date <= `${month}-31` && booking.pricing.end_date > `${month}-01`))
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  return <section aria-labelledby={`${id}-title`} aria-busy={loading || busy} className="mt-7 border-t border-slate-200 pt-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id={`${id}-title`} className="text-xl font-semibold">Календарь заявок парка</h2><Button variant="outline" disabled={loading || busy} onClick={() => setReload((value) => value + 1)}>Обновить календарь</Button></div>
    <p className="mt-2 text-sm text-slate-600">Календарный список по датам. Заявки и подтверждённые брони занимают период до отмены; автоматическое подтверждение и сообщения клиентам не включены.</p>
    <label htmlFor={`${id}-month`} className="mt-4 block text-sm font-medium">Месяц (пустое поле — все даты)</label><Input id={`${id}-month`} type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="mt-2 max-w-xs text-base" />
    {error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
    {loading ? <p role="status" className="mt-4">Загружаем заявки…</p> : !error && !visible.length ? <p role="status" className="mt-4 text-sm text-slate-600">На выбранные даты заявок нет.</p> : <ul className="mt-4 divide-y divide-slate-200">{visible.map((booking) => <li key={booking.id} className="py-4">
      <h3 className="break-words font-semibold">{booking.pricing.asset_name || booking.asset_id}</h3><p className="mt-1">{booking.pricing.start_date} — {booking.pricing.end_date} · {statuses[booking.status] || booking.status}</p><p className="mt-1 text-sm">Аренда: {booking.pricing.total_rental} {booking.currency} · депозит: {booking.deposit.amount} {booking.currency}</p><p className="mt-1 break-all text-xs text-slate-600">Номер: {booking.id}</p>
      {['requested', 'confirmed'].includes(booking.status) && <div className="mt-3 flex flex-wrap gap-3">{booking.status === 'requested' && <Button variant="outline" disabled={busy || loading} onClick={() => void action(booking, 'confirmed')}>Подтвердить заявку</Button>}<Button variant="outline" disabled={busy || loading} onClick={() => void action(booking, 'cancelled')}>Отменить заявку</Button></div>}
    </li>)}</ul>}
  </section>;
}
