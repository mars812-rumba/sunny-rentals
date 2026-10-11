import { useEffect, useId, useMemo, useState } from 'react';
import { Banknote, CalendarDays, Check, ClipboardList, Copy, MessageCircle, Phone, RefreshCw, UserRound, X } from 'lucide-react';
import { changeParkBookingStatus, fetchParkCalendar, type ParkBooking } from '@/api/park-telegram';
import { subscribeParkCalendar } from '@/lib/park-calendar-updates';
import { dateLabel, rentalMoney } from '@/lib/park-rental';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const statuses: Record<string, string> = { requested: 'Ожидает подтверждения', confirmed: 'Подтверждена', cancelled: 'Отменена', in_progress: 'В аренде', completed: 'Завершена' };
const statusColors: Record<string, string> = {
  requested: 'bg-amber-50 text-amber-900',
  confirmed: 'bg-emerald-100 text-emerald-900',
  cancelled: 'bg-red-100 text-red-900',
};

export function ParkRequestItem({ booking, busy, onAction }: { booking: ParkBooking; busy: boolean; onAction: (booking: ParkBooking, status: 'confirmed' | 'cancelled') => void }) {
  const [copyMessage, setCopyMessage] = useState('');
  const contact = booking.customer?.contact;
  const contactLabel = contact?.channel === 'whatsapp' ? 'WhatsApp' : contact?.channel === 'max' ? 'MAX' : 'Телефон';
  const username = booking.customer?.username?.replace(/^@/, '') || '';
  const telegramUrl = /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(username) ? `https://t.me/${username}` : '';
  const phone = booking.customer?.phone || '';
  const phoneUrl = /^\+?[\d ()-]{5,30}$/.test(phone) ? `tel:${phone.replace(/[ ()-]/g, '')}` : '';
  const name = booking.operator_details?.customer_name || booking.customer?.name || 'Имя не указано';
  return <li className="min-w-0 rounded-xl border border-slate-300 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="break-words text-lg font-semibold">{booking.pricing.asset_name || 'Транспорт парка'}</h3><span className={cn('rounded-full px-3 py-1 text-xs font-medium', statusColors[booking.status] || 'bg-slate-100 text-slate-700')}>{statuses[booking.status] || booking.status}</span></div>
    <p className="mt-2 flex items-start gap-2 text-sm text-slate-700"><CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />{dateLabel(booking.pricing.start_date)} — {dateLabel(booking.pricing.end_date)} · {booking.pricing.days} суток</p>
    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm tabular-nums text-slate-700"><Banknote aria-hidden="true" className="h-4 w-4" />Аренда: {rentalMoney(booking.pricing.total_rental, booking.currency)} · депозит отдельно: {rentalMoney(booking.deposit.amount, booking.currency)}</p>
    <div className="mt-4 space-y-2"><p className="flex items-start gap-2 break-words font-medium"><UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600" />{name}</p>
      {username && <p className="break-all text-sm text-slate-700">@{username}</p>}
      {booking.customer?.telegram_user_id && <p className="text-xs tabular-nums text-slate-600">Telegram ID: {booking.customer.telegram_user_id}</p>}
      {phone && <p className="break-words text-sm text-slate-700">Телефон: {phone}</p>}
      {contact && <div className="space-y-2"><p className="break-all text-sm text-slate-700">{contactLabel}: {contact.value}</p><Button variant="outline" className="min-h-11 gap-2" onClick={async () => { try { await navigator.clipboard.writeText(contact.value); setCopyMessage('Контакт скопирован.'); } catch { setCopyMessage('Выделите и скопируйте контакт вручную.'); } }}><Copy aria-hidden="true" className="h-4 w-4" />Скопировать контакт</Button>{copyMessage && <p role="status" className="text-sm text-slate-600">{copyMessage}</p>}</div>}
      {!username && !phone && !contact && <p className="text-sm leading-6 text-slate-600">Контакт для прямой связи не указан. Telegram не передаёт номер телефона автоматически.</p>}
      <div className="flex flex-wrap gap-2">{telegramUrl && <Button asChild variant="outline" className="min-h-11 gap-2"><a href={telegramUrl} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" className="h-4 w-4" />Написать в Telegram</a></Button>}{phoneUrl && <Button asChild variant="outline" className="min-h-11 gap-2"><a href={phoneUrl}><Phone aria-hidden="true" className="h-4 w-4" />Позвонить</a></Button>}</div>
    </div>
    {booking.operator_details?.note && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-600">{booking.operator_details.note}</p>}
    <p className="mt-3 text-xs text-slate-600">{booking.source?.endsWith('_manual') ? 'Ручная запись' : 'Заявка через Telegram'} · {booking.pricing.timezone}</p>
    {['requested', 'confirmed'].includes(booking.status) && <div className="mt-4 flex flex-wrap gap-2">{booking.status === 'requested' && <Button className="min-h-11 gap-2 bg-blue-700 text-white hover:bg-blue-800" disabled={busy} onClick={() => onAction(booking, 'confirmed')}><Check aria-hidden="true" className="h-4 w-4" />Подтвердить</Button>}<Button variant="outline" className="min-h-11 gap-2" disabled={busy} onClick={() => onAction(booking, 'cancelled')}><X aria-hidden="true" className="h-4 w-4" />Отменить</Button></div>}
  </li>;
}

export function ParkRequestsPanel({ tenantId, admin, revision = 0 }: { tenantId: string; admin: boolean; revision?: number }) {
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
      .catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Не удалось загрузить заявки.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tenantId, admin, revision, reload]);
  const items = useMemo(() => bookings.filter(item => item.entry_type !== 'block' && (filter === 'all' || item.status === filter)).sort((a, b) => a.start_at.localeCompare(b.start_at)), [bookings, filter]);
  const action = async (booking: ParkBooking, status: 'confirmed' | 'cancelled') => {
    if (busy || loading) return;
    if (status === 'cancelled' && !window.confirm(`Отменить заявку на ${booking.pricing.asset_name}? Даты освободятся для других клиентов.`)) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await changeParkBookingStatus(tenantId, booking, status, admin);
      setSuccess(status === 'confirmed' ? 'Заявка подтверждена. Календарь обновлён.' : 'Заявка отменена. Даты освобождены.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Не удалось изменить статус. Обновите заявки.'); }
    finally { setBusy(false); }
  };
  return <section aria-labelledby={`${id}-title`} aria-busy={loading || busy}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id={`${id}-title`} className="flex items-center gap-2 text-xl font-semibold"><ClipboardList aria-hidden="true" className="h-5 w-5 text-blue-700" />Заявки парка</h2><Button variant="outline" className="min-h-11 gap-2" disabled={busy || loading} onClick={() => setReload(value => value + 1)}><RefreshCw aria-hidden="true" className="h-4 w-4" />Обновить</Button></div>
    <p className="mt-2 text-sm leading-6 text-slate-600">Все даты, независимо от месяца календаря. Ожидающие заявки занимают период. Сообщения клиентам автоматически не отправляются.</p>
    <div className="my-5"><label htmlFor={`${id}-status`} className="block text-sm font-medium">Статус заявки</label><select id={`${id}-status`} value={filter} onChange={event => setFilter(event.target.value)} className="mt-2 h-11 max-w-full rounded-md border border-slate-300 bg-white px-3 text-base"><option value="requested">Ожидают подтверждения</option><option value="confirmed">Подтверждённые</option><option value="cancelled">Отменённые</option><option value="all">Все заявки</option></select></div>
    {error && <div className="mb-4"><p role="alert" className="text-sm text-rose-800">{error}</p><Button variant="outline" className="mt-3 min-h-11" disabled={busy || loading} onClick={() => setReload(value => value + 1)}>Повторить загрузку</Button></div>}
    {success && <p role="status" className="mb-4 text-sm text-emerald-800">{success}</p>}
    {loading ? <p role="status" className="py-6 text-slate-600">Загружаем заявки…</p> : !error && (items.length ? <ul className="space-y-4">{items.map(booking => <ParkRequestItem key={booking.id} booking={booking} busy={busy} onAction={(item, status) => void action(item, status)} />)}</ul> : <p role="status" className="py-6 text-slate-600">{filter === 'requested' ? 'Нет заявок, ожидающих подтверждения.' : 'Заявок с этим статусом пока нет.'}</p>)}
  </section>;
}
