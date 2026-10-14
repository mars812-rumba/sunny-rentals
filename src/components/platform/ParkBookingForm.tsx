import { parkText } from '@/lib/park-locale';
import { parkText as pt } from '@/lib/park-locale';
import { useParkLocale } from '@/contexts/park-locale';
import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Banknote, CalendarCheck, CalendarDays, CarFront, Clock3, Info, Loader2, MessageCircle, Send, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ParkBooking, ParkContact, ParkQuote, type ParkCatalogRentalPrice, fetchParkAvailability, quoteParkBooking, submitParkBooking } from '@/api/park-telegram';
import { dateLabel, ParkRentalPeriod, rentalMoney } from '@/lib/park-rental';
import { ParkTariffBreakdown } from './ParkTariffBreakdown';
import { ParkPickupFields, ParkPickupSummary } from './ParkPickupFields';
import { type ParkPickup } from '@/lib/park-pickup';
import { ParkDateField } from './ParkDateField';
import { bookingCalculationMode, scheduleBookingCalculation } from '@/lib/booking-calculation';
import { catalogRentalPrice } from '@/lib/catalog-rental-price';
import { ParkCatalogPrice } from './ParkCatalogPrice';
import type { StorefrontAsset } from '@/api/storefront';
import { useParkFormSheetSaving, useParkFormSheetSaved } from './park-form-sheet-context';

export function ParkRentalEstimate({ rental, period }: { rental: ParkCatalogRentalPrice; period: ParkRentalPeriod }) {
  const { pt } = useParkLocale();
  return <div className="space-y-3">
    <p className="text-sm text-slate-600">{dateLabel(period.start)} — {dateLabel(period.end)} · {rental.days} {pt(' суток', [rental.days])}</p>
    <dl className="grid min-w-0 gap-2 sm:grid-cols-2 tabular-nums">
      <div className="min-w-0 rounded-lg bg-emerald-50 p-3 text-emerald-950"><dt className="text-sm">{pt('Предварительная стоимость аренды')}</dt><dd className="mt-2 break-words text-3xl font-bold text-emerald-800">{rentalMoney(rental.total_rental, rental.currency)}</dd></div>
      <div className="min-w-0 rounded-lg bg-amber-50 p-3 text-amber-950"><dt className="text-sm">{pt('Возвратный депозит отдельно')}</dt><dd className="mt-2 break-words text-xl font-semibold">{rentalMoney(rental.deposit, rental.currency)}</dd></div>
    </dl>
    <p className="text-sm leading-6 text-slate-600">{pt('Аренда без доставки. Укажите время получения и возврата для точного расчёта.')}</p>
  </div>;
}

export function ParkQuoteSummary({ quote, showNotice = true }: { quote: Omit<ParkQuote, 'asset_id' | 'quote_token'>; showNotice?: boolean }) {
  const { pt, intlLocale } = useParkLocale();
  return <div className="space-y-4" role="status">
    <p className="flex items-start gap-2 break-words font-semibold"><CarFront aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />{quote.asset_name}</p>
    <section className="space-y-2 rounded-lg bg-slate-100 p-3 text-slate-900"><h4 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays aria-hidden="true" className="size-4 shrink-0 text-slate-600" />{pt('Период аренды')}</h4><p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium"><span>{dateLabel(quote.start_date)}</span><span>—</span><span>{dateLabel(quote.end_date)}</span></p><p className="text-sm">{quote.days} {pt(' суток', [quote.days])}</p></section>
    <dl className="grid min-w-0 gap-2 sm:grid-cols-2 tabular-nums">
      <div className="min-w-0 rounded-lg bg-emerald-50 p-3 text-emerald-950"><dt className="flex items-start gap-2 text-sm"><Banknote aria-hidden="true" className="size-4 shrink-0 text-emerald-700" /><span>{pt("Аренда")}<br />{quote.tariff_breakdown?.length ? pt("По сезонной сетке") : pt("{0} × {1} суток", [rentalMoney(quote.daily_rate, quote.currency), quote.days])}</span></dt><dd className="mt-2 break-words text-3xl font-bold text-emerald-800">{rentalMoney(quote.total_rental, quote.currency)}</dd></div>
      <div className="min-w-0 rounded-lg bg-amber-50 p-3 text-amber-950"><dt className="flex items-start gap-2 text-sm"><WalletCards aria-hidden="true" className="size-4 shrink-0 text-amber-700" />{pt("Возвратный депозит отдельно")}</dt><dd className="mt-2 break-words text-xl font-semibold">{rentalMoney(quote.deposit, quote.currency)}</dd></div>
    </dl>
    <ParkTariffBreakdown items={quote.tariff_breakdown} currency={quote.currency} />
    <ParkPickupSummary pickup={quote.pickup} deliveryFee={quote.delivery_fee} returnFee={quote.return_fee} extraDay={quote.extra_day} total={quote.total_payable} currency={quote.currency} />
    <p className="flex items-center gap-2 break-all text-xs text-slate-600"><Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" />{pt("Часовой пояс: ")}{quote.timezone}</p>
    {showNotice && <p className="flex items-start gap-2 rounded-lg bg-slate-100 p-3 text-sm leading-6 text-slate-900"><Info aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-slate-600" />{pt("Наличие и цена повторно проверяются при отправке. Заявку должен подтвердить парк.")}</p>}
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

export function ParkBookingForm({ tenantId, assetId, initialPeriod, initialPickup, initialRental, asset, onCreated, currency = 'THB' }: { tenantId: string; assetId: string; initialPeriod?: ParkRentalPeriod | null; initialPickup?: ParkPickup; initialRental?: ParkCatalogRentalPrice; asset?: StorefrontAsset; onCreated?: (booking: ParkBooking) => void; currency?: string }) {
  const { pt, intlLocale } = useParkLocale();
  const id = useId();
  const [start, setStart] = useState(initialPeriod?.start || '');
  const [end, setEnd] = useState(initialPeriod?.end || '');
  const [pickup, setPickup] = useState<ParkPickup>(initialPeriod?.pickup || initialPickup || { time: '', location: 'airport', address: '', return_location: 'airport', return_address: '' });
  const [quoteResult, setQuoteResult] = useState<{ key: string; value: ParkQuote } | null>(null);
  const [estimate, setEstimate] = useState<{ rental: ParkCatalogRentalPrice; period: ParkRentalPeriod } | null>(initialRental && initialPeriod ? { rental: initialRental, period: initialPeriod } : null);
  const [checking, setChecking] = useState(false);
  const [checkedKey, setCheckedKey] = useState('');
  const [failedKey, setFailedKey] = useState('');
  const [retry, setRetry] = useState(0);
  const [booking, setBooking] = useState<ParkBooking | null>(null);
  const [busy, setBusy] = useState(false);
  useParkFormSheetSaving(busy);
  const markSaved = useParkFormSheetSaved();
  const [error, setError] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [copied, setCopied] = useState(false);
  const [contact, setContact] = useState<ParkContact>({ channel: window.Telegram?.WebApp?.initData ? 'whatsapp' : 'phone', value: '' });
  const [contactError, setContactError] = useState('');
  const requestId = useRef('');
  const active = useRef<AbortController | null>(null);
  const connected = Boolean(window.Telegram?.WebApp?.initData);
  const currentPeriod = { start, end, pickup };
  const mode = bookingCalculationMode(currentPeriod);
  const calculationKey = JSON.stringify({ tenantId, assetId, start, end, pickup, connected, retry });
  const quote = quoteResult?.key === calculationKey && mode === 'quote' && checkedKey === calculationKey && failedKey !== calculationKey ? quoteResult.value : null;
  const updating = mode !== 'invalid' && (checking || checkedKey !== calculationKey);
  const period = () => ({ tenant_id: tenantId, asset_id: assetId, start_date: start, end_date: end, pickup, init_data: window.Telegram?.WebApp?.initData || '' });
  useEffect(() => {
    requestId.current = '';
    setError(''); setCheckedKey(''); setFailedKey('');
    if (mode === 'invalid') { setChecking(false); return; }
    setChecking(true);
    return scheduleBookingCalculation(async signal => {
      if (mode === 'quote') return { quote: await quoteParkBooking({ tenant_id: tenantId, asset_id: assetId, start_date: start, end_date: end, pickup, init_data: window.Telegram?.WebApp?.initData || '' }, signal) };
      // Incomplete clocks are not an exact occupancy interval; estimate by dates only.
      const availability = await fetchParkAvailability(tenantId, start, end, signal);
      const rental = catalogRentalPrice(availability, { start, end }, assetId);
      if (!rental) throw new Error(parkText('Автомобиль недоступен на выбранные даты. Выберите другой период.'));
      return { estimate: { rental, period: { start, end } } };
    }, result => {
      if ('quote' in result && result.quote) setQuoteResult({ key: calculationKey, value: result.quote });
      else if ('estimate' in result && result.estimate) { setEstimate(result.estimate); setQuoteResult(null); }
    }, failure => { setFailedKey(calculationKey); setError(failure instanceof Error ? failure.message : parkText('Не удалось получить расчёт.')); },
    () => { setChecking(false); setCheckedKey(calculationKey); });
  }, [tenantId, assetId, start, end, pickup, connected, calculationKey, mode, retry]);
  useEffect(() => () => { active.current?.abort(); }, []);
  const submit = async () => {
    if (!quote || updating || busy || active.current) return;
    if (quote.customer_name_required && !customerName.trim()) { setError(pt("Укажите имя клиента.")); return; }
    const number = contact.value.replace(/[ ()-]/g, '');
    if (quote.requires_contact && !/^\+[1-9][0-9]{6,14}$/.test(number)) { setContactError(pt("Укажите номер с кодом страны: + и от 7 до 15 цифр.")); return; }
    const controller = new AbortController(); active.current = controller;
    setBusy(true); setError('');
    if (!requestId.current) requestId.current = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
    try { const result = await submitParkBooking(period(), quote.quote_token, requestId.current, controller.signal, quote.requires_contact ? { ...contact, value: number, consent: true } : undefined, customerName.trim()); if (!controller.signal.aborted) { markSaved?.(); setBooking(result); onCreated?.(result); } }
    catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : pt("Не удалось отправить заявку. Повторите с тем же расчётом.")); }
    finally { if (active.current === controller) active.current = null; if (!controller.signal.aborted) setBusy(false); }
  };
  const change = (value: string, field: 'start' | 'end') => { if (field === 'start') setStart(value); else setEnd(value); setError(''); };
  if (booking) return <div role="status" className="space-y-3 border-t pt-4"><h3 className="flex items-center gap-2 text-lg font-semibold"><CalendarCheck aria-hidden="true" className="size-5 text-emerald-700" />{pt("Заявка принята")}</h3><p className="flex items-start gap-2 rounded-lg bg-purple-50 p-3 text-sm leading-6 text-purple-950"><Clock3 aria-hidden="true" className="mt-1 size-4 shrink-0 text-purple-700" />{pt("Ожидает подтверждения парком — это ещё не подтверждённая бронь.")}</p><ParkQuoteSummary quote={{ ...booking.pricing, deposit: booking.deposit.amount, currency: booking.currency }} showNotice={false} /><p className="break-all rounded-lg bg-slate-100 p-3 text-sm font-medium text-slate-900">{pt("Номер: ")}{booking.booking_number || booking.id}</p><Button type="button" variant="outline" onClick={async () => {
    try { await navigator.clipboard.writeText(booking.booking_number || booking.id); setCopied(true); } catch { setError(pt("Копирование недоступно. Выделите номер заявки вручную.")); }
  }}>{copied ? pt("Номер скопирован") : pt("Скопировать номер заявки")}</Button><p className="text-sm text-slate-600">{pt("Заявка появилась в календаре парка. Уведомления в чате пока не подключены.")}</p>{error && <p role="alert" className="text-sm text-rose-800">{pt(error)}</p>}</div>;
  return <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit(); }} aria-busy={busy || checking} className="space-y-4 border-t pt-4">
    <h3 className="flex items-center gap-2 text-lg font-semibold"><CalendarCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-700" />{pt('Ваша аренда')}</h3>
    <div aria-describedby={`${id}-calculation-status`}>
      {quoteResult ? <ParkQuoteSummary quote={quoteResult.value} /> : estimate ? <ParkRentalEstimate {...estimate} /> : asset && !start && !end ? <ParkCatalogPrice asset={asset} currency={currency} selected={false} /> : null}
    </div>
    <p id={`${id}-calculation-status`} role="status" className="text-sm leading-6 text-slate-600">{updating ? pt('Обновляем стоимость и наличие… Предыдущая сумма ещё не подтверждена.') : error ? pt('Расчёт не подтверждён. Повторите попытку или измените параметры.') : mode === 'invalid' ? pt('Выберите корректные даты аренды.') : !quote ? pt('Укажите время получения и возврата для точного расчёта.') : pt('Расчёт актуален. Можно отправить заявку.')}</p>
    <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
      <div><label htmlFor={`${id}-start`} className="block text-sm font-medium">{pt("Получение")}</label><ParkDateField id={`${id}-start`} required value={start} onChange={(event) => change(event.target.value, 'start')} className="mt-2" aria-describedby={`${id}-hint`} /></div>
      <div><label htmlFor={`${id}-end`} className="block text-sm font-medium">{pt("Возврат")}</label><ParkDateField id={`${id}-end`} required min={start || undefined} value={end} onChange={(event) => change(event.target.value, 'end')} className="mt-2" aria-describedby={`${id}-hint`} /></div>
    </fieldset>
    <ParkPickupFields id={`${id}-pickup`} pickup={pickup} currency={currency} disabled={busy} onChange={value => { setPickup(value); setError(''); requestId.current = ''; }} />
    <p id={`${id}-hint`} className="text-sm leading-6 text-slate-600">{pt("Позднее время возврата добавляет 1 сутки. Городское получение и возврат оплачиваются отдельно; депозит не входит в итог аренды и доставки.")}</p>
    {quoteResult?.value.customer_name_required && <div><label htmlFor={`${id}-customer-name`} className="block text-sm font-medium">{pt("Имя клиента")}</label><Input id={`${id}-customer-name`} required disabled={busy} maxLength={160} autoComplete="name" value={customerName} onChange={event => setCustomerName(event.target.value)} className="mt-2 min-h-11 text-base" /></div>}
    {quoteResult?.value.requires_contact && <ParkContactFields id={id} browser={!connected} busy={busy} contact={contact} error={pt(contactError)} onChange={value => { setContact(value); setContactError(''); setError(''); }} />}
    <div className="park-sheet-actions"><Button type="submit" aria-describedby={`${id}-calculation-status`} className="min-h-12 w-full gap-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800" disabled={!quote || updating || busy}>{busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Send aria-hidden="true" className="h-4 w-4" />}{busy ? pt("Отправляем…") : pt("Отправить заявку")}</Button></div>
    {error && <Button type="button" variant="outline" className="min-h-11" disabled={updating || busy || mode === 'invalid'} onClick={() => setRetry(value => value + 1)}>{pt('Повторить расчёт')}</Button>}
    {error && <p role="alert" className="text-sm text-rose-800">{pt(error)}</p>}
  </form>;
}
