import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { CalendarCheck, LockKeyhole, Loader2, X } from 'lucide-react';
import type { PlatformAsset } from '@/api/platform-admin';
import { createParkManualBooking, ParkBooking, ParkManualInput } from '@/api/park-telegram';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { rentalDays, rentalMoney } from '@/lib/park-rental';

export function ParkManualBookingForm({ tenantId, assets, admin, initialDay = '', initialAssetId = '', onSaved, onClose }: {
  tenantId: string; assets: PlatformAsset[]; admin: boolean; initialDay?: string; initialAssetId?: string;
  onSaved: (booking: ParkBooking) => void; onClose: () => void;
}) {
  const id = useId();
  const first = assets.find(asset => asset.id === initialAssetId) || assets[0];
  const [assetId, setAssetId] = useState(first?.id || '');
  const [kind, setKind] = useState<'rental' | 'block'>('rental');
  const [start, setStart] = useState(initialDay);
  const [end, setEnd] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [rate, setRate] = useState(String(first?.pricing.daily_rate || ''));
  const [deposit, setDeposit] = useState(String(first?.deposit_policy.amount || 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const active = useRef<AbortController | null>(null);
  const pending = useRef<{ fingerprint: string; requestId: string } | null>(null);
  useEffect(() => { heading.current?.focus(); return () => active.current?.abort(); }, []);
  const asset = assets.find(item => item.id === assetId);
  const days = rentalDays({ start, end });
  const fieldError = (field: string) => ({ 'aria-invalid': !!errors[field], 'aria-describedby': errors[field] ? `${id}-${field}-error` : `${id}-hint` });
  const errorText = (field: string) => errors[field] && <p id={`${id}-${field}-error`} className="mt-1 text-sm text-rose-800">{errors[field]}</p>;
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (active.current) return;
    const invalid: Record<string, string> = {};
    if (!asset) invalid.asset = 'Выберите машину этого парка.';
    if (!Number.isInteger(days) || days < 1 || days > 365) invalid.dates = 'Выберите корректные даты: от 1 до 365 суток.';
    if (kind === 'rental') {
      if (!name.trim()) invalid.name = 'Укажите имя клиента.';
      if (!rate.trim() || !Number.isFinite(Number(rate)) || Number(rate) <= 0 || Number(rate) > 100000000) invalid.rate = 'Ставка должна быть положительной, не больше 100 000 000.';
      if (!deposit.trim() || !Number.isFinite(Number(deposit)) || Number(deposit) < 0 || Number(deposit) > 100000000) invalid.deposit = 'Депозит — от 0 до 100 000 000.';
    } else if (!note.trim()) invalid.note = 'Укажите причину блокировки.';
    setErrors(invalid); setError('');
    if (Object.keys(invalid).length) { setError('Исправьте отмеченные поля.'); return; }
    const data = { asset_id: assetId, start_date: start, end_date: end, entry_type: kind,
      customer_name: kind === 'rental' ? name.trim() : '', note: note.trim(),
      ...(kind === 'rental' ? { daily_rate: rate.trim(), deposit: deposit.trim() } : {}) };
    const fingerprint = JSON.stringify(data);
    if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint,
      requestId: Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('') };
    const controller = new AbortController(); active.current = controller; setBusy(true);
    try {
      const result = await createParkManualBooking(tenantId, { ...data, request_id: pending.current.requestId } as ParkManualInput, admin, controller.signal);
      if (!controller.signal.aborted) onSaved(result);
    } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Не удалось сохранить запись. Повторите попытку.'); }
    finally { active.current = null; if (!controller.signal.aborted) setBusy(false); }
  };
  return <form onSubmit={event => void save(event)} noValidate aria-busy={busy} aria-labelledby={`${id}-title`} className="mt-5 rounded-xl bg-slate-50 p-4 sm:p-5">
    <h3 id={`${id}-title`} tabIndex={-1} ref={heading} className="text-lg font-semibold focus:outline-none">Добавить запись в календарь</h3>
    <p id={`${id}-hint`} className="mt-2 text-sm leading-6 text-slate-600">Даты относятся к часовому поясу парка. День окончания свободен. Аренда сразу подтверждается; блокировка закрывает даты без оплаты.</p>
    <fieldset disabled={busy} className="mt-4 space-y-4">
      <legend className="sr-only">Параметры календарной записи</legend>
      <div><Label htmlFor={`${id}-kind`}>Тип записи</Label><select id={`${id}-kind`} value={kind} onChange={event => { setKind(event.target.value as 'rental' | 'block'); setErrors({}); setError(''); }} className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base"><option value="rental">Ручная аренда</option><option value="block">Блокировка / обслуживание</option></select></div>
      <div><Label htmlFor={`${id}-asset`}>Машина</Label><select id={`${id}-asset`} required value={assetId} {...fieldError('asset')} onChange={event => { const next = assets.find(item => item.id === event.target.value); setAssetId(event.target.value); setRate(String(next?.pricing.daily_rate || '')); setDeposit(String(next?.deposit_policy.amount || 0)); }} className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base">{assets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{errorText('asset')}</div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor={`${id}-start`}>Начало</Label><Input id={`${id}-start`} type="date" required value={start} onChange={event => setStart(event.target.value)} {...fieldError('dates')} className="mt-2 text-base" /></div><div><Label htmlFor={`${id}-end`}>Окончание</Label><Input id={`${id}-end`} type="date" required value={end} min={start || undefined} onChange={event => setEnd(event.target.value)} {...fieldError('dates')} className="mt-2 text-base" /></div></div>{errorText('dates')}
      {kind === 'rental' && <>
        <div><Label htmlFor={`${id}-name`}>Имя клиента</Label><Input id={`${id}-name`} required maxLength={160} value={name} onChange={event => setName(event.target.value)} {...fieldError('name')} className="mt-2 text-base" />{errorText('name')}</div>
        <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor={`${id}-rate`}>Ставка за сутки ({asset?.pricing.currency || 'валюта парка'})</Label><Input id={`${id}-rate`} required type="number" inputMode="decimal" min="0.01" max="100000000" step="0.01" value={rate} onChange={event => setRate(event.target.value)} {...fieldError('rate')} className="mt-2 text-base" />{errorText('rate')}</div><div><Label htmlFor={`${id}-deposit`}>Возвратный депозит отдельно</Label><Input id={`${id}-deposit`} required type="number" inputMode="decimal" min="0" max="100000000" step="0.01" value={deposit} onChange={event => setDeposit(event.target.value)} {...fieldError('deposit')} className="mt-2 text-base" />{errorText('deposit')}</div></div>
        {Number.isInteger(days) && days > 0 && days <= 365 && Number(rate) > 0 && <p className="text-sm tabular-nums">Предварительно: {days} суток · {rentalMoney((Number(rate) * days).toFixed(2), asset?.pricing.currency || '')}. Итог проверяется сервером; ставка машины на витрине не меняется.</p>}
      </>}
      <div><Label htmlFor={`${id}-note`}>{kind === 'block' ? 'Причина блокировки' : 'Внутренняя заметка (необязательно)'}</Label><Textarea id={`${id}-note`} required={kind === 'block'} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} {...fieldError('note')} className="mt-2 text-base" />{errorText('note')}</div>
      <div className="flex flex-wrap gap-3"><Button type="submit" className="min-h-11 gap-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800" disabled={!assets.length}>{busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : kind === 'block' ? <LockKeyhole aria-hidden="true" className="h-4 w-4" /> : <CalendarCheck aria-hidden="true" className="h-4 w-4" />}{busy ? 'Сохраняем…' : kind === 'block' ? 'Закрыть даты' : 'Создать подтверждённую бронь'}</Button><Button type="button" variant="outline" className="min-h-11 gap-2 rounded-lg" onClick={onClose}><X aria-hidden="true" className="h-4 w-4" />Отмена</Button></div>
    </fieldset>
    {error && <div className="mt-3"><p role="alert" className="text-sm text-rose-800">{error}</p><p className="mt-2 text-sm text-slate-600">При потере ответа повторите без изменения полей — новая копия не создастся. Перед созданием другой записи сначала проверьте календарь.</p></div>}
    {busy && <p role="status" className="mt-3 text-sm">Проверяем даты и сохраняем запись…</p>}
  </form>;
}
