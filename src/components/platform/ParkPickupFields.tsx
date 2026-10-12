import { Clock3, MapPin, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { type ParkPickup, pickupLabels } from '@/lib/park-pickup';
import { rentalMoney } from '@/lib/park-rental';

export function ParkPickupFields({ id, pickup, onChange, currency = 'THB', disabled = false }: {
  id: string; pickup: ParkPickup; onChange: (pickup: ParkPickup) => void; currency?: string; disabled?: boolean;
}) {
  return <fieldset disabled={disabled} className="grid min-w-0 gap-4 sm:grid-cols-2"><legend className="sr-only">Получение транспорта</legend>
    <div><label htmlFor={`${id}-time`} className="flex items-center gap-2 text-sm font-medium"><Clock3 aria-hidden="true" className="size-4" />Время получения</label><Input id={`${id}-time`} type="time" required step="60" value={pickup.time} onChange={event => onChange({ ...pickup, time: event.target.value })} className="mt-2 min-h-12 min-w-0 text-base" aria-describedby={`${id}-time-hint`} /><p id={`${id}-time-hint`} className="mt-2 text-xs text-slate-600">Возврат в то же время на выбранную дату. Время местное, по часовому поясу парка.</p></div>
    <div><label htmlFor={`${id}-location`} className="flex items-center gap-2 text-sm font-medium"><MapPin aria-hidden="true" className="size-4" />Место получения</label><select id={`${id}-location`} required value={pickup.location} onChange={event => { const location = event.target.value as ParkPickup['location']; onChange({ ...pickup, location, address: location === 'city' ? pickup.address : '' }); }} className="mt-2 min-h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-base"><option value="airport">Аэропорт — 0 THB</option><option value="city" disabled={currency !== 'THB'}>Город — 500 THB</option><option value="self_pickup">Самовывоз — 0 THB</option></select>{currency !== 'THB' && <p className="mt-2 text-xs text-slate-600">Городская доставка доступна для парков с валютой THB.</p>}</div>
    {pickup.location === 'city' && <div className="sm:col-span-2"><label htmlFor={`${id}-address`} className="block text-sm font-medium">Название отеля или адрес (необязательно)</label><Input id={`${id}-address`} maxLength={500} autoComplete="street-address" value={pickup.address} onChange={event => onChange({ ...pickup, address: event.target.value })} className="mt-2 min-h-12 text-base" /></div>}
  </fieldset>;
}

export function ParkPickupSummary({ pickup, deliveryFee, total, currency }: { pickup?: ParkPickup; deliveryFee?: string; total?: string; currency: string }) {
  if (!pickup) return null;
  return <div className="space-y-2 text-sm text-slate-700"><p className="flex items-start gap-2"><Clock3 aria-hidden="true" className="size-4 shrink-0" />Получение: {pickup.time} · Возврат: {pickup.time}</p><p className="flex items-start gap-2"><MapPin aria-hidden="true" className="size-4 shrink-0" />{pickupLabels[pickup.location]}</p>{pickup.location === 'city' && <p className="whitespace-pre-wrap break-words">{pickup.address.trim() ? `Адрес: ${pickup.address}` : 'Адрес не указан'}</p>}{deliveryFee !== undefined && <p className="flex items-start gap-2 tabular-nums"><Truck aria-hidden="true" className="size-4 shrink-0" />Доставка: {rentalMoney(deliveryFee, currency)}</p>}{total !== undefined && <p className="font-semibold tabular-nums text-blue-700">Итого аренда и доставка: {rentalMoney(total, currency)}</p>}</div>;
}
