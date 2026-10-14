import { parkText as pt } from '@/lib/park-locale';
import { useParkLocale } from '@/contexts/park-locale';
import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Banknote, CalendarDays, CalendarCheck, CalendarClock, LockKeyhole, Loader2, UserRound, Truck, X } from 'lucide-react';
import type { PlatformAsset } from '@/api/platform-admin';
import { createParkManualBooking, ParkBooking, ParkManualInput } from '@/api/park-telegram';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { rentalDays, paidRentalDays, rentalMoney } from '@/lib/park-rental';
import { ParkDateField } from './ParkDateField';
import { ParkPickupFields } from './ParkPickupFields';
import { validParkPickup, validParkReturn, type ParkPickup } from '@/lib/park-pickup';
import { activeVehicleGrid } from '@/lib/vehicle-pricing';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ParkFormSheet, ParkFormSheetContent } from './ParkFormSheet';
import { useParkFormSheetSaving } from './park-form-sheet-context';

type ManualFormProps = {
  tenantId: string; assets: PlatformAsset[]; admin: boolean; initialDay?: string; initialAssetId?: string;
  onSaved: (booking: ParkBooking) => void; onClose: () => void;
};
export function ParkManualBookingForm(props: ManualFormProps) {
  const { pt } = useParkLocale();
  return <ParkFormSheet open onOpenChange={open => { if (!open) props.onClose(); }}><ParkFormSheetContent header={<><DialogTitle>{pt('Добавить запись в календарь')}</DialogTitle><DialogDescription className="mt-2">{pt('Время местное, по часовому поясу парка.')}</DialogDescription></>}><ParkManualBookingFields {...props} /></ParkFormSheetContent></ParkFormSheet>;
}

export function ParkManualBookingFields({ tenantId, assets, admin, initialDay = '', initialAssetId = '', onSaved, onClose }: ManualFormProps) {
  const { pt, intlLocale } = useParkLocale();
  const id = useId();
  const first = assets.find(asset => asset.id === initialAssetId) || assets[0];
  const [assetId, setAssetId] = useState(first?.id || '');
  const [kind, setKind] = useState<'rental' | 'block'>('rental');
  const [bookingStatus, setBookingStatus] = useState<'confirmed' | 'requested'>('confirmed');
  const [start, setStart] = useState(initialDay);
  const [end, setEnd] = useState('');
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<'phone' | 'whatsapp' | 'max'>('phone');
  const [contact, setContact] = useState('');
  const [pickup, setPickup] = useState<ParkPickup>({ time: '09:00', location: 'self_pickup', address: '', return_time: '09:00', return_location: 'self_pickup', return_address: '' });
  const [note, setNote] = useState('');
  const [rate, setRate] = useState(String(first?.pricing.daily_rate || ''));
  const [useTariffs, setUseTariffs] = useState(Boolean(first && activeVehicleGrid(first)));
  const [deposit, setDeposit] = useState(String(first?.deposit_policy.amount || 0));
  const [busy, setBusy] = useState(false);
  useParkFormSheetSaving(busy);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const active = useRef<AbortController | null>(null);
  const pending = useRef<{ fingerprint: string; requestId: string } | null>(null);
  useEffect(() => { heading.current?.focus(); return () => active.current?.abort(); }, []);
  const asset = assets.find(item => item.id === assetId);
  const days = kind === 'rental' ? paidRentalDays({ start, end, pickup }) : rentalDays({ start, end });
  const fieldError = (field: string) => ({ 'aria-invalid': !!errors[field], 'aria-describedby': errors[field] ? `${id}-${field}-error` : `${id}-hint` });
  const errorText = (field: string) => errors[field] && <p id={`${id}-${field}-error`} className="mt-1 text-sm text-rose-800">{pt(errors[field])}</p>;
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (active.current) return;
    const invalid: Record<string, string> = {};
    if (!asset) invalid.asset = pt("Выберите машину этого парка.");
    if (!Number.isInteger(days) || rentalDays({ start, end }) < 1 || days < 1 || days > 365) invalid.dates = pt("Выберите корректные даты: от 1 до 365 суток.");
    if (kind === 'rental') {
      if (!validParkPickup(pickup) || !validParkReturn(pickup)) invalid.pickup = pt('Укажите время получения и возврата.');
      if (contact.trim() && !/^\+[1-9][0-9]{6,14}$/.test(contact.replace(/[ ()-]/g, ''))) invalid.contact = pt('Укажите контакт с + и кодом страны или оставьте поле пустым.');
      if (!name.trim()) invalid.name = pt("Укажите имя клиента.");
      if (!useTariffs && (!rate.trim() || !Number.isFinite(Number(rate)) || Number(rate) <= 0 || Number(rate) > 100000000)) invalid.rate = pt("Ставка должна быть положительной, не больше 100 000 000.");
      if (!deposit.trim() || !Number.isFinite(Number(deposit)) || Number(deposit) < 0 || Number(deposit) > 100000000) invalid.deposit = pt("Депозит — от 0 до 100 000 000.");
    } else if (!note.trim()) invalid.note = pt("Укажите причину блокировки.");
    setErrors(invalid); setError('');
    if (Object.keys(invalid).length) { setError(pt("Исправьте отмеченные поля.")); return; }
    const data = { asset_id: assetId, start_date: start, end_date: end, entry_type: kind,
      booking_status: kind === 'block' ? 'confirmed' as const : bookingStatus,
      customer_name: kind === 'rental' ? name.trim() : '', note: note.trim(),
      ...(kind === 'rental' ? { ...(!useTariffs ? { daily_rate: rate.trim() } : {}), deposit: deposit.trim(), pickup, contact_channel: channel, contact_value: contact.replace(/[ ()-]/g, '') } : {}) };
    const fingerprint = JSON.stringify(data);
    if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint,
      requestId: Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('') };
    const controller = new AbortController(); active.current = controller; setBusy(true);
    try {
      const result = await createParkManualBooking(tenantId, { ...data, request_id: pending.current.requestId } as ParkManualInput, admin, controller.signal);
      if (!controller.signal.aborted) onSaved(result);
    } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : pt("Не удалось сохранить запись. Повторите попытку.")); }
    finally { active.current = null; if (!controller.signal.aborted) setBusy(false); }
  };
  return <form onSubmit={event => void save(event)} noValidate aria-busy={busy} aria-labelledby={`${id}-title`} className="space-y-4">
    <h3 id={`${id}-title`} tabIndex={-1} ref={heading} className="sr-only">{pt("Добавить запись в календарь")}</h3>
    <p id={`${id}-hint`} className="mt-2 text-sm leading-6 text-slate-600">{pt('Время местное, по часовому поясу парка.')}</p>
    <fieldset disabled={busy} className="mt-4 space-y-4">
      <legend className="sr-only">{pt("Параметры календарной записи")}</legend>
      <div><Label htmlFor={`${id}-kind`}>{pt("Тип записи")}</Label><select id={`${id}-kind`} value={kind} onChange={event => { setKind(event.target.value as 'rental' | 'block'); setErrors({}); setError(''); }} className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base"><option value="rental">{pt("Ручная аренда")}</option><option value="block">{pt("Блокировка / обслуживание")}</option></select></div>
      <div><Label htmlFor={`${id}-asset`}>{pt("Машина")}</Label><select id={`${id}-asset`} required value={assetId} {...fieldError('asset')} onChange={event => { const next = assets.find(item => item.id === event.target.value); setAssetId(event.target.value); setUseTariffs(Boolean(next && activeVehicleGrid(next))); setRate(String(next?.pricing.daily_rate || '')); setDeposit(String(next?.deposit_policy.amount || 0)); }} className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base">{assets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{errorText('asset')}</div>
      <section className="rounded-lg bg-slate-100 p-3 text-slate-900"><h4 className="mb-3 flex items-center gap-2 font-semibold"><CalendarDays aria-hidden="true" className="size-4" />{pt('Период аренды')}</h4><div className="grid min-w-0 grid-cols-2 gap-2"><div className="min-w-0"><Label htmlFor={`${id}-start`}>{pt("Начало")}</Label><ParkDateField id={`${id}-start`} required value={start} onChange={event => setStart(event.target.value)} {...fieldError('dates')} className="mt-2" /></div><div className="min-w-0"><Label htmlFor={`${id}-end`}>{pt("Окончание")}</Label><ParkDateField id={`${id}-end`} required value={end} min={start || undefined} onChange={event => setEnd(event.target.value)} {...fieldError('dates')} className="mt-2" /></div></div>{errorText('dates')}</section>
      {kind === 'rental' && <>
        <div><Label htmlFor={`${id}-status`} className="inline-flex items-center gap-2"><CalendarClock aria-hidden="true" className="h-4 w-4 text-slate-600" />{pt("Статус брони")}</Label><select id={`${id}-status`} value={bookingStatus} onChange={event => setBookingStatus(event.target.value as 'confirmed' | 'requested')} aria-describedby={`${id}-hint`} className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base"><option value="confirmed">{pt("Подтверждённая бронь")}</option><option value="requested">{pt("Предбронь — ожидает подтверждения")}</option></select></div>
        <section className="space-y-3 rounded-lg bg-slate-100 p-3 text-slate-900"><h4 className="flex items-center gap-2 font-semibold"><UserRound aria-hidden="true" className="size-4" />{pt('Клиент')}</h4><div><Label htmlFor={`${id}-name`}>{pt("Имя клиента")}</Label><Input id={`${id}-name`} required maxLength={160} value={name} onChange={event => setName(event.target.value)} {...fieldError('name')} className="mt-2 text-base" />{errorText('name')}</div><div className="grid grid-cols-2 gap-2"><div className="min-w-0"><Label htmlFor={`${id}-channel`}>{pt('Способ связи')}</Label><select id={`${id}-channel`} value={channel} onChange={event => setChannel(event.target.value as typeof channel)} className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-2 text-base"><option value="phone">{pt('Телефон')}</option><option value="whatsapp">WhatsApp</option><option value="max">MAX</option></select></div><div className="min-w-0"><Label htmlFor={`${id}-contact`}>{pt('Контакт (необязательно)')}</Label><Input id={`${id}-contact`} type="tel" autoComplete="tel" maxLength={32} value={contact} onChange={event => setContact(event.target.value)} {...fieldError('contact')} className="mt-2 text-base" />{errorText('contact')}</div></div></section>
        <section className="rounded-lg bg-slate-100 p-3 text-slate-900"><h4 className="mb-3 flex items-center gap-2 font-semibold"><Truck aria-hidden="true" className="size-4" />{pt('Получение и возврат транспорта')}</h4><ParkPickupFields id={`${id}-pickup`} pickup={pickup} onChange={setPickup} currency={asset?.pricing.currency || 'THB'} />{errorText('pickup')}</section>
        {asset && activeVehicleGrid(asset) && <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={useTariffs} onChange={event => setUseTariffs(event.target.checked)} className="mt-1 size-4 accent-blue-700" />{pt("Рассчитать аренду по тарифам автомобиля. Снимите отметку для ручной ставки.")}</label>}
        <section><h4 className="mb-3 flex items-center gap-2 font-semibold"><Banknote aria-hidden="true" className="size-4" />{pt('Стоимость')}</h4><div className="grid min-w-0 grid-cols-2 gap-2"><div className="min-w-0 rounded-lg bg-emerald-50 p-3 text-emerald-950"><Label htmlFor={`${id}-rate`}>{pt("Ручная ставка за сутки (")}{asset?.pricing.currency || pt("валюта парка")})</Label><Input id={`${id}-rate`} disabled={useTariffs} required={!useTariffs} type="number" inputMode="decimal" min="0.01" max="100000000" step="0.01" value={rate} onChange={event => setRate(event.target.value)} {...fieldError('rate')} className="mt-2 text-base" />{errorText('rate')}</div><div className="min-w-0 rounded-lg bg-amber-50 p-3 text-amber-950"><Label htmlFor={`${id}-deposit`}>{pt("Возвратный депозит отдельно")}</Label><Input id={`${id}-deposit`} required type="number" inputMode="decimal" min="0" max="100000000" step="0.01" value={deposit} onChange={event => setDeposit(event.target.value)} {...fieldError('deposit')} className="mt-2 text-base" />{errorText('deposit')}</div></div></section>
        {Number.isInteger(days) && days > 0 && days <= 365 && !useTariffs && Number(rate) > 0 && <p className="text-sm tabular-nums">{pt("Предварительно: ")}{days} {pt(" суток · ")}{rentalMoney((Number(rate) * days).toFixed(2), asset?.pricing.currency || '')}{pt(". Итог проверяется сервером; ставка машины на витрине не меняется.")}</p>}
        {useTariffs && <p className="text-sm leading-6 text-slate-600">{pt("Итог по тарифам будет рассчитан сервером при сохранении и показан в заявке. Депозит указывается отдельно.")}</p>}
        <dl className="space-y-2 text-sm tabular-nums"><div className="flex justify-between gap-3"><dt>{pt('Доставка')}</dt><dd>{rentalMoney(pickup.location === 'city' ? 500 : 0, asset?.pricing.currency || 'THB')}</dd></div><div className="flex justify-between gap-3"><dt>{pt('Возврат')}</dt><dd>{rentalMoney(pickup.return_location === 'city' ? 500 : 0, asset?.pricing.currency || 'THB')}</dd></div>{Number.isInteger(days) && days > 0 && days <= 365 && !useTariffs && Number(rate) > 0 && <div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-2 font-semibold text-emerald-800"><dt>{pt('Итого аренда и доставка')}</dt><dd>{rentalMoney((Number(rate) * days + (pickup.location === 'city' ? 500 : 0) + (pickup.return_location === 'city' ? 500 : 0)).toFixed(2), asset?.pricing.currency || 'THB')}</dd></div>}</dl>
      </>}
      <div><Label htmlFor={`${id}-note`}>{kind === 'block' ? pt("Причина блокировки") : pt("Внутренняя заметка (необязательно)")}</Label><Textarea id={`${id}-note`} required={kind === 'block'} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} {...fieldError('note')} className="mt-2 text-base" />{errorText('note')}</div>
      <div className="park-sheet-actions flex flex-wrap gap-3"><Button type="submit" className="min-h-11 gap-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800" disabled={!assets.length}>{busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : kind === 'block' ? <LockKeyhole aria-hidden="true" className="h-4 w-4" /> : bookingStatus === 'requested' ? <CalendarClock aria-hidden="true" className="h-4 w-4" /> : <CalendarCheck aria-hidden="true" className="h-4 w-4" />}{busy ? pt("Сохраняем…") : kind === 'block' ? pt("Закрыть даты") : bookingStatus === 'requested' ? pt("Создать предбронь") : pt("Создать подтверждённую бронь")}</Button><Button type="button" variant="outline" className="min-h-11 gap-2 rounded-lg" onClick={onClose}><X aria-hidden="true" className="h-4 w-4" />{pt("Отмена")}</Button></div>
    </fieldset>
    {error && <div className="mt-3"><p role="alert" className="text-sm text-rose-800">{pt(error)}</p><p className="mt-2 text-sm text-slate-600">{pt("При потере ответа повторите без изменения полей — новая копия не создастся. Перед созданием другой записи сначала проверьте календарь.")}</p></div>}
    {busy && <p role="status" className="mt-3 text-sm">{pt("Проверяем даты и сохраняем запись…")}</p>}
  </form>;
}
