import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { addMonths, format, startOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarDays, ChartGantt, Check, ChevronLeft, ChevronRight, ClipboardList, Info, Plus, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { changeParkBookingStatus, fetchParkCalendar, ParkBooking } from '@/api/park-telegram';
import { listPlatformAssets, PlatformAsset } from '@/api/platform-admin';
import { fetchOwnerFleet } from '@/api/park-owner-fleet';
import { MonthCalendarView } from '@/components/admin/MonthCalendarView';
import { SchedulerCalendar } from '@/components/admin/SchedulerCalendar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { bookingsOnDay, calendarBooking, calendarCars, calendarLogistics, calendarThumbnail } from '@/utils/park-calendar';
import { ParkManualBookingForm } from './ParkManualBookingForm';
import { ParkCalendarPhoto } from './ParkCalendarPhoto';
import { ParkRequestItem } from './ParkRequestsPanel';
import { subscribeParkCalendar } from '@/lib/park-calendar-updates';
import { parkToday } from '@/lib/park-rental';
import { timetableFocusDay } from '@/lib/scheduler-scroll';

const statuses: Record<string, string> = { requested: 'Ожидает подтверждения', confirmed: 'Подтверждено', cancelled: 'Отменено', in_progress: 'В аренде', completed: 'Завершено' };

export function ParkBookingCalendar({ tenantId, admin = false, fleetRevision = 0, timezone = 'Asia/Bangkok' }: { tenantId: string; admin?: boolean; fleetRevision?: number; timezone?: string }) {
  const id = useId();
  const [bookings, setBookings] = useState<ParkBooking[]>([]);
  const [assets, setAssets] = useState<PlatformAsset[]>([]);
  const today = parkToday(timezone);
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [assetId, setAssetId] = useState('');
  const [view, setView] = useState('timetable');
  const [scrollResetKey, setScrollResetKey] = useState(0);
  const [selection, setSelection] = useState<{ bookingId?: string; day?: string } | null>(null);
  const [draft, setDraft] = useState<{ day?: string; assetId?: string } | null>(null);
  const [success, setSuccess] = useState('');
  const [cancelTarget, setCancelTarget] = useState<ParkBooking | null>(null);
  const createButton = useRef<HTMLButtonElement>(null);
  const wasDraft = useRef(false);
  useEffect(() => { if (wasDraft.current && !draft) createButton.current?.focus(); wasDraft.current = !!draft; }, [draft]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => subscribeParkCalendar(tenantId, () => setReload(value => value + 1)), [tenantId]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setSelection(null);
    Promise.all([fetchParkCalendar(tenantId, admin, controller.signal), admin ? listPlatformAssets(tenantId) : fetchOwnerFleet(tenantId, controller.signal).then(result => result.assets)])
      .then(([items, fleet]) => { if (!controller.signal.aborted) { setBookings(items); setAssets(fleet); } })
      .catch((failure) => { if (!controller.signal.aborted) { setBookings([]); setError(failure instanceof Error ? failure.message : 'Не удалось загрузить календарь.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tenantId, admin, reload, fleetRevision]);
  const action = async (booking: ParkBooking, status: 'confirmed' | 'cancelled') => {
    setBusy(true); setError('');
    try { await changeParkBookingStatus(tenantId, booking, status, admin); setReload((value) => value + 1); return true; }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Не удалось изменить статус.'); return false; }
    finally { setBusy(false); }
  };
  const cars = useMemo(() => calendarCars(assets, bookings), [assets, bookings]);
  const photos = useMemo(() => new Map(assets.map(asset => [asset.id, calendarThumbnail(asset)])), [assets]);
  const filtered = useMemo(() => bookings.filter(item => !assetId || item.asset_id === assetId), [bookings, assetId]);
  const active = useMemo(() => filtered.filter(item => item.status !== 'cancelled'), [filtered]);
  const date = useMemo(() => startOfMonth(new Date(`${month}-01T00:00:00`)), [month]);
  const focusDay = timetableFocusDay(month, today);
  const initialScrollDate = useMemo(() => new Date(`${focusDay}T00:00:00`), [focusDay]);
  const selected = selection?.bookingId ? filtered.filter(item => item.id === selection.bookingId) : selection?.day ? bookingsOnDay(filtered, selection.day) : [];
  const details = (items: ParkBooking[]) => <ul className="mt-2 divide-y divide-slate-200">{items.map((booking) => booking.entry_type !== 'block' ? <ParkRequestItem key={booking.id} booking={booking} detailed busy={busy || loading || !!draft} onAction={(item, status) => { if (status === 'cancelled') setCancelTarget(item); else void action(item, status); }} /> : <li key={booking.id} className="py-4">
    <h3 className="break-words font-semibold">{booking.pricing.asset_name || booking.asset_id}</h3><p className="mt-1">{booking.pricing.start_date} — {booking.pricing.end_date} · {statuses[booking.status] || booking.status}</p>
    <p className="mt-1 text-sm font-medium">{booking.entry_type === 'block' ? 'Блокировка занятости' : booking.source?.endsWith('_manual') ? 'Ручная аренда' : 'Заявка из Telegram'}</p>
    {booking.entry_type !== 'block' && <p className="mt-1 text-sm">Аренда: {booking.pricing.total_rental} {booking.currency} · депозит: {booking.deposit.amount} {booking.currency}</p>}
    {booking.operator_details?.customer_name && <p className="mt-2 break-words text-sm">Клиент: {booking.operator_details.customer_name}</p>}
    {booking.operator_details?.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{booking.operator_details.note}</p>}
    <p className="mt-1 break-all text-xs text-slate-600">Номер: {booking.booking_number || booking.id}</p>
    {['requested', 'confirmed'].includes(booking.status) && <div className="mt-3 flex flex-wrap gap-3">{booking.status === 'requested' && <Button variant="outline" disabled={busy || loading || !!draft} onClick={() => void action(booking, 'confirmed')}><Check aria-hidden="true" />Подтвердить заявку</Button>}<Button variant="outline" disabled={busy || loading || !!draft} onClick={() => setCancelTarget(booking)}><X aria-hidden="true" />{booking.entry_type === 'block' ? 'Снять блокировку' : 'Отменить бронь'}</Button></div>}
  </li>)}</ul>;
  return <section aria-labelledby={`${id}-title`} aria-busy={loading || busy} className="min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id={`${id}-title`} className="flex items-center gap-2 text-xl font-semibold"><CalendarDays aria-hidden="true" className="h-5 w-5 text-blue-700" />Календарь заявок парка</h2><div className="flex flex-wrap gap-2"><Button className="gap-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800" ref={createButton} disabled={loading || busy || !!draft || !assets.length || !!error} onClick={() => { setSuccess(''); setDraft({ assetId }); }}><Plus aria-hidden="true" />Добавить бронь / блокировку</Button><Button variant="outline" className="gap-2 rounded-lg bg-white" disabled={loading || busy || !!draft} onClick={() => setReload((value) => value + 1)}><RefreshCw aria-hidden="true" />Обновить</Button></div></div>
    <p className="mt-2 text-sm text-slate-600">Заявки из бота и витрины — в одном календаре. Ожидающие заявки также занимают период. День возврата свободен для следующей аренды.</p>
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <div><label htmlFor={`${id}-month`} className="block text-sm font-medium">Месяц</label><Input id={`${id}-month`} type="month" value={month} onChange={(event) => { if (/^\d{4}-\d{2}$/.test(event.target.value)) setMonth(event.target.value); }} className="mt-2 max-w-xs text-base" /></div>
      <Button variant="outline" className="h-11 w-11 p-0" aria-label="Предыдущий месяц" onClick={() => setMonth(format(addMonths(date, -1), 'yyyy-MM'))}><ChevronLeft aria-hidden="true" /></Button>
      <Button variant="outline" className="h-11 w-11 p-0" aria-label="Следующий месяц" onClick={() => setMonth(format(addMonths(date, 1), 'yyyy-MM'))}><ChevronRight aria-hidden="true" /></Button>
      <Button variant="outline" className="h-11 gap-2" onClick={() => { setMonth(today.slice(0, 7)); setScrollResetKey(value => value + 1); }}><CalendarDays aria-hidden="true" className="h-4 w-4" />Сегодня</Button>
      <div className="min-w-0 max-w-full"><label htmlFor={`${id}-asset`} className="block text-sm font-medium">Техника</label><select id={`${id}-asset`} className="mt-2 h-11 max-w-full rounded-md border border-slate-300 bg-white px-3 text-base" value={assetId} onChange={event => setAssetId(event.target.value)}><option value="">Весь парк</option>{cars.map(car => <option key={car.id} value={car.id}>{car.name}</option>)}</select></div>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
    {!loading && !assets.length && !error && <p className="mt-3 text-sm text-slate-600">Чтобы создать запись, сначала добавьте машину в автопарк.</p>}
    {success && <p role="status" className="mt-3 text-sm text-emerald-800">{success}</p>}
    {draft && <ParkManualBookingForm tenantId={tenantId} assets={assets} admin={admin} initialDay={draft.day} initialAssetId={draft.assetId} onClose={() => setDraft(null)} onSaved={booking => {
      setBookings(items => [...items.filter(item => item.id !== booking.id), booking]); setMonth(booking.pricing.start_date.slice(0, 7)); setAssetId(booking.asset_id); setDraft(null);
      setSuccess(booking.entry_type === 'block' ? 'Даты закрыты. Блокировка видна во всех видах календаря.' : booking.status === 'requested' ? 'Предбронь создана. Даты заняты до подтверждения или отмены.' : 'Подтверждённая бронь создана и видна во всех видах календаря.');
    }} />}
    {loading ? <p role="status" className="mt-4">Загружаем заявки…</p> : !error && <Tabs value={view} onValueChange={setView} className="mt-5">
      <ParkCalendarViewButtons />
      <TabsContent value="timetable" className="mt-5 min-w-0">
        <section aria-labelledby={`${id}-gantt-title`} className="min-w-0">
          <h3 id={`${id}-gantt-title`} className="flex items-center gap-2 text-lg font-semibold"><ChartGantt aria-hidden="true" className="h-5 w-5 text-blue-700" />Таймтейбл</h3><p className="mb-4 mt-2 text-sm leading-6 text-slate-600">Занятость по автомобилям: прокрутите даты вправо, нажмите полосу для деталей. Месяц и фильтр техники общие для обоих видов.</p>
          <SchedulerCalendar cars={cars.filter(car => !assetId || car.id === assetId)} bookings={active.map(calendarBooking)} startDate={date} initialScrollDate={initialScrollDate} scrollResetKey={scrollResetKey} daysToShow={97} onDateChange={() => {}} onBookingClick={booking => setSelection({ bookingId: booking.booking_id })} onCreateBooking={() => {}} readOnly exclusiveEnd renderCarPhoto={car => <ParkCalendarPhoto key={`${tenantId}:${car.id}:${photos.get(car.id) || ''}`} tenantId={tenantId} reference={photos.get(car.id)} admin={admin} />} />
        </section>
      </TabsContent>
      <TabsContent value="deliveries" className="mt-5 min-w-0">
        <h3 className="mb-2 text-lg font-semibold">Календарь доставок</h3>
        <p className="mb-3 text-sm leading-6 text-slate-600">{format(date, 'LLLL yyyy', { locale: ru })} · Нажмите день или заявку.</p>
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-700">{[['bg-green-500', 'Выдача'], ['bg-yellow-400', 'Возврат'], ['bg-slate-400', 'Ожидает подтверждения'], ['bg-purple-500', 'Блокировка']].map(([color, label]) => <span key={label} className="inline-flex items-center gap-2"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>)}</div>
        <MonthCalendarView currentDate={date} bookings={active.map(calendarBooking)} logisticsData={active.map(calendarLogistics)} onDateChange={value => setMonth(format(value, 'yyyy-MM'))} onBookingClick={booking => setSelection({ bookingId: booking.booking_id })} onDayClick={value => setSelection({ day: format(value, 'yyyy-MM-dd') })} showOccupancy hideConfirmedOccupancy />
      </TabsContent>
    </Tabs>}
<Dialog open={!!selection} onOpenChange={open => { if (!open) setSelection(null); }}><DialogContent closeLabel="Закрыть заявку" closeButtonClassName="right-2 top-2 flex size-11 items-center justify-center" onCloseAutoFocus={event => { if (draft) event.preventDefault(); }} className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-white text-slate-900 sm:max-w-xl"><DialogHeader className="pr-6 text-left"><DialogTitle className="flex items-center gap-2 text-balance"><ClipboardList aria-hidden="true" className="size-5 shrink-0 text-blue-700" />{selection?.day ? `События ${selection.day}` : 'Заявка парка'}</DialogTitle><DialogDescription className="flex items-start gap-2 pt-2 text-pretty leading-6 text-slate-600"><Info aria-hidden="true" className="mt-1 size-4 shrink-0" />Даты указаны по часовому поясу парка. Автоматические сообщения клиентам пока не отправляются.</DialogDescription></DialogHeader>{selected.length ? details(selected) : <p>На этот день событий нет.</p>}{selection?.day && <Button disabled={!!draft || loading || busy || !assets.length} onClick={() => { setDraft({ day: selection.day, assetId }); setSelection(null); setSuccess(''); }}><Plus aria-hidden="true" />Добавить запись на этот день</Button>}{error && <p role="alert" className="text-sm text-rose-800">{error}</p>}</DialogContent></Dialog>
    <AlertDialog open={!!cancelTarget} onOpenChange={open => { if (!open && !busy) setCancelTarget(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{cancelTarget?.entry_type === 'block' ? 'Снять блокировку?' : 'Отменить заявку?'}</AlertDialogTitle><AlertDialogDescription>Период на {cancelTarget?.pricing.asset_name} освободится для других клиентов. Автоматическое сообщение клиенту не отправляется.</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="text-sm text-rose-800">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Оставить без изменений</AlertDialogCancel><AlertDialogAction disabled={busy} className="bg-red-700 text-white hover:bg-red-800" onClick={event => { event.preventDefault(); if (cancelTarget) void action(cancelTarget, 'cancelled').then(ok => { if (ok) setCancelTarget(null); }); }}>{busy ? 'Отменяем…' : 'Подтвердить отмену'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}

export function ParkCalendarViewButtons() {
  const triggerClass = 'min-h-11 whitespace-normal gap-2 rounded-lg px-3 text-sm data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:shadow-none';
  return <TabsList aria-label="Вид календаря" className="grid h-auto w-full max-w-md grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1"><TabsTrigger value="timetable" className={triggerClass}><ChartGantt aria-hidden="true" className="size-4 shrink-0" />Таймтейбл</TabsTrigger><TabsTrigger value="deliveries" className={triggerClass}><CalendarDays aria-hidden="true" className="size-4 shrink-0" />Календарь доставок</TabsTrigger></TabsList>;
}
