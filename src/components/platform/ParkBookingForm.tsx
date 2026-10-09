import { FormEvent, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ParkBooking, ParkQuote, quoteParkBooking, submitParkBooking } from '@/api/park-telegram';

export function ParkBookingForm({ tenantId, assetId }: { tenantId: string; assetId: string }) {
  const id = useId();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [quote, setQuote] = useState<ParkQuote | null>(null);
  const [booking, setBooking] = useState<ParkBooking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef('');
  const connected = Boolean(window.Telegram?.WebApp?.initData);
  const period = () => ({ tenant_id: tenantId, asset_id: assetId, start_date: start, end_date: end, init_data: window.Telegram?.WebApp?.initData || '' });
  const calculate = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setQuote(null);
    try { setQuote(await quoteParkBooking(period())); requestId.current = ''; }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Не удалось получить расчёт.'); }
    finally { setBusy(false); }
  };
  const submit = async () => {
    if (!quote || busy) return;
    setBusy(true); setError('');
    if (!requestId.current) requestId.current = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
    try { setBooking(await submitParkBooking(period(), quote.quote_token, requestId.current)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Не удалось отправить заявку. Повторите с тем же расчётом.'); }
    finally { setBusy(false); }
  };
  const change = (value: string, field: 'start' | 'end') => { if (field === 'start') setStart(value); else setEnd(value); setQuote(null); setError(''); };
  if (booking) return <div role="status" className="space-y-2 border-t pt-4"><h3 className="font-semibold">Заявка принята — ожидает подтверждения</h3><p className="break-all text-sm">Номер: {booking.id}</p><p>{booking.pricing.start_date} — {booking.pricing.end_date}</p><p>Аренда: {booking.pricing.total_rental} {booking.currency} · депозит: {booking.deposit.amount} {booking.currency}</p><p className="text-sm text-slate-600">Заявка появилась в календаре парка. Уведомления в чате пока не подключены.</p></div>;
  return <form onSubmit={calculate} aria-busy={busy} className="space-y-4 border-t pt-4">
    <h3 className="font-semibold">Заявка на аренду</h3>
    {!connected && <p className="text-sm text-slate-600">Для заявки откройте эту витрину через бота парка. Кнопка входа находится над каталогом.</p>}
    <fieldset disabled={busy || !connected} className="grid gap-3 sm:grid-cols-2">
      <div><label htmlFor={`${id}-start`} className="block text-sm font-medium">Получение</label><Input id={`${id}-start`} type="date" required value={start} onChange={(event) => change(event.target.value, 'start')} className="mt-2 text-base" aria-describedby={`${id}-hint`} /></div>
      <div><label htmlFor={`${id}-end`} className="block text-sm font-medium">Возврат</label><Input id={`${id}-end`} type="date" required min={start || undefined} value={end} onChange={(event) => change(event.target.value, 'end')} className="mt-2 text-base" aria-describedby={`${id}-hint`} /></div>
    </fieldset>
    <p id={`${id}-hint`} className="text-sm text-slate-600">Первый режим: полные сутки, без времени и доставки. День возврата не оплачивается. Депозит указан отдельно от аренды.</p>
    <Button type="submit" variant="outline" disabled={busy || !connected}>{busy ? 'Проверяем…' : 'Проверить даты и цену'}</Button>
    {quote && <div className="space-y-2" role="status"><p className="font-medium tabular-nums">{quote.daily_rate} {quote.currency} × {quote.days} суток = {quote.total_rental} {quote.currency}</p><p>Депозит: {quote.deposit} {quote.currency}</p><p className="text-sm text-slate-600">Часовой пояс парка: {quote.timezone}. Наличие повторно проверяется при отправке.</p><Button type="button" disabled={busy} onClick={() => void submit()}>Отправить заявку</Button></div>}
    {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
  </form>;
}
