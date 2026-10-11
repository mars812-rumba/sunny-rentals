import { FormEvent, useId, useState } from 'react';
import { CloudSun, FileText, Fuel, Save, Settings2, Sun, Users, WalletCards, Wrench, Zap } from 'lucide-react';
import type { PlatformAsset, TariffGrid, VehicleDetailsInput, VehicleSpecs } from '@/api/platform-admin';
import { savePlatformAssetDetails } from '@/api/platform-admin';
import { saveOwnerAssetDetails } from '@/api/park-owner-fleet';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { rentalMoney } from '@/lib/park-rental';

const tariffPeriods = [['price_1_6', '1–6 дней'], ['price_7_14', '7–14 дней'], ['price_15_29', '15–29 дней'], ['price_30', '30+ дней']] as const;
type Section = VehicleDetailsInput['section'];
const titles = { pricing: 'Тарифы', specs: 'Характеристики', description: 'Описание' };
const icons = { pricing: WalletCards, specs: Wrench, description: FileText };
const defaultGrid = (rate: number): TariffGrid => ({ low_season: { price_1_6: rate, price_7_14: rate, price_15_29: rate, price_30: rate }, high_season: { price_1_6: rate, price_7_14: rate, price_15_29: rate, price_30: rate }, high_start: '11-01', high_end: '03-31' });

export function VehicleSpecSummary({ specs, detailed = false }: { specs: VehicleSpecs; detailed?: boolean }) {
  const entries = [
    [Fuel, specs.fuel], [Settings2, specs.transmission], [Zap, specs.power && `Мощность: ${specs.power}`], [Wrench, specs.engine && `Двигатель: ${specs.engine}`],
    [Users, specs.seats ? `${specs.seats} мест` : ''],
  ] as const;
  return <><ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-700">{entries.filter(([, value]) => value).map(([Icon, value], index) => <li key={index} className="inline-flex items-center gap-1.5"><Icon aria-hidden="true" className="size-4 shrink-0" />{value}</li>)}</ul>{detailed && <ul className="mt-3 space-y-2 break-words text-sm text-slate-700">{[specs.drive && `Привод: ${specs.drive}`, specs.body_type && `Кузов: ${specs.body_type}`, specs.doors && `Двери: ${specs.doors}`, specs.mileage != null && `Пробег: ${specs.mileage.toLocaleString('ru-RU')} км`, specs.air_conditioning != null && `Кондиционер: ${specs.air_conditioning ? 'есть' : 'нет'}`, ...(specs.features || [])].filter(Boolean).map((value, index) => <li key={index}>{value}</li>)}</ul>}</>;
}

export function VehicleTariffTable({ grid, currency }: { grid: TariffGrid; currency: string }) {
  return <div className="space-y-3"><p className="text-sm text-slate-600">Цена за сутки. Высокий сезон: {grid.high_start} — {grid.high_end} (ММ-ДД), включительно.</p><div className="overflow-x-auto"><table className="w-full text-left text-sm tabular-nums"><caption className="sr-only">Тарифы по длительности аренды</caption><thead><tr className="border-b border-slate-200"><th className="py-2 pr-3">Период</th><th className="p-2">Низкий сезон</th><th className="p-2">Высокий сезон</th></tr></thead><tbody>{tariffPeriods.map(([key, label]) => <tr key={key} className="border-b border-slate-100"><th scope="row" className="py-2 pr-3 font-medium">{label}</th><td className="p-2">{rentalMoney(grid.low_season[key], currency)}</td><td className="p-2">{rentalMoney(grid.high_season[key], currency)}</td></tr>)}</tbody></table></div></div>;
}

export function VehicleDetailsEditor({ asset, section, currency, owner, onSaved, onClose, onRestoreFocus }: {
  asset: PlatformAsset; section: Section; currency: string; owner: boolean; onSaved: (asset: PlatformAsset) => void; onClose: () => void; onRestoreFocus?: () => void;
}) {
  const id = useId();
  const [enabled, setEnabled] = useState(Boolean(asset.pricing.tariff_grid));
  const [grid, setGrid] = useState<TariffGrid>(() => asset.pricing.tariff_grid || defaultGrid(asset.pricing.daily_rate || 0));
  const [deposit, setDeposit] = useState(String(asset.deposit_policy.amount || 0));
  const [specs, setSpecs] = useState<VehicleSpecs>(() => {
    const source = asset.specs;
    return { fuel: source.fuel || '', transmission: source.transmission || '', power: source.power || '', engine: source.engine || '',
      drive: source.drive || '', body_type: source.body_type || '', seats: source.seats ?? null, doors: source.doors ?? null,
      mileage: source.mileage ?? null, air_conditioning: source.air_conditioning ?? null, features: source.features || [] };
  });
  const [features, setFeatures] = useState((asset.specs.features || []).join('\n'));
  const [description, setDescription] = useState(asset.description || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const Icon = icons[section];
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    const options = features.split('\n').map(value => value.trim()).filter(Boolean);
    if (section === 'specs' && (options.length > 20 || options.some(value => value.length > 80))) { setError('Укажите до 20 опций, каждая — до 80 символов.'); return; }
    const data: VehicleDetailsInput = section === 'pricing' ? { section, pricing: enabled ? grid : null, deposit: Number(deposit) }
      : section === 'specs' ? { section, specs: { ...specs, features: options } } : { section, description };
    setBusy(true);
    try { const saved = await (owner ? saveOwnerAssetDetails : savePlatformAssetDetails)(asset.tenant_id, asset.id, data); onSaved(saved); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Не удалось сохранить. Повторите попытку.'); }
    finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent closeLabel="Закрыть редактор автомобиля" closeButtonClassName="right-2 top-2 flex size-11 items-center justify-center" onCloseAutoFocus={event => { if (onRestoreFocus) { event.preventDefault(); onRestoreFocus(); } }} onInteractOutside={event => event.preventDefault()} onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl bg-white text-slate-900 sm:max-w-xl">
    <DialogHeader className="pr-6 text-left"><DialogTitle className="flex items-center gap-2 text-balance"><Icon aria-hidden="true" className="size-5 shrink-0 text-blue-700" />{titles[section]}</DialogTitle><DialogDescription className="break-words text-pretty text-slate-600">{asset.name}</DialogDescription></DialogHeader>
    <form onSubmit={submit} aria-busy={busy} className="space-y-5">
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <legend className="sr-only">{titles[section]} автомобиля</legend>
        {section === 'pricing' && <>
          <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1 size-4 accent-blue-700" checked={enabled} onChange={event => setEnabled(event.target.checked)} />Использовать сезонную тарифную сетку</label>
          {!enabled && <p className="text-sm text-slate-600">Используется базовая цена: {rentalMoney(asset.pricing.daily_rate || 0, currency)} за сутки. Её можно изменить в основном редакторе автомобиля.</p>}
          {enabled && <>
            {(['low_season', 'high_season'] as const).map(season => <fieldset key={season} className="rounded-xl border border-slate-200 p-4"><legend className="flex items-center gap-2 px-1 font-semibold">{season === 'low_season' ? <CloudSun aria-hidden="true" className="size-4 text-blue-700" /> : <Sun aria-hidden="true" className="size-4 text-amber-700" />}{season === 'low_season' ? 'Низкий сезон' : 'Высокий сезон'}</legend><div className="grid grid-cols-2 gap-3">{tariffPeriods.map(([key, label]) => <div key={key}><label htmlFor={`${id}-${season}-${key}`} className="text-sm text-slate-700">{label}, {currency}/сутки</label><Input id={`${id}-${season}-${key}`} type="number" required min="0.01" max="100000000" step="0.01" className="mt-2 min-h-11 text-base tabular-nums" value={grid[season][key] || ''} onChange={event => setGrid({ ...grid, [season]: { ...grid[season], [key]: Number(event.target.value) } })} /></div>)}</div></fieldset>)}
            <div className="grid grid-cols-2 gap-3">{([['high_start', 'Начало высокого сезона'], ['high_end', 'Конец высокого сезона']] as const).map(([key, label]) => <div key={key}><label htmlFor={`${id}-${key}`} className="text-sm font-medium">{label}</label><Input id={`${id}-${key}`} type="text" required pattern="(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])" maxLength={5} value={grid[key]} onChange={event => setGrid({ ...grid, [key]: event.target.value })} aria-describedby={`${id}-season-hint`} className="mt-2 min-h-11 text-base tabular-nums" /></div>)}</div>
            <p id={`${id}-season-hint`} className="text-sm leading-6 text-slate-600">Формат ММ-ДД. Например, 11-01 — 03-31: с 1 ноября по 31 марта включительно. Остальные дни — низкий сезон. Диапазон тарифа определяется всей длительностью аренды; на переходе сезонов считаем дни отдельно.</p>
          </>}
          <div><label htmlFor={`${id}-deposit`} className="flex items-center gap-2 text-sm font-medium"><WalletCards aria-hidden="true" className="size-4" />Возвратный депозит, {currency}</label><Input id={`${id}-deposit`} type="number" required min="0" max="100000000" step="0.01" value={deposit} onChange={event => setDeposit(event.target.value)} className="mt-2 min-h-11 text-base tabular-nums" /></div>
          <p className="text-sm text-slate-600">Изменения применяются к новым заявкам. Уже созданные брони сохраняют свою стоимость.</p>
        </>}
        {section === 'specs' && <>
          {([['fuel', 'Топливо', ['', 'Бензин', 'Дизель', 'Электро', 'Гибрид']], ['transmission', 'Коробка передач', ['', 'Автомат', 'Механика', 'CVT', 'Робот']]] as const).map(([key, label, values]) => <fieldset key={key}><legend className="mb-2 font-medium">{label}</legend><div className="grid grid-cols-2 gap-2">{values.map(value => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm has-[:checked]:border-blue-700 has-[:checked]:bg-blue-50"><input type="radio" name={`${id}-${key}`} value={value} checked={specs[key] === value} onChange={() => setSpecs({ ...specs, [key]: value })} className="accent-blue-700" />{value || 'Не указано'}</label>)}</div></fieldset>)}
          <div className="grid gap-4 sm:grid-cols-2">{([['power', 'Мощность (л.с.)'], ['engine', 'Объём двигателя'], ['drive', 'Привод'], ['body_type', 'Кузов']] as const).map(([key, label]) => <div key={key}><label htmlFor={`${id}-${key}`} className="text-sm font-medium">{label}</label><Input id={`${id}-${key}`} maxLength={80} value={specs[key] || ''} onChange={event => setSpecs({ ...specs, [key]: event.target.value })} className="mt-2 min-h-11 text-base" /></div>)}
            {([['seats', 'Количество мест', 1, 20], ['doors', 'Количество дверей', 1, 8], ['mileage', 'Пробег, км', 0, 5000000]] as const).map(([key, label, min, max]) => <div key={key}><label htmlFor={`${id}-${key}`} className="text-sm font-medium">{label}</label><Input id={`${id}-${key}`} type="number" min={min} max={max} step="1" value={specs[key] ?? ''} onChange={event => setSpecs({ ...specs, [key]: event.target.value ? Number(event.target.value) : null })} className="mt-2 min-h-11 text-base tabular-nums" /></div>)}
            <div><label htmlFor={`${id}-ac`} className="text-sm font-medium">Кондиционер</label><select id={`${id}-ac`} value={specs.air_conditioning == null ? '' : String(specs.air_conditioning)} onChange={event => setSpecs({ ...specs, air_conditioning: event.target.value === '' ? null : event.target.value === 'true' })} className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base"><option value="">Не указано</option><option value="true">Есть</option><option value="false">Нет</option></select></div>
          </div>
          <div><label htmlFor={`${id}-features`} className="text-sm font-medium">Дополнительные опции</label><Textarea id={`${id}-features`} value={features} onChange={event => setFeatures(event.target.value)} maxLength={1620} aria-describedby={`${id}-features-hint`} className="mt-2 min-h-24 text-base" /><p id={`${id}-features-hint`} className="mt-2 text-sm text-slate-600">Одна опция на строку, до 20. Они видны клиентам. Год и цвет — в основном редакторе авто.</p></div>
        </>}
        {section === 'description' && <div><label htmlFor={`${id}-description`} className="font-medium">Публичное описание автомобиля</label><Textarea id={`${id}-description`} maxLength={5000} rows={8} value={description} onChange={event => setDescription(event.target.value)} aria-describedby={`${id}-description-hint`} className="mt-2 text-base leading-6" /><p id={`${id}-description-hint`} className="mt-2 text-sm leading-6 text-slate-600">Особенности, комплектация, нестандартные условия. Этот текст увидят клиенты — не добавляйте внутренние заметки или чужие контакты. До 5000 символов.</p></div>}
      </fieldset>
      {error && <p role="alert" className="text-sm leading-6 text-red-800">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Отмена</Button><Button type="submit" disabled={busy} className="min-h-11 gap-2 bg-blue-700 text-white hover:bg-blue-800"><Save aria-hidden="true" className="size-4" />{busy ? 'Сохраняем…' : 'Сохранить'}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
