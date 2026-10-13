import { parkText } from '@/lib/park-locale';
import { parkText as pt } from '@/lib/park-locale';
import { useParkLocale } from '@/contexts/park-locale';
import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Banknote, CalendarCheck, CalendarDays, CarFront, Clock3, Info, Loader2, MessageCircle, Pencil, Send, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ParkBooking, ParkContact, ParkQuote, quoteParkBooking, submitParkBooking } from '@/api/park-telegram';
import { dateLabel, ParkRentalPeriod, rentalMoney } from '@/lib/park-rental';
import { ParkTariffBreakdown } from './ParkTariffBreakdown';
import { ParkPickupFields, ParkPickupSummary } from './ParkPickupFields';
import { type ParkPickup, validParkPickup, validParkReturn } from '@/lib/park-pickup';
import { ParkDateField } from './ParkDateField';

export function ParkQuoteSummary({ quote, showNotice = true }: { quote: Omit<ParkQuote, 'asset_id' | 'quote_token'>; showNotice?: boolean }) {
  const { pt, intlLocale } = useParkLocale();
  return <div className="space-y-4" role="status">
    <p className="flex items-start gap-2 break-words font-semibold"><CarFront aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />{quote.asset_name}</p>
    <section className="space-y-2 rounded-lg bg-blue-50 p-3 text-blue-950"><h4 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays aria-hidden="true" className="size-4 shrink-0 text-blue-700" />{pt('Период аренды')}</h4><p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium"><span>{dateLabel(quote.start_date)}</span><span>—</span><span>{dateLabel(quote.end_date)}</span></p><p className="text-sm">{quote.days} {pt(' суток', [quote.days])}</p></section>
    <dl className="grid min-w-0 gap-2 sm:grid-cols-2 tabular-nums">
      <div className="min-w-0 rounded-lg bg-emerald-50 p-3 text-emerald-950"><dt className="flex items-start gap-2 text-sm"><Banknote aria-hidden="true" className="size-4 shrink-0 text-emerald-700" /><span>{pt("Аренда")}<br />{quote.tariff_breakdown?.length ? pt("По сезонной сетке") : pt("{0} × {1} суток", [rentalMoney(quote.daily_rate, quote.currency), quote.days])}</span></dt><dd className="mt-2 break-words text-xl font-semibold">{rentalMoney(quote.total_rental, quote.currency)}</dd></div>
      <div className="min-w-0 rounded-lg bg-amber-50 p-3 text-amber-950"><dt className="flex items-start gap-2 text-sm"><WalletCards aria-hidden="true" className="size-4 shrink-0 text-amber-700" />{pt("Возвратный депозит отдельно")}</dt><dd className="mt-2 break-words text-xl font-semibold">{rentalMoney(quote.deposit, quote.currency)}</dd></div>
    </dl>
    <ParkTariffBreakdown items={quote.tariff_breakdown} currency={quote.currency} />
    <ParkPickupSummary pickup={quote.pickup} deliveryFee={quote.delivery_fee} returnFee={quote.return_fee} extraDay={quote.extra_day} total={quote.total_payable} currency={quote.currency} />
    <p className="flex items-center gap-2 break-all text-xs text-slate-600"><Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" />{pt("Часовой пояс: ")}{quote.timezone}</p>
    {showNotice && <p className="flex items-start gap-2 rounded-lg bg-violet-50 p-3 text-sm leading-6 text-violet-950"><Info aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-violet-700" />{pt("Наличие и цена повторно проверяются при отправке. Заявку должен подтвердить парк.")}</p>}
  </div>;
}

export function ParkContactFields({ id, contact, onChange, busy, error = '', browser = false }: { id: string; contact: ParkContact; onChange: (contact: ParkContact) => void; busy: boolean; error?: string; browser?: boolean }) {
  const { pt, intlLocale } = useParkLocale();
  return <fieldset disabled={busy} className="space-y-3 rounded-lg bg-slate-100 p-3 text-slate-900">
    <legend className="flex items-center gap-2 rounded-md bg-slate-100 px-2 py-1 font-semibold"><MessageCircle aria-hidden="true" className="h-4 w-4 text-blue-700" />{pt("Как с вами связаться")}</legend>
    <p id={`${id}-contact-hint`} className="text-sm leading-6 text-slate-600">{browser ? pt("Выберите один способ связи и укажите номер с кодом страны.") : pt("В Telegram нет username. Выберите один способ связи и укажите номер с кодом страны.")}</p>
    <div><label htmlFor={`${id}-channel`} className="block text-sm font-medium">{pt("Способ связи")}</label><select id={`${id}-channel`} value={contact.channel} onChange={event => onChange({ ...contact, channel: event.target.value as ParkContact['channel'] })} className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base"><option value="whatsapp">WhatsApp</option><option value="max">MAX</option><option value="phone">{pt("Телефон")}</option></select></div>
    <div><label htmlFor={`${id}-contact`} className="block text-sm font-medium">{contact.channel === 'phone' ? pt("Номер телефона") : pt("Номер в {0}", [contact.channel === 'max' ? 'MAX' : 'WhatsApp'])}</label><Input id={`${id}-contact`} type="tel" autoComplete="tel" required maxLength={32} pattern={'\\+[1-9][0-9 \\(\\)\\-]{6,30}'} value={contact.value} onChange={event => onChange({ ...contact, value: event.target.value })} aria-invalid={Boolean(error)} aria-describedby={`${id}-contact-hint ${id}-contact-format${error ? ` ${id}-contact-error` : ''}`} className="mt-2 min-h-11 text-base" /><p id={`${id}-contact-format`} className="mt-2 text-sm text-slate-600">{pt("Начните с + и кода страны. Укажите номер, по которому вы доступны в выбранном сервисе.")}</p>{error && <p id={`${id}-contact-error`} role="alert" className="mt-2 text-sm text-rose-800">{pt(error)}</p>}</div>
    <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" required className="mt-1 h-4 w-4 shrink-0 accent-blue-700" />{pt("Разрешаю передать этот контакт парку для связи по моей заявке.")}</label>
  </fieldset>;
}

export function ParkBookingForm({ tenantId, assetId, initialPeriod, initialPickup, onCreated, onEditPickup, currency = 'THB' }: { tenantId: string; assetId: string; initialPeriod?: ParkRentalPeriod | null; initialPickup?: ParkPickup; onCreated?: (booking: ParkBooking) => void; onEditPickup?: (period: ParkRentalPeriod) => void; currency?: string }) {
  const { pt, intlLocale } = useParkLocale();
  const id = useId();
  const [start, setStart] = useState(initialPeriod?.start || '');
  const [end, setEnd] = useState(initialPeriod?.end || '');
  const [pickup, setPickup] = useState<ParkPickup>(initialPeriod?.pickup || initialPickup || { time: '', location: 'airport', address: '', return_location: 'airport', return_address: '' });
  const [quote, setQuote] = useState<ParkQuote | null>(null);
  const [booking, setBooking] = useState<ParkBooking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [copied, setCopied] = useState(false);
  const [contact, setContact] = useState<ParkContact>({ channel: window.Telegram?.WebApp?.initData ? 'whatsapp' : 'phone', value: '' });
  const [contactError, setContactError] = useState('');
  const requestId = useRef('');
  const active = useRef<AbortController | null>(null);
  const connected = Boolean(window.Telegram?.WebApp?.initData);
  const period = () => ({ tenant_id: tenantId, asset_id: assetId, start_date: start, end_date: end, pickup, init_data: window.Telegram?.WebApp?.initData || '' });
  useEffect(() => {
    const controller = new AbortController();
    if (initialPeriod?.start && initialPeriod.end && initialPeriod.pickup && validParkPickup(initialPeriod.pickup) && validParkReturn(initialPeriod.pickup)) {
      active.current = controller;
      setBusy(true);
      quoteParkBooking({ tenant_id: tenantId, asset_id: assetId, start_date: initialPeriod.start, end_date: initialPeriod.end, pickup: initialPeriod.pickup, init_data: window.Telegram?.WebApp?.initData || '' }, controller.signal)
        .then((result) => { if (!controller.signal.aborted) setQuote(result); })
        .catch((failure) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : parkText("Не удалось получить расчёт.")); })
        .finally(() => { if (active.current === controller) active.current = null; if (!controller.signal.aborted) setBusy(false); });
    }
    return () => { controller.abort(); active.current?.abort(); active.current = null; };
  }, [tenantId, assetId, connected, initialPeriod?.start, initialPeriod?.end, initialPeriod?.pickup]);
  const calculate = async (event: FormEvent) => {
    if (active.current) { event.preventDefault(); return; }
    event.preventDefault();
    if (!validParkPickup(pickup) || !validParkReturn(pickup)) { setError(pt("Укажите корректное время получения и возврата. Адреса — до 500 символов, можно оставить пустыми.")); return; }
    const controller = new AbortController(); active.current = controller;
    setBusy(true); setError(''); setQuote(null);
    try { const result = await quoteParkBooking(period(), controller.signal); if (!controller.signal.aborted) { setQuote(result); requestId.current = ''; } }
    catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : pt("Не удалось получить расчёт.")); }
    finally { if (active.current === controller) active.current = null; if (!controller.signal.aborted) setBusy(false); }
  };
  const submit = async () => {
    if (!quote || busy || active.current) return;
    if (quote.customer_name_required && !customerName.trim()) { setError(pt("Укажите имя клиента.")); return; }
    const number = contact.value.replace(/[ ()-]/g, '');
    if (quote.requires_contact && !/^\+[1-9][0-9]{6,14}$/.test(number)) { setContactError(pt("Укажите номер с кодом страны: + и от 7 до 15 цифр.")); return; }
    const controller = new AbortController(); active.current = controller;
    setBusy(true); setError('');
    if (!requestId.current) requestId.current = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
    try { const result = await submitParkBooking(period(), quote.quote_token, requestId.current, controller.signal, quote.requires_contact ? { ...contact, value: number, consent: true } : undefined, customerName.trim()); if (!controller.signal.aborted) { setBooking(result); onCreated?.(result); } }
    catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : pt("Не удалось отправить заявку. Повторите с тем же расчётом.")); }
    finally { if (active.current === controller) active.current = null; if (!controller.signal.aborted) setBusy(false); }
  };
  const change = (value: string, field: 'start' | 'end') => { if (field === 'start') setStart(value); else setEnd(value); setQuote(null); setError(''); };
  if (booking) return <div role="status" className="space-y-3 border-t pt-4"><h3 className="flex items-center gap-2 text-lg font-semibold"><CalendarCheck aria-hidden="true" className="size-5 text-emerald-700" />{pt("Заявка принята")}</h3><p className="flex items-start gap-2 rounded-lg bg-purple-50 p-3 text-sm leading-6 text-purple-950"><Clock3 aria-hidden="true" className="mt-1 size-4 shrink-0 text-purple-700" />{pt("Ожидает подтверждения парком — это ещё не подтверждённая бронь.")}</p><ParkQuoteSummary quote={{ ...booking.pricing, deposit: booking.deposit.amount, currency: booking.currency }} showNotice={false} /><p className="break-all rounded-lg bg-slate-100 p-3 text-sm font-medium text-slate-900">{pt("Номер: ")}{booking.booking_number || booking.id}</p><Button type="button" variant="outline" onClick={async () => {
    try { await navigator.clipboard.writeText(booking.booking_number || booking.id); setCopied(true); } catch { setError(pt("Копирование недоступно. Выделите номер заявки вручную.")); }
  }}>{copied ? pt("Номер скопирован") : pt("Скопировать номер заявки")}</Button><p className="text-sm text-slate-600">{pt("Заявка появилась в календаре парка. Уведомления в чате пока не подключены.")}</p>{error && <p role="alert" className="text-sm text-rose-800">{pt(error)}</p>}</div>;
  return <form onSubmit={event => { if (quote) { event.preventDefault(); void submit(); } else void calculate(event); }} aria-busy={busy} className="space-y-4 border-t pt-4">
    <h3 className="flex items-center gap-2 text-lg font-semibold"><CalendarCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-700" />{quote ? pt("Проверьте заявку") : pt("Проверка дат и цены")}</h3>
    {!connected && <p className="text-sm leading-6 text-slate-600">{pt("Заявку можно отправить без регистрации и Telegram. Укажите имя и контакт после проверки стоимости.")}</p>}
    {!quote && <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
      <div><label htmlFor={`${id}-start`} className="block text-sm font-medium">{pt("Получение")}</label><ParkDateField id={`${id}-start`} required value={start} onChange={(event) => change(event.target.value, 'start')} className="mt-2" aria-describedby={`${id}-hint`} /></div>
      <div><label htmlFor={`${id}-end`} className="block text-sm font-medium">{pt("Возврат")}</label><ParkDateField id={`${id}-end`} required min={start || undefined} value={end} onChange={(event) => change(event.target.value, 'end')} className="mt-2" aria-describedby={`${id}-hint`} /></div>
    </fieldset>}
    {!quote && <ParkPickupFields id={`${id}-pickup`} pickup={pickup} currency={currency} disabled={busy} onChange={value => { setPickup(value); setQuote(null); setError(''); requestId.current = ''; }} />}
    <p id={`${id}-hint`} className="text-sm leading-6 text-slate-600">{pt("Позднее время возврата добавляет 1 сутки. Городское получение и возврат оплачиваются отдельно; депозит не входит в итог аренды и доставки.")}</p>
    {!quote ? <Button type="submit" variant="outline" className="min-h-11 gap-2" disabled={busy}>{busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <CalendarDays aria-hidden="true" className="h-4 w-4" />}{busy ? pt("Проверяем…") : pt("Проверить даты и цену")}</Button> : <Button type="button" variant="outline" className="min-h-11 gap-2" disabled={busy} onClick={() => { setQuote(null); setError(''); requestId.current = ''; onEditPickup?.({ start, end, pickup }); }}><Pencil aria-hidden="true" className="h-4 w-4" />{pt("Изменить даты и получение")}</Button>}
    {quote && <><ParkQuoteSummary quote={quote} />{quote.customer_name_required && <div><label htmlFor={`${id}-customer-name`} className="block text-sm font-medium">{pt("Имя клиента")}</label><Input id={`${id}-customer-name`} required disabled={busy} maxLength={160} autoComplete="name" value={customerName} onChange={event => setCustomerName(event.target.value)} className="mt-2 min-h-11 text-base" /></div>}{quote.requires_contact && <ParkContactFields id={id} browser={!connected} busy={busy} contact={contact} error={pt(contactError)} onChange={value => { setContact(value); setContactError(''); setError(''); }} />}<Button type="submit" className="min-h-12 w-full gap-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800" disabled={busy}>{busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Send aria-hidden="true" className="h-4 w-4" />}{busy ? pt("Отправляем…") : pt("Отправить заявку")}</Button></>}
    {error && <p role="alert" className="text-sm text-rose-800">{pt(error)}</p>}
  </form>;
}
