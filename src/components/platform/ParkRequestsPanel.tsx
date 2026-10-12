import { parkText } from '@/lib/park-locale';
import { parkText as pt } from '@/lib/park-locale';
import { useParkLocale } from '@/contexts/park-locale';
import { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Banknote, CalendarDays, CarFront, Check, ClipboardList, Copy, MessageCircle, Phone, RefreshCw, UserRound, WalletCards, X } from 'lucide-react';
import { changeParkBookingStatus, editParkBooking, fetchParkCalendar, type ParkBooking, type ParkContact } from '@/api/park-telegram';
import { subscribeParkCalendar } from '@/lib/park-calendar-updates';
import { dateLabel, rentalMoney } from '@/lib/park-rental';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ParkTariffBreakdown } from './ParkTariffBreakdown';
import { ParkPickupSummary } from './ParkPickupFields';

const statuses: Record<string, string> = { requested: 'Ожидает подтверждения', confirmed: 'Подтверждена', cancelled: 'Отменена', in_progress: 'В аренде', completed: 'Завершена' };
const statusColors: Record<string, string> = {
  requested: 'bg-amber-50 text-amber-900',
  confirmed: 'bg-emerald-100 text-emerald-900',
  cancelled: 'bg-red-100 text-red-900',
};

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
    <div className="flex flex-wrap gap-2"><Button type="submit" className="min-h-11 bg-blue-700 text-white hover:bg-blue-800" disabled={busy}>{busy ? pt("Сохраняем…") : pt("Сохранить изменения")}</Button><Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>{pt("Не сохранять")}</Button></div>
  </form>;
}

export function ParkRequestItem({ booking, busy, onAction, detailed = false, tenantId, admin = false }: { booking: ParkBooking; busy: boolean; detailed?: boolean; tenantId?: string; admin?: boolean; onAction: (booking: ParkBooking, status: 'confirmed' | 'cancelled') => void }) {
  const { pt, intlLocale } = useParkLocale();
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
    <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="flex items-start gap-2 break-words text-lg font-semibold">{detailed && <CarFront aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-blue-700" />}{booking.pricing.asset_name || pt("Транспорт парка")}</h3><span className={cn('rounded-full px-3 py-1 text-xs font-medium', statusColors[booking.status] || 'bg-slate-100 text-slate-700')}>{pt(statuses[booking.status] || booking.status)}</span></div>
    {!detailed && booking.booking_number && <p className="mt-2 text-xs tabular-nums text-slate-600">{pt("Заявка № ")}{booking.booking_number}</p>}
    <p className="mt-2 flex items-start gap-2 text-sm text-slate-700"><CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />{dateLabel(booking.pricing.start_date)} — {dateLabel(booking.pricing.end_date)} · {booking.pricing.days} {pt(" суток", [booking.pricing.days])}</p>
    {detailed ? <dl className="mt-4 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><div><dt className="flex items-center gap-2 text-sm text-slate-600"><Banknote aria-hidden="true" className="size-4" />{pt("Аренда")}</dt><dd className="mt-2 break-words text-xl font-semibold tabular-nums text-blue-700">{rentalMoney(booking.pricing.total_rental, booking.currency)}</dd></div><div><dt className="flex items-center gap-2 text-sm text-slate-600"><WalletCards aria-hidden="true" className="size-4" />{pt("Депозит отдельно")}</dt><dd className="mt-2 break-words text-xl font-semibold tabular-nums">{rentalMoney(booking.deposit.amount, booking.currency)}</dd></div></dl> : <p className="mt-2 flex flex-wrap items-center gap-2 text-sm tabular-nums text-slate-700"><Banknote aria-hidden="true" className="h-4 w-4" />{pt("Аренда: ")}{rentalMoney(booking.pricing.total_rental, booking.currency)} {pt(" · депозит отдельно: ")}{rentalMoney(booking.deposit.amount, booking.currency)}</p>}
    {detailed && <ParkTariffBreakdown items={booking.pricing.tariff_breakdown} currency={booking.currency} />}
    {booking.pricing.pickup && <div className="mt-3"><ParkPickupSummary pickup={booking.pricing.pickup} deliveryFee={booking.pricing.delivery_fee} returnFee={booking.pricing.return_fee} extraDay={booking.pricing.extra_day} total={booking.pricing.total_payable} currency={booking.currency} /></div>}
    <div className="mt-4 space-y-2"><p className="flex items-start gap-2 break-words font-medium"><UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600" />{name}</p>
      {username && <p className="break-all text-sm text-slate-700">@{username}</p>}
      {booking.customer?.telegram_user_id && <p className="text-xs tabular-nums text-slate-600">Telegram ID: {booking.customer.telegram_user_id}</p>}
      {phone && <p className="break-words text-sm text-slate-700">{pt("Телефон: ")}{phone}</p>}
      {contact && <div className="space-y-2"><p className="break-all text-sm text-slate-700">{contactLabel}: {contact.value}</p><Button variant="outline" className="min-h-11 gap-2" onClick={async () => { try { await navigator.clipboard.writeText(contact.value); setCopyMessage(pt("Контакт скопирован.")); } catch { setCopyMessage(pt("Выделите и скопируйте контакт вручную.")); } }}><Copy aria-hidden="true" className="h-4 w-4" />{pt("Скопировать контакт")}</Button>{copyMessage && <p role="status" className="text-sm text-slate-600">{pt(copyMessage)}</p>}</div>}
      {!username && !phone && !contact && <p className="text-sm leading-6 text-slate-600">{pt("Контакт для прямой связи не указан. Telegram не передаёт номер телефона автоматически.")}</p>}
      <div className="flex flex-wrap gap-2">{telegramUrl && <Button asChild variant="outline" className="min-h-11 gap-2"><a href={telegramUrl} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" className="h-4 w-4" />{pt("Написать в Telegram")}</a></Button>}{phoneUrl && <Button asChild variant="outline" className="min-h-11 gap-2"><a href={phoneUrl}><Phone aria-hidden="true" className="h-4 w-4" />{pt("Позвонить")}</a></Button>}</div>
    </div>
    {booking.operator_details?.note && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-600">{booking.operator_details.note}</p>}
    {tenantId && booking.entry_type !== 'block' && <div className="mt-4">{!editing && <Button ref={editTrigger} type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => setEditing(true)}>{pt("Изменить заявку")}</Button>}{editing && <ParkBookingEditor booking={booking} tenantId={tenantId} admin={admin} onClose={closeEditor} />}</div>}
    <p className="mt-3 text-xs text-slate-600">{booking.source?.endsWith('_manual') ? pt("Ручная запись") : booking.source === 'web_storefront' ? pt("Заявка с веб-витрины") : pt("Заявка через Telegram")} · {booking.pricing.timezone}</p>
    {detailed && <div className="mt-4"><p className="text-sm font-medium">{pt("Номер заявки")}</p><div className="mt-2 flex min-w-0 items-center gap-2"><span className="min-w-0 select-text break-all text-sm font-medium tabular-nums">{bookingNumber}</span><Button type="button" variant="outline" className="size-11 shrink-0 p-0" aria-label={pt("Скопировать номер заявки")} onClick={async () => { try { await navigator.clipboard.writeText(bookingNumber); setReferenceMessage(pt("Номер скопирован.")); } catch { setReferenceMessage(pt("Выделите и скопируйте номер вручную.")); } }}><Copy aria-hidden="true" className="size-4" /></Button></div>{referenceMessage && <p role="status" className="mt-2 text-sm text-slate-600">{pt(referenceMessage)}</p>}</div>}
    {['requested', 'confirmed'].includes(booking.status) && <div className="mt-4 flex flex-wrap gap-2">{booking.status === 'requested' && <Button className="min-h-11 gap-2 bg-blue-700 text-white hover:bg-blue-800" disabled={busy || editing} onClick={() => onAction(booking, 'confirmed')}><Check aria-hidden="true" className="h-4 w-4" />{pt("Подтвердить")}</Button>}<Button variant="outline" className="min-h-11 gap-2" disabled={busy || editing} onClick={() => onAction(booking, 'cancelled')}><X aria-hidden="true" className="h-4 w-4" />{pt("Отменить")}</Button></div>}
  </li>;
}

export function ParkRequestsPanel({ tenantId, admin, revision = 0 }: { tenantId: string; admin: boolean; revision?: number }) {
  const { pt, intlLocale } = useParkLocale();
  const id = useId();
  const [bookings, setBookings] = useState<ParkBooking[]>([]);
  const [filter, setFilter] = useState('requested');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => subscribeParkCalendar(tenantId, () => setReload(value => value + 1)), [tenantId]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetchParkCalendar(tenantId, admin, controller.signal).then(items => { if (!controller.signal.aborted) setBookings(items); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : parkText("Не удалось загрузить заявки.")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tenantId, admin, revision, reload]);
  const items = useMemo(() => bookings.filter(item => item.entry_type !== 'block' && (filter === 'all' || item.status === filter)).sort((a, b) => a.start_at.localeCompare(b.start_at)), [bookings, filter]);
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
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id={`${id}-title`} className="flex items-center gap-2 text-xl font-semibold"><ClipboardList aria-hidden="true" className="h-5 w-5 text-blue-700" />{pt("Заявки парка")}</h2><Button variant="outline" className="min-h-11 gap-2" disabled={busy || loading} onClick={() => setReload(value => value + 1)}><RefreshCw aria-hidden="true" className="h-4 w-4" />{pt("Обновить")}</Button></div>
    <p className="mt-2 text-sm leading-6 text-slate-600">{pt("Все даты, независимо от месяца календаря. Ожидающие заявки занимают период. Сообщения клиентам автоматически не отправляются.")}</p>
    <div className="my-5"><label htmlFor={`${id}-status`} className="block text-sm font-medium">{pt("Статус заявки")}</label><select id={`${id}-status`} value={filter} onChange={event => setFilter(event.target.value)} className="mt-2 h-11 max-w-full rounded-md border border-slate-300 bg-white px-3 text-base"><option value="requested">{pt("Ожидают подтверждения")}</option><option value="confirmed">{pt("Подтверждённые")}</option><option value="cancelled">{pt("Отменённые")}</option><option value="all">{pt("Все заявки")}</option></select></div>
    {error && <div className="mb-4"><p role="alert" className="text-sm text-rose-800">{pt(error)}</p><Button variant="outline" className="mt-3 min-h-11" disabled={busy || loading} onClick={() => setReload(value => value + 1)}>{pt("Повторить загрузку")}</Button></div>}
    {success && <p role="status" className="mb-4 text-sm text-emerald-800">{pt(success)}</p>}
    {loading ? <p role="status" className="py-6 text-slate-600">{pt("Загружаем заявки…")}</p> : !error && (items.length ? <ul className="space-y-4">{items.map(booking => <ParkRequestItem key={booking.id} booking={booking} tenantId={tenantId} admin={admin} busy={busy} onAction={(item, status) => void action(item, status)} />)}</ul> : <p role="status" className="py-6 text-slate-600">{filter === 'requested' ? pt("Нет заявок, ожидающих подтверждения.") : pt("Заявок с этим статусом пока нет.")}</p>)}
  </section>;
}
