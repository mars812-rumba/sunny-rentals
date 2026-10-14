import { parkText } from '@/lib/park-locale';
import { parkText as pt } from '@/lib/park-locale';
import { useParkLocale } from '@/contexts/park-locale';
import { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Banknote, CalendarDays, CarFront, Check, ClipboardList, Clock3, Copy, MapPin, MessageCircle, Pencil, Phone, Plus, RefreshCw, UserRound, WalletCards, X } from 'lucide-react';
import type { PlatformAsset } from '@/api/platform-admin';
import { ParkManualBookingForm } from './ParkManualBookingForm';
import { changeParkBookingStatus, editParkBooking, fetchParkCalendar, type ParkBooking, type ParkContact } from '@/api/park-telegram';
import { subscribeParkCalendar } from '@/lib/park-calendar-updates';
import { dateLabel, rentalMoney } from '@/lib/park-rental';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ParkTariffBreakdown } from './ParkTariffBreakdown';
import { pickupLabels } from '@/lib/park-pickup';
import { filterParkRequests } from '@/lib/park-request-filters';
import { parkBookingColors } from '@/lib/park-booking-colors';
import { ParkCalendarPhoto } from './ParkCalendarPhoto';
import { ParkDateField } from './ParkDateField';

const statuses: Record<string, string> = { requested: 'Ожидает подтверждения', confirmed: 'Подтверждена', cancelled: 'Отменена', in_progress: 'В аренде', completed: 'Завершена' };
const statusColors: Record<string, string> = {
  requested: parkBookingColors.pending.badge,
  confirmed: parkBookingColors.confirmed.badge,
  blocked: parkBookingColors.blocked.badge,
  cancelled: 'bg-red-300 text-red-950',
  in_progress: 'bg-blue-300 text-blue-950',
  completed: 'bg-sky-300 text-sky-950',
};

function ParkRequestJourney({ pickup }: { pickup: ParkBooking['pricing']['pickup'] }) {
  const { pt } = useParkLocale();
  if (!pickup) return null;
  return <dl className="mt-3 overflow-hidden rounded-lg text-sm">
    {([
      { label: 'Получение', time: pickup.time, location: pickup.location, address: pickup.address, color: 'bg-slate-100 text-slate-900' },
      { label: 'Возврат', time: pickup.return_time || pickup.time, location: pickup.return_location, address: pickup.return_address, color: 'bg-slate-100 text-slate-900' },
    ] as const).map(item => <div key={item.label} className={cn('min-w-0 px-3 py-3 sm:px-4', item.color)}>
      <dt className="flex items-center gap-2 font-semibold"><MapPin aria-hidden="true" className="size-4 shrink-0" />{pt(item.label)}</dt>
      <dd className="mt-1 break-words pl-6 leading-6"><span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium tabular-nums"><Clock3 aria-hidden="true" className="size-3.5 shrink-0" />{item.time}{item.location && <> · {pt(pickupLabels[item.location])}</>}</span>{item.location === 'city' && <> · {item.address?.trim() || pt(item.label === 'Получение' ? 'Адрес не указан' : 'Адрес возврата не указан')}</>}</dd>
    </div>)}
  </dl>;
}

function ParkRequestPrices({ booking, detailed }: { booking: ParkBooking; detailed: boolean }) {
  const { pt } = useParkLocale();
  const { pricing, currency } = booking;
  return <section className="mt-4 border-t border-slate-200 pt-4" aria-label={pt('Стоимость')}>
    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"><Banknote aria-hidden="true" className="size-4 text-blue-700" />{pt('Стоимость')}</h4>
    <div className="rounded-lg bg-emerald-50 px-3 py-3 text-emerald-950 sm:px-4">
      <dl className="space-y-2 text-sm">
        {([
          ['Аренда', pricing.total_rental],
          ['Доставка', pricing.delivery_fee],
          ['Возврат', pricing.return_fee],
        ] as const).map(([label, amount]) => amount === undefined ? null : <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><dt className="text-slate-600">{pt(label)}</dt><dd className="min-w-0 break-words font-medium tabular-nums text-slate-900">{rentalMoney(amount, currency)}</dd></div>)}
        {pricing.total_payable !== undefined && <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-emerald-200 pt-3 font-semibold text-emerald-800"><dt>{pt('Итого аренда и доставка')}</dt><dd className="min-w-0 break-words text-xl tabular-nums">{rentalMoney(pricing.total_payable, currency)}</dd></div>}
      </dl>
      {pricing.extra_day && <p className="mt-2 text-xs leading-5 text-amber-900">{pt('Дополнительные сутки за позднее время возврата включены в расчёт.')}</p>}
      {detailed && <ParkTariffBreakdown items={pricing.tariff_breakdown} currency={currency} />}
    </div>
    <dl className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><dt className="flex items-center gap-2 font-medium"><WalletCards aria-hidden="true" className="size-4 shrink-0" />{pt('Депозит отдельно')}</dt><dd className="min-w-0 break-words font-semibold tabular-nums">{rentalMoney(booking.deposit.amount, currency)}</dd></div></dl>
  </section>;
}

function ParkBookingEditor({ booking, tenantId, admin, onClose }: { booking: ParkBooking; tenantId: string; admin: boolean; onClose: () => void }) {
  const { pt, intlLocale } = useParkLocale();
  const id = useId();
  const nameInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(booking.operator_details?.customer_name || booking.customer?.name || '');
  const [channel, setChannel] = useState<ParkContact['channel']>(booking.customer?.contact?.channel || 'phone');
  const [contact, setContact] = useState(booking.customer?.contact?.value || booking.customer?.phone || '');
  const [note, setNote] = useState(booking.operator_details?.note || '');
  const [version] = useState(booking.updated_at);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { nameInput.current?.focus(); }, []);
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    const number = contact.replace(/[ ()-]/g, '');
    if (number && !/^\+[1-9][0-9]{6,14}$/.test(number)) { setError(pt("Укажите контакт с + и кодом страны или оставьте поле пустым.")); return; }
    if (!name.trim()) { setError(pt("Укажите имя клиента.")); return; }
    if (!version) { setError(pt("Обновите список заявок перед редактированием.")); return; }
    setBusy(true); setError('');
    try { await editParkBooking(tenantId, booking.id, { customer_name: name.trim(), contact_channel: channel, contact_value: number, note, expected_updated_at: version }, admin); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : pt("Не удалось сохранить заявку. Повторите попытку.")); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="mt-4 space-y-4 border-t border-slate-200 pt-4" aria-busy={busy}>
    <h4 className="font-semibold">{pt("Редактирование заявки")}</h4>
    <fieldset disabled={busy} className="space-y-4">
      <div><label htmlFor={`${id}-name`} className="block text-sm font-medium">{pt("Имя клиента")}</label><Input ref={nameInput} id={`${id}-name`} required maxLength={160} value={name} onChange={event => setName(event.target.value)} className="mt-2 min-h-11 text-base" aria-describedby={error ? `${id}-error` : undefined} /></div>
      <div><label htmlFor={`${id}-channel`} className="block text-sm font-medium">{pt("Способ связи")}</label><select id={`${id}-channel`} value={channel} onChange={event => setChannel(event.target.value as ParkContact['channel'])} className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base"><option value="phone">{pt("Телефон")}</option><option value="whatsapp">WhatsApp</option><option value="max">MAX</option></select></div>
      <div><label htmlFor={`${id}-contact`} className="block text-sm font-medium">{pt("Контакт (необязательно)")}</label><Input id={`${id}-contact`} type="tel" maxLength={32} autoComplete="tel" value={contact} onChange={event => setContact(event.target.value)} className="mt-2 min-h-11 text-base" aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`} /><p id={`${id}-hint`} className="mt-2 text-sm text-slate-600">{pt("Номер с + и кодом страны. Изменение относится только к этой заявке.")}</p></div>
      <div><label htmlFor={`${id}-note`} className="block text-sm font-medium">{pt("Внутренняя пометка")}</label><Textarea id={`${id}-note`} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} className="mt-2 text-base" /><p className="mt-2 text-sm text-slate-600">{pt("Видна только в кабинете парка.")}</p></div>
    </fieldset>
    {error && <p id={`${id}-error`} role="alert" className="text-sm text-red-700">{pt(error)}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" className="min-h-11 bg-emerald-700 text-white hover:bg-emerald-800" disabled={busy}>{busy ? pt("Сохраняем…") : pt("Сохранить изменения")}</Button><Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>{pt("Не сохранять")}</Button></div>
  </form>;
}

export function ParkRequestItem({ booking, busy, onAction, detailed = false, tenantId, admin = false, photoReference }: { booking: ParkBooking; busy: boolean; detailed?: boolean; tenantId?: string; admin?: boolean; photoReference?: string; onAction: (booking: ParkBooking, status: 'confirmed' | 'cancelled') => void }) {
  const { pt, intlLocale } = useParkLocale();
  const editorId = useId();
  const [editing, setEditing] = useState(false);
  const editTrigger = useRef<HTMLButtonElement>(null);
  const closeEditor = () => { setEditing(false); requestAnimationFrame(() => editTrigger.current?.focus()); };
  const [copyMessage, setCopyMessage] = useState('');
  const [referenceMessage, setReferenceMessage] = useState('');
  const bookingNumber = booking.booking_number || booking.id;
  const contact = booking.customer?.contact;
  const contactLabel = contact?.channel === 'whatsapp' ? 'WhatsApp' : contact?.channel === 'max' ? 'MAX' : pt("Телефон");
  const username = booking.customer?.username?.replace(/^@/, '') || '';
  const telegramUrl = /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(username) ? `https://t.me/${username}` : '';
  const phone = booking.customer?.phone || '';
  const phoneUrl = /^\+?[\d ()-]{5,30}$/.test(phone) ? `tel:${phone.replace(/[ ()-]/g, '')}` : '';
  const name = booking.operator_details?.customer_name || booking.customer?.name || pt("Имя не указано");
  return <li className={cn('min-w-0', detailed ? 'py-2' : 'rounded-xl border border-slate-300 bg-white p-4 sm:p-5')}>
    <div className={cn('flex gap-3', detailed ? 'items-center' : 'flex-wrap items-start justify-between')}>
      {detailed && tenantId && <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100" data-request-photo>
        <ParkCalendarPhoto key={`${tenantId}:${booking.asset_id}:${photoReference || ''}`} tenantId={tenantId} reference={photoReference} admin={admin} />
      </div>}
      <div className={detailed ? 'min-w-0 flex-1' : 'contents'}>
        <h3 className="flex items-start gap-2 break-words text-lg font-semibold">{detailed && !tenantId && <CarFront aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-blue-700" />}<span className="min-w-0 break-words">{booking.pricing.asset_name || pt("Транспорт парка")}</span></h3>
        <span className={cn('inline-block rounded-full px-3 py-1 text-xs font-semibold', detailed && 'mt-1', statusColors[booking.status] || 'bg-slate-100 text-slate-700')}>{pt(statuses[booking.status] || booking.status)}</span>
      </div>
    </div>
    {!detailed && booking.booking_number && <p className="mt-2 text-xs tabular-nums text-slate-600">{pt("Заявка № ")}{booking.booking_number}</p>}
    <p className="mt-3 flex items-start gap-2 text-sm font-medium leading-6 text-slate-900"><CalendarDays aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-blue-700" /><span>{dateLabel(booking.pricing.start_date)} — {dateLabel(booking.pricing.end_date)}<span className="mt-0.5 block text-sm font-normal text-slate-600">{booking.pricing.days} {pt(" суток", [booking.pricing.days])}</span></span></p>
    <ParkRequestJourney pickup={booking.pricing.pickup} />
    <ParkRequestPrices booking={booking} detailed={detailed} />
    <div className="mt-4 space-y-2 border-t border-slate-200 pt-3">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1 pt-2">
          <p className="flex items-start gap-2 font-medium"><UserRound aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-blue-700" /><span className="min-w-0 break-words">{name}</span></p>
          {contact && <p className="mt-1 break-all text-sm text-slate-700">{contactLabel}: {contact.value}</p>}
        </div>
        {(contact || (tenantId && booking.entry_type !== 'block')) && <div className="flex shrink-0 items-center gap-1">
          {contact && <Button type="button" variant="ghost" className="size-11 shrink-0 p-0 text-blue-700 hover:bg-blue-50 hover:text-blue-800" aria-label={pt("Скопировать контакт")} title={pt("Скопировать контакт")} onClick={async () => { try { await navigator.clipboard.writeText(contact.value); setCopyMessage(pt("Контакт скопирован.")); } catch { setCopyMessage(pt("Выделите и скопируйте контакт вручную.")); } }}><Copy aria-hidden="true" className="size-4" /></Button>}
          {tenantId && booking.entry_type !== 'block' && <Button ref={editTrigger} type="button" variant="ghost" className="size-11 shrink-0 p-0 text-blue-700 hover:bg-blue-50 hover:text-blue-800" aria-label={pt("Изменить заявку")} title={pt("Изменить заявку")} aria-expanded={editing} aria-controls={editing ? editorId : undefined} disabled={busy || editing} onClick={() => setEditing(true)}><Pencil aria-hidden="true" className="size-4" /></Button>}
        </div>}
      </div>
      {username && <p className="break-all text-sm text-slate-700">@{username}</p>}
      {booking.customer?.telegram_user_id && <p className="text-xs tabular-nums text-slate-600">Telegram ID: {booking.customer.telegram_user_id}</p>}
      {phone && <p className="break-words text-sm text-slate-700">{pt("Телефон: ")}{phone}</p>}
      {!username && !phone && !contact && <p className="text-sm leading-6 text-slate-600">{pt("Контакт для прямой связи не указан. Telegram не передаёт номер телефона автоматически.")}</p>}
      {(telegramUrl || phoneUrl) && <div className="flex flex-wrap gap-2">{telegramUrl && <Button asChild variant="outline" className="min-h-11 gap-2"><a href={telegramUrl} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" className="h-4 w-4" />{pt("Написать в Telegram")}</a></Button>}{phoneUrl && <Button asChild variant="outline" className="min-h-11 gap-2"><a href={phoneUrl}><Phone aria-hidden="true" className="h-4 w-4" />{pt("Позвонить")}</a></Button>}</div>}
    </div>
    {booking.operator_details?.note && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-600">{booking.operator_details.note}</p>}
    {copyMessage && <p role="status" className="mt-2 text-sm text-slate-600">{pt(copyMessage)}</p>}
    {tenantId && booking.entry_type !== 'block' && editing && <div id={editorId}><ParkBookingEditor booking={booking} tenantId={tenantId} admin={admin} onClose={closeEditor} /></div>}
    <p className="mt-3 text-xs text-slate-600">{booking.source?.endsWith('_manual') ? pt("Ручная запись") : booking.source === 'web_storefront' ? pt("Заявка с веб-витрины") : pt("Заявка через Telegram")} · {booking.pricing.timezone}</p>
    {detailed && <div className="mt-4"><p className="text-sm font-medium">{pt("Номер заявки")}</p><div className="mt-2 flex min-w-0 items-center gap-2"><span className="min-w-0 select-text break-all text-sm font-medium tabular-nums">{bookingNumber}</span><Button type="button" variant="outline" className="size-11 shrink-0 p-0" aria-label={pt("Скопировать номер заявки")} onClick={async () => { try { await navigator.clipboard.writeText(bookingNumber); setReferenceMessage(pt("Номер скопирован.")); } catch { setReferenceMessage(pt("Выделите и скопируйте номер вручную.")); } }}><Copy aria-hidden="true" className="size-4" /></Button></div>{referenceMessage && <p role="status" className="mt-2 text-sm text-slate-600">{pt(referenceMessage)}</p>}</div>}
    {['requested', 'confirmed'].includes(booking.status) && <div className="mt-4 flex flex-wrap gap-2">{booking.status === 'requested' && <Button className="min-h-11 gap-2 bg-emerald-700 text-white hover:bg-emerald-800" disabled={busy || editing} onClick={() => onAction(booking, 'confirmed')}><Check aria-hidden="true" className="h-4 w-4" />{pt("Подтвердить")}</Button>}<Button variant="outline" className="min-h-11 gap-2" disabled={busy || editing} onClick={() => onAction(booking, 'cancelled')}><X aria-hidden="true" className="h-4 w-4" />{pt("Отменить")}</Button></div>}
  </li>;
}

export function ParkRequestsPanel({ tenantId, admin, revision = 0, assets = [], onCreated }: { tenantId: string; admin: boolean; revision?: number; assets?: PlatformAsset[]; onCreated?: () => void }) {
  const { pt, intlLocale } = useParkLocale();
  const id = useId();
  const [bookings, setBookings] = useState<ParkBooking[]>([]);
  const [filter, setFilter] = useState('requested');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const invalidPeriod = !!(startDate && endDate && endDate < startDate);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reload, setReload] = useState(0);
  const [creating, setCreating] = useState(false);
  const createTrigger = useRef<HTMLButtonElement>(null);
  const closeCreate = () => { setCreating(false); requestAnimationFrame(() => createTrigger.current?.focus()); };
  useEffect(() => { setStartDate(''); setEndDate(''); setFilter('requested'); }, [tenantId]);
  useEffect(() => subscribeParkCalendar(tenantId, () => setReload(value => value + 1)), [tenantId]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetchParkCalendar(tenantId, admin, controller.signal).then(items => { if (!controller.signal.aborted) setBookings(items); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : parkText("Не удалось загрузить заявки.")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tenantId, admin, revision, reload]);
  const items = useMemo(() => filterParkRequests(bookings, filter, startDate, endDate), [bookings, filter, startDate, endDate]);
  const action = async (booking: ParkBooking, status: 'confirmed' | 'cancelled') => {
    if (busy || loading) return;
    if (status === 'cancelled' && !window.confirm(pt("Отменить заявку на {0}? Даты освободятся для других клиентов.", [booking.pricing.asset_name]))) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await changeParkBookingStatus(tenantId, booking, status, admin);
      setSuccess(status === 'confirmed' ? pt("Заявка подтверждена. Календарь обновлён.") : pt("Заявка отменена. Даты освобождены."));
    } catch (failure) { setError(failure instanceof Error ? failure.message : pt("Не удалось изменить статус. Обновите заявки.")); }
    finally { setBusy(false); }
  };
  return <section aria-labelledby={`${id}-title`} aria-busy={loading || busy}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id={`${id}-title`} className="flex items-center gap-2 text-xl font-semibold"><ClipboardList aria-hidden="true" className="h-5 w-5 text-blue-700" />{pt("Заявки парка")}</h2><div className="flex flex-wrap gap-2"><Button ref={createTrigger} type="button" variant="outline" className="min-h-11 gap-2" disabled={busy || loading || creating || !assets.length} onClick={() => setCreating(true)}><Plus aria-hidden="true" className="size-4" />{pt('Добавить бронь')}</Button><Button variant="outline" className="min-h-11 gap-2" disabled={busy || loading} onClick={() => setReload(value => value + 1)}><RefreshCw aria-hidden="true" className="h-4 w-4" />{pt("Обновить")}</Button></div></div>
    {creating && <ParkManualBookingForm tenantId={tenantId} assets={assets} admin={admin} onClose={closeCreate} onSaved={booking => { closeCreate(); setFilter(booking.status); setStartDate(''); setEndDate(''); setReload(value => value + 1); setSuccess(pt('Бронь создана.')); onCreated?.(); }} />}
    <div className="my-5 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2 sm:grid-cols-4 sm:gap-3">
      <div className="col-span-3 min-w-0 sm:col-span-1"><label htmlFor={`${id}-status`} className="block text-sm font-medium">{pt("Статус заявки")}</label><select id={`${id}-status`} value={filter} onChange={event => setFilter(event.target.value)} className="mt-2 h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-base"><option value="requested">{pt("Ожидают подтверждения")}</option><option value="confirmed">{pt("Подтверждённые")}</option><option value="cancelled">{pt("Отменённые")}</option><option value="all">{pt("Все заявки")}</option></select></div>
      <div className="min-w-0"><label htmlFor={`${id}-start`} className="block text-sm font-medium">{pt('Дата начала')}</label><ParkDateField id={`${id}-start`} className="mt-2" value={startDate} onChange={event => setStartDate(event.target.value)} aria-invalid={invalidPeriod || undefined} aria-describedby={invalidPeriod ? `${id}-period-error` : undefined} /></div>
      <div className="min-w-0"><label htmlFor={`${id}-end`} className="block text-sm font-medium">{pt('Дата окончания')}</label><ParkDateField id={`${id}-end`} className="mt-2" value={endDate} min={startDate || undefined} onChange={event => setEndDate(event.target.value)} aria-invalid={invalidPeriod || undefined} aria-describedby={invalidPeriod ? `${id}-period-error` : undefined} /></div>
      <Button type="button" variant="outline" className="size-11 gap-2 p-0 sm:w-full sm:px-3" aria-label={pt('Сбросить даты')} title={pt('Сбросить даты')} disabled={!startDate && !endDate} onClick={() => { setStartDate(''); setEndDate(''); }}><X aria-hidden="true" className="size-4" /><span className="hidden sm:inline">{pt('Сбросить даты')}</span></Button>
    </div>
    {invalidPeriod && <p id={`${id}-period-error`} role="alert" className="mb-4 text-sm text-red-700">{pt('Дата окончания не может быть раньше даты начала.')}</p>}
    {error && <div className="mb-4"><p role="alert" className="text-sm text-rose-800">{pt(error)}</p><Button variant="outline" className="mt-3 min-h-11" disabled={busy || loading} onClick={() => setReload(value => value + 1)}>{pt("Повторить загрузку")}</Button></div>}
    {success && <p role="status" className="mb-4 text-sm text-emerald-800">{pt(success)}</p>}
    {loading ? <p role="status" className="py-6 text-slate-600">{pt("Загружаем заявки…")}</p> : !error && !invalidPeriod && (items.length ? <ul className="space-y-4">{items.map(booking => <ParkRequestItem key={booking.id} booking={booking} tenantId={tenantId} admin={admin} busy={busy} onAction={(item, status) => void action(item, status)} />)}</ul> : <p role="status" className="py-6 text-slate-600">{startDate || endDate ? pt('За выбранный период заявок с этим статусом нет.') : filter === 'requested' ? pt("Нет заявок, ожидающих подтверждения.") : pt("Заявок с этим статусом пока нет.")}</p>)}
  </section>;
}
