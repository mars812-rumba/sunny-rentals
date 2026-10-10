import { useEffect, useId, useMemo, useState } from 'react';
import { addMonths, format, startOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { changeParkBookingStatus, fetchParkCalendar, ParkBooking } from '@/api/park-telegram';
import { listPlatformAssets, PlatformAsset } from '@/api/platform-admin';
import { fetchOwnerFleet } from '@/api/park-owner-fleet';
import { MonthCalendarView } from '@/components/admin/MonthCalendarView';
import { SchedulerCalendar } from '@/components/admin/SchedulerCalendar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { bookingsOnDay, calendarBooking, calendarCars, calendarLogistics } from '@/utils/park-calendar';

const statuses: Record<string, string> = { requested: 'Ожидает подтверждения', confirmed: 'Подтверждено', cancelled: 'Отменено', in_progress: 'В аренде', completed: 'Завершено' };

export function ParkBookingCalendar({ tenantId, admin = false }: { tenantId: string; admin?: boolean }) {
  const id = useId();
  const [bookings, setBookings] = useState<ParkBooking[]>([]);
  const [assets, setAssets] = useState<PlatformAsset[]>([]);
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [assetId, setAssetId] = useState('');
  const [view, setView] = useState('month');
  const [selection, setSelection] = useState<{ bookingId?: string; day?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setSelection(null);
    Promise.all([fetchParkCalendar(tenantId, admin, controller.signal), admin ? listPlatformAssets(tenantId) : fetchOwnerFleet(tenantId, controller.signal).then(result => result.assets)])
      .then(([items, fleet]) => { if (!controller.signal.aborted) { setBookings(items); setAssets(fleet); } })
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
  const cars = useMemo(() => calendarCars(assets, bookings), [assets, bookings]);
  const filtered = useMemo(() => bookings.filter(item => !assetId || item.asset_id === assetId), [bookings, assetId]);
  const active = useMemo(() => filtered.filter(item => item.status !== 'cancelled'), [filtered]);
  const date = useMemo(() => startOfMonth(new Date(`${month}-01T00:00:00`)), [month]);
  const nextMonth = format(addMonths(date, 1), 'yyyy-MM-dd');
  const visible = filtered.filter((booking) => booking.pricing.start_date < nextMonth && booking.pricing.end_date >= `${month}-01`)
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  const selected = selection?.bookingId ? filtered.filter(item => item.id === selection.bookingId) : selection?.day ? bookingsOnDay(filtered, selection.day) : [];
  const details = (items: ParkBooking[]) => <ul className="mt-4 divide-y divide-slate-200">{items.map((booking) => <li key={booking.id} className="py-4">
    <h3 className="break-words font-semibold">{booking.pricing.asset_name || booking.asset_id}</h3><p className="mt-1">{booking.pricing.start_date} — {booking.pricing.end_date} · {statuses[booking.status] || booking.status}</p><p className="mt-1 text-sm">Аренда: {booking.pricing.total_rental} {booking.currency} · депозит: {booking.deposit.amount} {booking.currency}</p><p className="mt-1 break-all text-xs text-slate-600">Номер: {booking.id}</p>
    {['requested', 'confirmed'].includes(booking.status) && <div className="mt-3 flex flex-wrap gap-3">{booking.status === 'requested' && <Button variant="outline" disabled={busy || loading} onClick={() => void action(booking, 'confirmed')}>Подтвердить заявку</Button>}<Button variant="outline" disabled={busy || loading} onClick={() => void action(booking, 'cancelled')}>Отменить заявку</Button></div>}
  </li>)}</ul>;
  return <section aria-labelledby={`${id}-title`} aria-busy={loading || busy} className="mt-7 border-t border-slate-200 pt-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id={`${id}-title`} className="text-xl font-semibold">Календарь заявок парка</h2><Button variant="outline" disabled={loading || busy} onClick={() => setReload((value) => value + 1)}>Обновить календарь</Button></div>
    <p className="mt-2 text-sm text-slate-600">Заявки из бота и витрины — в одном календаре. Ожидающие заявки также занимают период. День возврата свободен для следующей аренды.</p>
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <div><label htmlFor={`${id}-month`} className="block text-sm font-medium">Месяц</label><Input id={`${id}-month`} type="month" value={month} onChange={(event) => { if (/^\d{4}-\d{2}$/.test(event.target.value)) setMonth(event.target.value); }} className="mt-2 max-w-xs text-base" /></div>
      <Button variant="outline" className="h-11 w-11 p-0" aria-label="Предыдущий месяц" onClick={() => setMonth(format(addMonths(date, -1), 'yyyy-MM'))}><ChevronLeft aria-hidden="true" /></Button>
      <Button variant="outline" className="h-11 w-11 p-0" aria-label="Следующий месяц" onClick={() => setMonth(format(addMonths(date, 1), 'yyyy-MM'))}><ChevronRight aria-hidden="true" /></Button>
      <Button variant="outline" className="h-11" onClick={() => setMonth(format(new Date(), 'yyyy-MM'))}>Сегодня</Button>
      <div className="min-w-0 max-w-full"><label htmlFor={`${id}-asset`} className="block text-sm font-medium">Техника</label><select id={`${id}-asset`} className="mt-2 h-11 max-w-full rounded-md border border-slate-300 bg-white px-3 text-base" value={assetId} onChange={event => setAssetId(event.target.value)}><option value="">Весь парк</option>{cars.map(car => <option key={car.id} value={car.id}>{car.name}</option>)}</select></div>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
    {loading ? <p role="status" className="mt-4">Загружаем заявки…</p> : !error && <Tabs value={view} onValueChange={setView} className="mt-5">
      <TabsList aria-label="Вид календаря"><TabsTrigger value="list">Список</TabsTrigger><TabsTrigger value="month">Месяц</TabsTrigger><TabsTrigger value="gantt">Гант</TabsTrigger></TabsList>
      <TabsContent value="list">{visible.length ? details(visible) : <p role="status" className="py-5">На выбранный месяц заявок нет.</p>}</TabsContent>
      <TabsContent value="month"><p className="my-3 text-sm text-slate-600">{format(date, 'LLLL yyyy', { locale: ru })} · зелёный — выдача, жёлтый — возврат, синий — занято, серый — ожидает подтверждения. Нажмите день или заявку.</p><MonthCalendarView currentDate={date} bookings={active.map(calendarBooking)} logisticsData={active.map(calendarLogistics)} onDateChange={value => setMonth(format(value, 'yyyy-MM'))} onBookingClick={booking => setSelection({ bookingId: booking.booking_id })} onDayClick={value => setSelection({ day: format(value, 'yyyy-MM-dd') })} showOccupancy /></TabsContent>
      <TabsContent value="gantt"><p className="my-3 text-sm text-slate-600">Полоса показывает занятость машины. Прокрутите даты вправо; нажмите полосу для деталей. Создание брони выделением пока не включено.</p><SchedulerCalendar cars={cars.filter(car => !assetId || car.id === assetId)} bookings={active.map(calendarBooking)} startDate={date} daysToShow={97} onDateChange={() => {}} onBookingClick={booking => setSelection({ bookingId: booking.booking_id })} onCreateBooking={() => {}} readOnly exclusiveEnd /></TabsContent>
    </Tabs>}
    <Dialog open={!!selection} onOpenChange={open => { if (!open) setSelection(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{selection?.day ? `События ${selection.day}` : 'Заявка парка'}</DialogTitle><DialogDescription>Время и даты относятся к часовому поясу парка. Сообщения клиентам пока не отправляются автоматически.</DialogDescription></DialogHeader>{selected.length ? details(selected) : <p>На этот день событий нет.</p>}{error && <p role="alert" className="text-sm text-rose-800">{error}</p>}</DialogContent></Dialog>
  </section>;
}
