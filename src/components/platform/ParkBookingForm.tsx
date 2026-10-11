import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Banknote, CalendarCheck, CalendarDays, CarFront, Clock3, Info, Loader2, MessageCircle, Pencil, Send, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchParkBotLink, ParkBooking, ParkContact, ParkQuote, quoteParkBooking, submitParkBooking } from '@/api/park-telegram';
import { dateLabel, ParkRentalPeriod, rentalMoney } from '@/lib/park-rental';
import { ParkTariffBreakdown } from './ParkTariffBreakdown';

export function ParkQuoteSummary({ quote }: { quote: ParkQuote }) {
  return <div className="space-y-4" role="status">
    <div className="space-y-2"><p className="flex items-start gap-2 break-words font-semibold"><CarFront aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />{quote.asset_name}</p><p className="flex items-start gap-2 text-sm text-slate-700"><CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />{dateLabel(quote.start_date)} — {dateLabel(quote.end_date)} · {quote.days} суток</p></div>
    <dl className="space-y-3 rounded-xl bg-slate-50 p-4 tabular-nums">
      <div className="flex flex-wrap items-start justify-between gap-2"><dt className="flex items-start gap-2 text-sm text-slate-600"><Banknote aria-hidden="true" className="h-4 w-4 shrink-0" /><span>Аренда<br />{quote.tariff_breakdown?.length ? 'По сезонной сетке' : `${rentalMoney(quote.daily_rate, quote.currency)} × ${quote.days} суток`}</span></dt><dd className="text-xl font-semibold text-blue-700">{rentalMoney(quote.total_rental, quote.currency)}</dd></div>
      <div className="flex flex-wrap items-start justify-between gap-2 border-t border-slate-200 pt-3"><dt className="flex items-start gap-2 text-sm text-slate-600"><WalletCards aria-hidden="true" className="h-4 w-4 shrink-0" />Возвратный депозит отдельно</dt><dd className="font-medium">{rentalMoney(quote.deposit, quote.currency)}</dd></div>
    </dl>
    <ParkTariffBreakdown items={quote.tariff_breakdown} currency={quote.currency} />
    <p className="flex items-center gap-2 break-all text-xs text-slate-600"><Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" />Часовой пояс: {quote.timezone}</p>
    <p className="flex items-start gap-2 text-sm leading-6 text-slate-600"><Info aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />Наличие и цена повторно проверяются при отправке. Заявку должен подтвердить парк.</p>
  </div>;
}

export function ParkContactFields({ id, contact, onChange, busy, error = '' }: { id: string; contact: ParkContact; onChange: (contact: ParkContact) => void; busy: boolean; error?: string }) {
  return <fieldset disabled={busy} className="space-y-3 border-t border-slate-200 pt-4">
    <legend className="flex items-center gap-2 font-semibold"><MessageCircle aria-hidden="true" className="h-4 w-4 text-blue-700" />Как с вами связаться</legend>
    <p id={`${id}-contact-hint`} className="text-sm leading-6 text-slate-600">В Telegram нет username. Выберите один способ связи и укажите номер с кодом страны.</p>
    <div><label htmlFor={`${id}-channel`} className="block text-sm font-medium">Способ связи</label><select id={`${id}-channel`} value={contact.channel} onChange={event => onChange({ ...contact, channel: event.target.value as ParkContact['channel'] })} className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base"><option value="whatsapp">WhatsApp</option><option value="max">MAX</option><option value="phone">Телефон</option></select></div>
    <div><label htmlFor={`${id}-contact`} className="block text-sm font-medium">{contact.channel === 'phone' ? 'Номер телефона' : `Номер в ${contact.channel === 'max' ? 'MAX' : 'WhatsApp'}`}</label><Input id={`${id}-contact`} type="tel" autoComplete="tel" required maxLength={32} pattern={'\\+[1-9][0-9 \\(\\)\\-]{6,30}'} value={contact.value} onChange={event => onChange({ ...contact, value: event.target.value })} aria-invalid={Boolean(error)} aria-describedby={`${id}-contact-hint ${id}-contact-format${error ? ` ${id}-contact-error` : ''}`} className="mt-2 min-h-11 text-base" /><p id={`${id}-contact-format`} className="mt-2 text-sm text-slate-600">Начните с + и кода страны. Укажите номер, по которому вы доступны в выбранном сервисе.</p>{error && <p id={`${id}-contact-error`} role="alert" className="mt-2 text-sm text-rose-800">{error}</p>}</div>
    <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" required className="mt-1 h-4 w-4 shrink-0 accent-blue-700" />Разрешаю передать этот контакт парку для связи по моей заявке.</label>
  </fieldset>;
}

export function ParkBookingForm({ tenantId, assetId, initialPeriod, onCreated }: { tenantId: string; assetId: string; initialPeriod?: ParkRentalPeriod | null; onCreated?: () => void }) {
  const id = useId();
  const [start, setStart] = useState(initialPeriod?.start || '');
  const [end, setEnd] = useState(initialPeriod?.end || '');
  const [quote, setQuote] = useState<ParkQuote | null>(null);
  const [booking, setBooking] = useState<ParkBooking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [contact, setContact] = useState<ParkContact>({ channel: 'whatsapp', value: '' });
  const [contactError, setContactError] = useState('');
  const requestId = useRef('');
  const active = useRef<AbortController | null>(null);
  const connected = Boolean(window.Telegram?.WebApp?.initData);
  const period = () => ({ tenant_id: tenantId, asset_id: assetId, start_date: start, end_date: end, init_data: window.Telegram?.WebApp?.initData || '' });
  useEffect(() => {
    const controller = new AbortController();
    if (!connected) {
      fetchParkBotLink(tenantId, controller.signal).then((url) => { if (!controller.signal.aborted) setLink(url); }).catch(() => { /* Entry above catalog has its own retry. */ });
    } else if (initialPeriod?.start && initialPeriod.end) {
      active.current = controller;
      setBusy(true);
      quoteParkBooking({ tenant_id: tenantId, asset_id: assetId, start_date: initialPeriod.start, end_date: initialPeriod.end, init_data: window.Telegram?.WebApp?.initData || '' }, controller.signal)
        .then((result) => { if (!controller.signal.aborted) setQuote(result); })
        .catch((failure) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Не удалось получить расчёт.'); })
        .finally(() => { if (active.current === controller) active.current = null; if (!controller.signal.aborted) setBusy(false); });
    }
    return () => { controller.abort(); active.current?.abort(); active.current = null; };
  }, [tenantId, assetId, connected, initialPeriod?.start, initialPeriod?.end]);
  const calculate = async (event: FormEvent) => {
    if (active.current) { event.preventDefault(); return; }
    const controller = new AbortController(); active.current = controller;
    event.preventDefault(); setBusy(true); setError(''); setQuote(null);
    try { const result = await quoteParkBooking(period(), controller.signal); if (!controller.signal.aborted) { setQuote(result); requestId.current = ''; } }
    catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Не удалось получить расчёт.'); }
    finally { if (active.current === controller) active.current = null; if (!controller.signal.aborted) setBusy(false); }
  };
  const submit = async () => {
    if (!quote || busy || active.current) return;
    const number = contact.value.replace(/[ ()-]/g, '');
    if (quote.requires_contact && !/^\+[1-9][0-9]{6,14}$/.test(number)) { setContactError('Укажите номер с кодом страны: + и от 7 до 15 цифр.'); return; }
    const controller = new AbortController(); active.current = controller;
    setBusy(true); setError('');
    if (!requestId.current) requestId.current = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
    try { const result = await submitParkBooking(period(), quote.quote_token, requestId.current, controller.signal, quote.requires_contact ? { ...contact, value: number, consent: true } : undefined); if (!controller.signal.aborted) { setBooking(result); onCreated?.(); } }
    catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Не удалось отправить заявку. Повторите с тем же расчётом.'); }
    finally { if (active.current === controller) active.current = null; if (!controller.signal.aborted) setBusy(false); }
  };
  const change = (value: string, field: 'start' | 'end') => { if (field === 'start') setStart(value); else setEnd(value); setQuote(null); setError(''); };
  if (booking) return <div role="status" className="space-y-3 border-t pt-4"><h3 className="text-lg font-semibold">Заявка принята</h3><p>Ожидает подтверждения парком — это ещё не подтверждённая бронь.</p><p className="font-medium">{booking.pricing.asset_name}</p><p>{dateLabel(booking.pricing.start_date)} — {dateLabel(booking.pricing.end_date)}</p><p>Аренда: {rentalMoney(booking.pricing.total_rental, booking.currency)}</p><p>Возвратный депозит отдельно: {rentalMoney(booking.deposit.amount, booking.currency)}</p><p className="break-all text-sm">Номер: {booking.booking_number || booking.id}</p><Button type="button" variant="outline" onClick={async () => {
    try { await navigator.clipboard.writeText(booking.booking_number || booking.id); setCopied(true); } catch { setError('Копирование недоступно. Выделите номер заявки вручную.'); }
  }}>{copied ? 'Номер скопирован' : 'Скопировать номер заявки'}</Button><p className="text-sm text-slate-600">Заявка появилась в календаре парка. Уведомления в чате пока не подключены.</p>{error && <p role="alert" className="text-sm text-rose-800">{error}</p>}</div>;
  return <form onSubmit={event => { if (quote) { event.preventDefault(); void submit(); } else void calculate(event); }} aria-busy={busy} className="space-y-4 border-t pt-4">
    <h3 className="flex items-center gap-2 text-lg font-semibold"><CalendarCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-700" />{quote ? 'Проверьте заявку' : 'Проверка дат и цены'}</h3>
    {!connected && <div><p className="text-sm leading-6 text-slate-600">Чтобы отправить заявку, откройте витрину из сообщения бота парка. Каталог и наличие доступны без входа.</p>{link && <Button asChild variant="outline" className="mt-3"><a href={link} target="_blank" rel="noopener noreferrer">Открыть бота парка</a></Button>}</div>}
    {!quote && <fieldset disabled={busy || !connected} className="grid gap-3 sm:grid-cols-2">
      <div><label htmlFor={`${id}-start`} className="block text-sm font-medium">Получение</label><Input id={`${id}-start`} type="date" required value={start} onChange={(event) => change(event.target.value, 'start')} className="mt-2 text-base" aria-describedby={`${id}-hint`} /></div>
      <div><label htmlFor={`${id}-end`} className="block text-sm font-medium">Возврат</label><Input id={`${id}-end`} type="date" required min={start || undefined} value={end} onChange={(event) => change(event.target.value, 'end')} className="mt-2 text-base" aria-describedby={`${id}-hint`} /></div>
    </fieldset>}
    <p id={`${id}-hint`} className="text-sm leading-6 text-slate-600">Полные сутки, без времени и доставки. День возврата не оплачивается. Депозит указан отдельно от аренды.</p>
    {!quote ? <Button type="submit" variant="outline" className="min-h-11 gap-2" disabled={busy || !connected}>{busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <CalendarDays aria-hidden="true" className="h-4 w-4" />}{busy ? 'Проверяем…' : 'Проверить даты и цену'}</Button> : <Button type="button" variant="outline" className="min-h-11 gap-2" disabled={busy} onClick={() => { setQuote(null); setError(''); }}><Pencil aria-hidden="true" className="h-4 w-4" />Изменить даты</Button>}
    {quote && <><ParkQuoteSummary quote={quote} />{quote.requires_contact && <ParkContactFields id={id} busy={busy} contact={contact} error={contactError} onChange={value => { setContact(value); setContactError(''); setError(''); }} />}<Button type="submit" className="min-h-12 w-full gap-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800" disabled={busy}>{busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Send aria-hidden="true" className="h-4 w-4" />}{busy ? 'Отправляем…' : 'Отправить заявку'}</Button></>}
    {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
  </form>;
}
