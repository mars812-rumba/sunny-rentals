import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchParkBotLink, ParkBooking, ParkQuote, quoteParkBooking, submitParkBooking } from '@/api/park-telegram';
import { dateLabel, ParkRentalPeriod, rentalMoney } from '@/lib/park-rental';

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
    const controller = new AbortController(); active.current = controller;
    setBusy(true); setError('');
    if (!requestId.current) requestId.current = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
    try { const result = await submitParkBooking(period(), quote.quote_token, requestId.current, controller.signal); if (!controller.signal.aborted) { setBooking(result); onCreated?.(); } }
    catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Не удалось отправить заявку. Повторите с тем же расчётом.'); }
    finally { if (active.current === controller) active.current = null; if (!controller.signal.aborted) setBusy(false); }
  };
  const change = (value: string, field: 'start' | 'end') => { if (field === 'start') setStart(value); else setEnd(value); setQuote(null); setError(''); };
  if (booking) return <div role="status" className="space-y-3 border-t pt-4"><h3 className="text-lg font-semibold">Заявка принята</h3><p>Ожидает подтверждения парком — это ещё не подтверждённая бронь.</p><p className="font-medium">{booking.pricing.asset_name}</p><p>{dateLabel(booking.pricing.start_date)} — {dateLabel(booking.pricing.end_date)}</p><p>Аренда: {rentalMoney(booking.pricing.total_rental, booking.currency)}</p><p>Возвратный депозит отдельно: {rentalMoney(booking.deposit.amount, booking.currency)}</p><p className="break-all text-sm">Номер: {booking.id}</p><Button type="button" variant="outline" onClick={async () => {
    try { await navigator.clipboard.writeText(booking.id); setCopied(true); } catch { setError('Копирование недоступно. Выделите номер заявки вручную.'); }
  }}>{copied ? 'Номер скопирован' : 'Скопировать номер заявки'}</Button><p className="text-sm text-slate-600">Заявка появилась в календаре парка. Уведомления в чате пока не подключены.</p>{error && <p role="alert" className="text-sm text-rose-800">{error}</p>}</div>;
  return <form onSubmit={calculate} aria-busy={busy} className="space-y-4 border-t pt-4">
    <h3 className="text-lg font-semibold">{quote ? 'Подтвердите заявку' : 'Проверка дат и цены'}</h3>
    {!connected && <div><p className="text-sm leading-6 text-slate-600">Чтобы отправить заявку, откройте витрину из сообщения бота парка. Каталог и наличие доступны без входа.</p>{link && <Button asChild variant="outline" className="mt-3"><a href={link} target="_blank" rel="noopener noreferrer">Открыть бота парка</a></Button>}</div>}
    {!quote && <fieldset disabled={busy || !connected} className="grid gap-3 sm:grid-cols-2">
      <div><label htmlFor={`${id}-start`} className="block text-sm font-medium">Получение</label><Input id={`${id}-start`} type="date" required value={start} onChange={(event) => change(event.target.value, 'start')} className="mt-2 text-base" aria-describedby={`${id}-hint`} /></div>
      <div><label htmlFor={`${id}-end`} className="block text-sm font-medium">Возврат</label><Input id={`${id}-end`} type="date" required min={start || undefined} value={end} onChange={(event) => change(event.target.value, 'end')} className="mt-2 text-base" aria-describedby={`${id}-hint`} /></div>
    </fieldset>}
    <p id={`${id}-hint`} className="text-sm leading-6 text-slate-600">Полные сутки, без времени и доставки. День возврата не оплачивается. Депозит указан отдельно от аренды.</p>
    {!quote ? <Button type="submit" variant="outline" disabled={busy || !connected}>{busy ? 'Проверяем…' : 'Проверить даты и цену'}</Button> : <Button type="button" variant="ghost" disabled={busy} onClick={() => { setQuote(null); setError(''); }}>Изменить даты</Button>}
    {quote && <div className="space-y-3" role="status"><p className="font-medium">{quote.asset_name}</p><p>{dateLabel(quote.start_date)} — {dateLabel(quote.end_date)}</p><dl className="space-y-2 tabular-nums"><div className="flex flex-wrap justify-between gap-2"><dt>{rentalMoney(quote.daily_rate, quote.currency)} × {quote.days} суток</dt><dd className="font-semibold">{rentalMoney(quote.total_rental, quote.currency)}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt>Возвратный депозит отдельно</dt><dd>{rentalMoney(quote.deposit, quote.currency)}</dd></div></dl><p className="text-sm leading-6 text-slate-600">Часовой пояс: {quote.timezone}. Наличие и цена повторно проверяются при отправке. Заявку должен подтвердить парк.</p><Button type="button" className="min-h-12 w-full rounded-xl" disabled={busy} onClick={() => void submit()}>{busy ? 'Отправляем…' : 'Отправить заявку'}</Button></div>}
    {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
  </form>;
}
