import { parkText } from '@/lib/park-locale';
import { parkText as pt } from '@/lib/park-locale';
import { useParkLocale } from '@/contexts/park-locale';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Ref } from 'react';
import { addMonths, format, startOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarDays, ChartGantt, Check, ClipboardList, Plus, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { changeParkBookingStatus, fetchParkCalendar, ParkBooking } from '@/api/park-telegram';
import { listPlatformAssets, PlatformAsset } from '@/api/platform-admin';
import { fetchOwnerFleet } from '@/api/park-owner-fleet';
import { MonthCalendarView } from '@/components/admin/MonthCalendarView';
import { SchedulerCalendar } from '@/components/admin/SchedulerCalendar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ParkFormSheet as Dialog, ParkFormSheetContent as DialogContent } from './ParkFormSheet';

export function ParkCalendarActions({ createRef, createDisabled, refreshDisabled, onCreate, onRefresh }: { createRef?: Ref<HTMLButtonElement>; createDisabled: boolean; refreshDisabled: boolean; onCreate: () => void; onRefresh: () => void }) {
  const { pt } = useParkLocale();
  return <div className="flex w-full items-center gap-2">
    <Button ref={createRef} type="button" variant="outline" className="min-h-11 min-w-0 flex-1 gap-2 rounded-lg sm:flex-none" disabled={createDisabled} onClick={onCreate}><Plus aria-hidden="true" className="size-4 shrink-0" />{pt('Создать бронь')}</Button>
    <Button type="button" variant="outline" className="size-11 shrink-0 rounded-lg bg-white p-0" aria-label={pt('Обновить календарь')} title={pt('Обновить календарь')} disabled={refreshDisabled} onClick={onRefresh}><RefreshCw aria-hidden="true" className="size-4" /></Button>
  </div>;
}
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { bookingsOnDay, calendarBooking, calendarBookingWithAsset, calendarCars, calendarLogistics, calendarThumbnail } from '@/utils/park-calendar';
import { ParkManualBookingForm } from './ParkManualBookingForm';
import { ParkCalendarPhoto } from './ParkCalendarPhoto';
import { ParkRequestItem } from './ParkRequestsPanel';
import { subscribeParkCalendar } from '@/lib/park-calendar-updates';
import { parkToday, dateLabel } from '@/lib/park-rental';
import { timetableFocusDay } from '@/lib/scheduler-scroll';
import { parkBookingColors } from '@/lib/park-booking-colors';

const statuses: Record<string, string> = { requested: 'Ожидает подтверждения', confirmed: 'Подтверждено', cancelled: 'Отменено', in_progress: 'В аренде', completed: 'Завершено' };

export function ParkCalendarMonthSelect({ id, month, onChange }: { id: string; month: string; onChange: (month: string) => void }) {
  const { dateLocale } = useParkLocale();
  const date = new Date(`${month}-01T00:00:00`);
  return <select id={id} value={month} onChange={event => onChange(event.target.value)} className="mt-2 h-11 w-full min-w-0 max-w-full rounded-md border border-slate-300 bg-white px-2 text-base">
    {Array.from({ length: 25 }, (_, index) => addMonths(date, index - 12)).map(value => <option key={format(value, 'yyyy-MM')} value={format(value, 'yyyy-MM')}>{format(value, 'LLLL yyyy', { locale: dateLocale })}</option>)}
  </select>;
}

export function ParkBookingCalendar({ tenantId, admin = false, fleetRevision = 0, timezone = 'Asia/Bangkok' }: { tenantId: string; admin?: boolean; fleetRevision?: number; timezone?: string }) {
  const { pt, dateLocale } = useParkLocale();
  const id = useId();
  const [bookings, setBookings] = useState<ParkBooking[]>([]);
  const [assets, setAssets] = useState<PlatformAsset[]>([]);
  const today = parkToday(timezone);
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [assetId, setAssetId] = useState('');
  const [view, setView] = useState('timetable');
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
      .catch((failure) => { if (!controller.signal.aborted) { setBookings([]); setError(failure instanceof Error ? failure.message : parkText("Не удалось загрузить календарь.")); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tenantId, admin, reload, fleetRevision]);
  const action = async (booking: ParkBooking, status: 'confirmed' | 'cancelled') => {
    setBusy(true); setError('');
    try { await changeParkBookingStatus(tenantId, booking, status, admin); setReload((value) => value + 1); return true; }
    catch (failure) { setError(failure instanceof Error ? failure.message : pt("Не удалось изменить статус.")); return false; }
    finally { setBusy(false); }
  };
  const cars = useMemo(() => calendarCars(assets, bookings), [assets, bookings]);
  const photos = useMemo(() => new Map(assets.map(asset => [asset.id, calendarThumbnail(asset)])), [assets]);
  const filtered = useMemo(() => bookings.filter(item => !assetId || item.asset_id === assetId), [bookings, assetId]);
  const active = useMemo(() => filtered.filter(item => item.status !== 'cancelled'), [filtered]);
  const monthBookings = useMemo(() => {
    const fleet = new Map(assets.map(asset => [asset.id, asset]));
    return active.map(item => calendarBookingWithAsset(item, fleet.get(item.asset_id)));
  }, [active, assets]);
  const date = useMemo(() => startOfMonth(new Date(`${month}-01T00:00:00`)), [month]);
  const focusDay = timetableFocusDay(month, today);
  const initialScrollDate = useMemo(() => new Date(`${focusDay}T00:00:00`), [focusDay]);
  const selected = selection?.bookingId ? filtered.filter(item => item.id === selection.bookingId) : selection?.day ? bookingsOnDay(filtered, selection.day) : [];
  const details = (items: ParkBooking[]) => <ul className="mt-2 divide-y divide-slate-200">{items.map((booking) => booking.entry_type !== 'block' ? <ParkRequestItem key={booking.id} booking={booking} tenantId={tenantId} admin={admin} photoReference={photos.get(booking.asset_id)} detailed busy={busy || loading || !!draft} onAction={(item, status) => { if (status === 'cancelled') setCancelTarget(item); else void action(item, status); }} /> : <li key={booking.id} className="py-4">
    <h3 className="break-words font-semibold">{booking.pricing.asset_name || booking.asset_id}</h3><p className="mt-1">{dateLabel(booking.pricing.start_date)} — {dateLabel(booking.pricing.end_date)} · {pt(statuses[booking.status] || booking.status)}</p>
    <p className="mt-1 text-sm font-medium">{booking.entry_type === 'block' ? pt("Блокировка занятости") : booking.source?.endsWith('_manual') ? pt("Ручная аренда") : pt("Заявка из Telegram")}</p>
    {booking.entry_type !== 'block' && <p className="mt-1 text-sm">{pt("Аренда: ")}{booking.pricing.total_rental} {booking.currency} {pt(" · депозит: ")}{booking.deposit.amount} {booking.currency}</p>}
    {booking.operator_details?.customer_name && <p className="mt-2 break-words text-sm">{pt("Клиент: ")}{booking.operator_details.customer_name}</p>}
    {booking.operator_details?.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{booking.operator_details.note}</p>}
    <p className="mt-1 break-all text-xs text-slate-600">{pt("Номер: ")}{booking.booking_number || booking.id}</p>
    {['requested', 'confirmed'].includes(booking.status) && <div className="mt-3 flex flex-wrap gap-3">{booking.status === 'requested' && <Button variant="outline" disabled={busy || loading || !!draft} onClick={() => void action(booking, 'confirmed')}><Check aria-hidden="true" />{pt("Подтвердить заявку")}</Button>}<Button variant="outline" disabled={busy || loading || !!draft} onClick={() => setCancelTarget(booking)}><X aria-hidden="true" />{booking.entry_type === 'block' ? pt("Снять блокировку") : pt("Отменить бронь")}</Button></div>}
  </li>)}</ul>;
  return <section aria-labelledby={`${id}-title`} aria-busy={loading || busy} className="min-w-0">
    <h2 id={`${id}-title`} className="sr-only">{pt('Календарь заявок парка')}</h2>
    <ParkCalendarActions createRef={createButton} createDisabled={loading || busy || !!draft || !assets.length || !!error} refreshDisabled={loading || busy || !!draft} onCreate={() => { setSuccess(''); setDraft({ assetId }); }} onRefresh={() => setReload(value => value + 1)} />
    <div className="mt-3 grid grid-cols-2 items-end gap-2 sm:max-w-lg">
      <div className="min-w-0"><label htmlFor={`${id}-month`} className="block text-sm font-medium">{pt("Месяц")}</label><ParkCalendarMonthSelect id={`${id}-month`} month={month} onChange={setMonth} /></div>
      <div className="min-w-0"><label htmlFor={`${id}-asset`} className="block text-sm font-medium">{pt("Транспорт")}</label><select id={`${id}-asset`} className="mt-2 h-11 w-full min-w-0 max-w-full rounded-md border border-slate-300 bg-white px-2 text-base" value={assetId} onChange={event => setAssetId(event.target.value)}><option value="">{pt("Весь транспорт")}</option>{cars.map(car => <option key={car.id} value={car.id}>{car.name}</option>)}</select></div>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-rose-800">{pt(error)}</p>}
    {!loading && !assets.length && !error && <p className="mt-3 text-sm text-slate-600">{pt("Чтобы создать запись, сначала добавьте машину в автопарк.")}</p>}
    {success && <p role="status" className="mt-3 text-sm text-emerald-800">{pt(success)}</p>}
    {draft && <ParkManualBookingForm tenantId={tenantId} assets={assets} admin={admin} initialDay={draft.day} initialAssetId={draft.assetId} onClose={() => setDraft(null)} onSaved={booking => {
      setBookings(items => [...items.filter(item => item.id !== booking.id), booking]); setMonth(booking.pricing.start_date.slice(0, 7)); setAssetId(booking.asset_id); setDraft(null);
      setSuccess(booking.entry_type === 'block' ? pt("Даты закрыты. Блокировка видна во всех видах календаря.") : booking.status === 'requested' ? pt("Предбронь создана. Даты заняты до подтверждения или отмены.") : pt("Подтверждённая бронь создана и видна во всех видах календаря."));
    }} />}
    {loading ? <p role="status" className="mt-4">{pt("Загружаем заявки…")}</p> : !error && <Tabs value={view} onValueChange={setView} className="mt-3">
      <ParkCalendarViewButtons />
      <TabsContent value="timetable" className="mt-3 min-w-0">
        <section aria-labelledby={`${id}-gantt-title`} className="min-w-0">
          <h3 id={`${id}-gantt-title`} className="sr-only">{pt('Таймтейбл')}</h3>
          <SchedulerCalendar cars={cars.filter(car => !assetId || car.id === assetId)} bookings={active.map(calendarBooking)} startDate={date} initialScrollDate={initialScrollDate} daysToShow={97} onDateChange={() => {}} onBookingClick={booking => setSelection({ bookingId: booking.booking_id })} onCreateBooking={() => {}} readOnly renderCarPhoto={car => <ParkCalendarPhoto key={`${tenantId}:${car.id}:${photos.get(car.id) || ''}`} tenantId={tenantId} reference={photos.get(car.id)} admin={admin} />} />
        </section>
      </TabsContent>
      <TabsContent value="deliveries" className="mt-5 min-w-0">
        <h3 className="mb-2 text-lg font-semibold">{pt("Календарь доставок")}</h3>
        <p className="mb-3 text-sm leading-6 text-slate-600">{format(date, 'LLLL yyyy', { locale: dateLocale })} {pt(" · Нажмите день или заявку.")}</p>
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-700">{[[parkBookingColors.pickup.dot, 'Выдача'], [parkBookingColors.return.dot, 'Возврат'], [parkBookingColors.pending.dot, 'Ожидает подтверждения'], [parkBookingColors.blocked.dot, 'Блокировка']].map(([color, label]) => <span key={pt(label)} className="inline-flex items-center gap-2"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${color}`} />{pt(label)}</span>)}</div>
        <MonthCalendarView currentDate={date} bookings={monthBookings} logisticsData={active.map(calendarLogistics)} onDateChange={value => setMonth(format(value, 'yyyy-MM'))} onBookingClick={booking => setSelection({ bookingId: booking.booking_id })} onDayClick={value => setSelection({ day: format(value, 'yyyy-MM-dd') })} showOccupancy />
      </TabsContent>
    </Tabs>}
<Dialog open={!!selection} onOpenChange={open => { if (!open) setSelection(null); }}><DialogContent aria-describedby={undefined} closeLabel={pt("Закрыть заявку")} closeButtonClassName="right-2 top-2 flex size-11 items-center justify-center" onCloseAutoFocus={event => { if (draft) event.preventDefault(); }} ><DialogHeader className="sticky top-0 z-10 bg-white pb-4 pr-10 text-left"><DialogTitle className="flex items-center gap-2 text-balance"><ClipboardList aria-hidden="true" className="size-5 shrink-0 text-blue-700" />{selection?.day ? pt("События {0}", [dateLabel(selection.day)]) : pt("Заявка парка")}</DialogTitle></DialogHeader>{selected.length ? details(selected) : <p>{pt("На этот день событий нет.")}</p>}{selection?.day && <Button disabled={!!draft || loading || busy || !assets.length} onClick={() => { setDraft({ day: selection.day, assetId }); setSelection(null); setSuccess(''); }}><Plus aria-hidden="true" />{pt("Добавить запись на этот день")}</Button>}{error && <p role="alert" className="text-sm text-rose-800">{pt(error)}</p>}</DialogContent></Dialog>
    <AlertDialog open={!!cancelTarget} onOpenChange={open => { if (!open && !busy) setCancelTarget(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{cancelTarget?.entry_type === 'block' ? pt("Снять блокировку?") : pt("Отменить заявку?")}</AlertDialogTitle><AlertDialogDescription>{pt("Период на ")}{cancelTarget?.pricing.asset_name} {pt(" освободится для других клиентов. Автоматическое сообщение клиенту не отправляется.")}</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="text-sm text-rose-800">{pt(error)}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>{pt("Оставить без изменений")}</AlertDialogCancel><AlertDialogAction disabled={busy} className="bg-red-700 text-white hover:bg-red-800" onClick={event => { event.preventDefault(); if (cancelTarget) void action(cancelTarget, 'cancelled').then(ok => { if (ok) setCancelTarget(null); }); }}>{busy ? pt("Отменяем…") : pt("Подтвердить отмену")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}

export function ParkCalendarViewButtons() {
  const { pt, dateLocale } = useParkLocale();
  const triggerClass = 'min-h-11 whitespace-normal gap-2 rounded-lg px-3 text-sm data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:shadow-none';
  return <TabsList aria-label={pt("Вид календаря")} className="grid h-auto w-full max-w-md grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1"><TabsTrigger value="timetable" className={triggerClass}><ChartGantt aria-hidden="true" className="size-4 shrink-0" />{pt("Таймтейбл")}</TabsTrigger><TabsTrigger value="deliveries" className={triggerClass}><CalendarDays aria-hidden="true" className="size-4 shrink-0" />{pt("Календарь доставок")}</TabsTrigger></TabsList>;
}
