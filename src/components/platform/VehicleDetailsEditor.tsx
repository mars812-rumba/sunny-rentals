import { parkText as pt } from '@/lib/park-locale';
import { useParkLocale } from '@/contexts/park-locale';
import { FormEvent, useId, useState } from 'react';
import { CalendarDays, CarFront, CircleCheck, CloudSun, DoorOpen, FileText, Fuel, Gauge, ImageIcon, Save, Settings2, Snowflake, Sun, Users, WalletCards, Wrench, Zap } from 'lucide-react';
import type { PlatformAsset, PricingMode, TariffGrid, VehicleDetailsInput, VehicleSpecs } from '@/api/platform-admin';
import { savePlatformAssetDetails } from '@/api/platform-admin';
import { saveOwnerAssetDetails } from '@/api/park-owner-fleet';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ParkFormSheet as Dialog, ParkFormSheetContent as DialogContent } from './ParkFormSheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { rentalMoney, seasonDateLabel } from '@/lib/park-rental';
import { vehiclePricingMode } from '@/lib/vehicle-pricing';
import { seasonDateInputValue, seasonDateWireValue } from '@/lib/season-date-input';
import { VehicleSpecsFields } from './VehicleSpecsFields';
import { splitVehicleFeatures } from '@/lib/vehicle-spec-options';

const tariffPeriods = [['price_1_6', '1–6 дней'], ['price_7_14', '7–14 дней'], ['price_15_29', '15–29 дней'], ['price_30', '30 дней и больше']] as const;
type Section = VehicleDetailsInput['section'];
const titles = { pricing: 'Тарифы', specs: 'Характеристики', description: 'Описание' };
const icons = { pricing: WalletCards, specs: Wrench, description: FileText };
const defaultGrid = (rate: number): TariffGrid => ({ low_season: { price_1_6: rate, price_7_14: rate, price_15_29: rate, price_30: rate }, high_season: { price_1_6: rate, price_7_14: rate, price_15_29: rate, price_30: rate }, high_start: '11-01', high_end: '03-31' });

export function VehicleSpecSummary({ specs, detailed = false, photoCount }: { specs: VehicleSpecs; detailed?: boolean; photoCount?: number }) {
  const { pt, intlLocale } = useParkLocale();
  const entries = [
    [Fuel, specs.fuel && pt(specs.fuel), 'bg-slate-100 text-slate-900', 'text-slate-600'],
    [Settings2, specs.transmission && pt(specs.transmission), 'bg-slate-100 text-slate-900', 'text-slate-600'],
    [Zap, specs.power && pt("Мощность: {0}", [specs.power]), 'bg-slate-100 text-slate-900', 'text-slate-600'],
    [Wrench, specs.engine && pt("Двигатель: {0}", [specs.engine]), 'bg-slate-100 text-slate-900', 'text-slate-600'],
    [Users, specs.seats ? pt("{0} мест", [specs.seats]) : '', 'bg-slate-100 text-slate-900', 'text-slate-600'],
    [ImageIcon, photoCount !== undefined ? `${pt('Фото: ')}${photoCount}` : '', 'bg-slate-100 text-slate-900', 'text-slate-600'],
    [Settings2, detailed && specs.drive && pt('Привод: {0}', [specs.drive]), 'bg-slate-100 text-slate-900', 'text-slate-600'],
    [CarFront, detailed && specs.body_type && pt('Кузов: {0}', [specs.body_type]), 'bg-slate-100 text-slate-900', 'text-slate-600'],
    [DoorOpen, detailed && specs.doors && pt('Двери: {0}', [specs.doors]), 'bg-slate-100 text-slate-900', 'text-slate-600'],
    [Gauge, detailed && specs.mileage != null && pt('Пробег: {0} км', [specs.mileage.toLocaleString(intlLocale)]), 'bg-slate-100 text-slate-900', 'text-slate-600'],
    [Snowflake, detailed && specs.air_conditioning != null && pt('Кондиционер: {0}', [specs.air_conditioning ? pt('есть') : pt('нет')]), 'bg-slate-100 text-slate-900', 'text-slate-600'],
  ] as const;
  return <><ul className="mt-3 grid min-w-0 grid-cols-2 gap-2 text-sm">{entries.filter(([, value]) => value).map(([Icon, value, tone, iconTone], index) => <li key={index} className={`flex min-w-0 items-start gap-2 rounded-md px-3 py-2 ${tone}`}><Icon aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${iconTone}`} /><span className="min-w-0 break-words font-medium leading-5">{value}</span></li>)}</ul>{detailed && !!specs.features?.length && <ul className="mt-2 grid min-w-0 grid-cols-2 gap-2 text-sm">{specs.features.map((value, index) => <li key={index} className="flex min-w-0 items-start gap-2 rounded-md bg-slate-100 px-3 py-2 text-slate-900"><CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-600" /><span className="min-w-0 break-words">{pt(value)}</span></li>)}</ul>}</>;
}

export function VehicleTariffTable({ grid, currency }: { grid: TariffGrid; currency: string }) {
  const { pt, intlLocale } = useParkLocale();
  if (grid.mode === 'duration') return <div className="overflow-x-auto"><table className="w-full text-left text-sm tabular-nums"><caption className="mb-2 text-left text-slate-600">{pt("Цена за сутки в зависимости от срока аренды")}</caption><thead><tr className="border-b border-slate-200"><th className="py-2 pr-3">{pt("Срок аренды")}</th><th className="p-2">{pt("Цена за сутки")}</th></tr></thead><tbody>{tariffPeriods.map(([key, label]) => <tr key={key} className="border-b border-slate-100"><th scope="row" className="py-2 pr-3 font-medium">{pt(label)}</th><td className="p-2">{rentalMoney(grid.low_season[key], currency)}</td></tr>)}</tbody></table></div>;
  return <div className="space-y-3"><p className="flex items-start gap-2 rounded-lg bg-slate-100 p-3 text-sm text-slate-900"><CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-600" /><span><span className="block font-semibold">{pt('Высокий сезон')}</span>{seasonDateLabel(grid.high_start, intlLocale)} — {seasonDateLabel(grid.high_end, intlLocale)}</span></p><div className="overflow-x-auto"><table className="w-full text-left text-sm tabular-nums"><caption className="sr-only">{pt("Тарифы по длительности аренды")}</caption><thead><tr className="border-b border-slate-200"><th scope="col" className="py-2 pr-3">{pt("Период")}</th><th scope="col" className="bg-slate-100 p-2 text-slate-900"><CloudSun aria-hidden="true" className="mb-1 size-4 text-slate-600" />{pt("Низкий сезон")}</th><th scope="col" className="bg-slate-100 p-2 text-slate-900"><Sun aria-hidden="true" className="mb-1 size-4 text-slate-600" />{pt("Высокий сезон")}</th></tr></thead><tbody>{tariffPeriods.map(([key, label]) => <tr key={key} className="border-b border-slate-100"><th scope="row" className="py-2 pr-3 font-medium">{pt(label)}</th><td className="bg-slate-100 p-2 text-slate-900">{rentalMoney(grid.low_season[key], currency)}</td><td className="bg-slate-100 p-2 text-slate-900">{rentalMoney(grid.high_season[key], currency)}</td></tr>)}</tbody></table></div><p className="text-sm text-slate-600">{pt('Цена за сутки')}</p></div>;
}

export function VehiclePricingFields({ id, currency, mode, onModeChange, dailyRate, onDailyRateChange, grid, onGridChange }: {
  id: string; currency: string; mode: PricingMode; onModeChange: (mode: PricingMode) => void;
  dailyRate: string; onDailyRateChange: (rate: string) => void; grid: TariffGrid; onGridChange: (grid: TariffGrid) => void;
}) {
  const { pt, intlLocale } = useParkLocale();
  const seasons: ('low_season' | 'high_season')[] = mode === 'seasonal' ? ['low_season', 'high_season'] : ['low_season'];
  const rising = mode !== 'flat' && seasons.some(season => tariffPeriods.some(([key], index) => index > 0 && grid[season][key] > grid[season][tariffPeriods[index - 1][0]]));
  return <>
    <fieldset className="space-y-2"><legend className="mb-2 font-semibold">{pt("Как рассчитывать стоимость")}</legend>{([
      ['flat', 'Одна цена за сутки', 'Одинаковая цена для всех сроков и сезонов.'],
      ['duration', 'Цена зависит от срока аренды', 'Четыре суточных тарифа, без сезонности.'],
      ['seasonal', 'Сезонная цена и срок аренды', 'Отдельные тарифы для высокого и низкого сезона.'],
    ] as const).map(([value, label, hint]) => <label key={value} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 has-[:checked]:border-blue-700 has-[:checked]:bg-blue-50"><input type="radio" name={`${id}-pricing-mode`} checked={mode === value} value={value} onChange={() => onModeChange(value)} aria-describedby={`${id}-${value}-hint`} className="mt-1 size-4 shrink-0 accent-blue-700" /><span><span className="block text-sm font-medium">{pt(label)}</span><span id={`${id}-${value}-hint`} className="mt-1 block text-sm text-slate-600">{pt(hint)}</span></span></label>)}</fieldset>
    {mode === 'flat' ? <div><label htmlFor={`${id}-daily-rate`} className="text-sm font-medium">{pt("Цена за сутки, ")}{currency}</label><Input id={`${id}-daily-rate`} type="number" required min="0.01" max="100000000" step="0.01" value={dailyRate} onChange={event => onDailyRateChange(event.target.value)} className="mt-2 min-h-11 text-base tabular-nums" /></div> : <>
      {seasons.map(season => <fieldset key={season} className="min-w-0 space-y-3"><legend className="mb-3 flex items-center gap-2 font-semibold">{mode === 'seasonal' && (season === 'low_season' ? <CloudSun aria-hidden="true" className="size-4 text-blue-700" /> : <Sun aria-hidden="true" className="size-4 text-amber-700" />)}{mode === 'duration' ? pt("Цена за сутки в зависимости от срока аренды") : season === 'low_season' ? pt("Низкий сезон") : pt("Высокий сезон")} · {currency}{pt("/сутки")}</legend><div className="grid grid-cols-2 gap-3">{tariffPeriods.map(([key, label]) => <div key={key}><label htmlFor={`${id}-${season}-${key}`} className="text-sm text-slate-700">{pt(label)}</label><Input id={`${id}-${season}-${key}`} type="number" required min="0.01" max="100000000" step="0.01" className="mt-2 min-h-11 text-base tabular-nums" value={grid[season][key] || ''} onChange={event => onGridChange({ ...grid, [season]: { ...grid[season], [key]: Number(event.target.value) } })} /></div>)}</div></fieldset>)}
      {mode === 'duration' && grid.low_season.price_7_14 > 0 && <p className="text-sm leading-6 text-slate-600">{pt("Например, аренда на 10 суток: 10 × ")}{rentalMoney(grid.low_season.price_7_14, currency)} = {rentalMoney(grid.low_season.price_7_14 * 10, currency)}.</p>}
      {mode === 'seasonal' && <><div className="grid grid-cols-2 gap-3">{([['high_start', 'Начало высокого сезона'], ['high_end', 'Конец высокого сезона']] as const).map(([key, label]) => <div key={key}><label htmlFor={`${id}-${key}`} className="flex items-start gap-2 text-sm font-medium"><CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-blue-700" />{pt(label)}</label><Input id={`${id}-${key}`} type="text" required pattern="(0[1-9]|[12][0-9]|3[01])[.](0[1-9]|1[0-2])" placeholder={pt('ДД.ММ')} title={pt('День и месяц: 01.11')} maxLength={5} value={seasonDateInputValue(grid[key])} onChange={event => onGridChange({ ...grid, [key]: seasonDateWireValue(event.target.value) })} aria-describedby={`${id}-season-hint`} className="mt-2 min-h-11 text-base tabular-nums" /></div>)}</div><p id={`${id}-season-hint`} className="text-sm leading-6 text-slate-600">{pt('День и месяц. Остальные даты — низкий сезон.')}</p></>}
      {rising && <p role="status" className="text-sm leading-6 text-amber-900">{pt("Проверьте тарифы: цена за более длительный срок выше предыдущей. Это допустимо, если так задумано.")}</p>}
    </>}
    <p className="text-sm leading-6 text-slate-600">{pt('Неактивные тарифы не используются.')}</p>
  </>;
}

export function VehicleDetailsEditor({ asset, section, currency, owner, onSaved, onClose, onRestoreFocus }: {
  asset: PlatformAsset; section: Section; currency: string; owner: boolean; onSaved: (asset: PlatformAsset) => void; onClose: () => void; onRestoreFocus?: () => void;
}) {
  const { pt, intlLocale } = useParkLocale();
  const id = useId();
  const [mode, setMode] = useState<PricingMode>(() => vehiclePricingMode(asset));
  const [dailyRate, setDailyRate] = useState(String(asset.pricing.daily_rate || ''));
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
    const options = splitVehicleFeatures(features);
    if (section === 'specs' && (options.length > 20 || options.some(value => value.length > 80))) { setError(pt("Укажите до 20 опций, каждая — до 80 символов.")); return; }
    const pricingGrid = mode === 'duration' ? { ...grid, high_season: Object.fromEntries(tariffPeriods.map(([key]) => [key, grid.high_season[key] || grid.low_season[key]])) as TariffGrid['high_season'] } : grid;
    const hasCompleteGrid = [...Object.values(grid.low_season), ...Object.values(grid.high_season)].every(rate => Number.isFinite(rate) && rate >= 0.01);
    const data: VehicleDetailsInput = section === 'pricing' ? { section, pricing: mode === 'flat' ? hasCompleteGrid ? grid : null : pricingGrid, pricing_mode: mode, ...(mode === 'flat' ? { daily_rate: Number(dailyRate) } : {}), deposit: Number(deposit) }
      : section === 'specs' ? { section, specs: { ...specs, features: options } } : { section, description };
    setBusy(true);
    try { const saved = await (owner ? saveOwnerAssetDetails : savePlatformAssetDetails)(asset.tenant_id, asset.id, data); onSaved(saved); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : pt("Не удалось сохранить. Повторите попытку.")); }
    finally { setBusy(false); }
  };
  return <Dialog open busy={busy} onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent closeLabel={pt("Закрыть редактор автомобиля")} onCloseAutoFocus={event => { if (onRestoreFocus) { event.preventDefault(); onRestoreFocus(); } }}
    header={<DialogHeader className="text-left"><DialogTitle className="flex items-center gap-2 text-balance"><Icon aria-hidden="true" className="size-5 shrink-0 text-blue-700" />{pt(titles[section])}</DialogTitle><DialogDescription className="break-words text-pretty text-slate-600">{asset.name}</DialogDescription></DialogHeader>}>
    <form onSubmit={submit} aria-busy={busy} className="space-y-5">
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <legend className="sr-only">{pt(titles[section])} {pt(" автомобиля")}</legend>
        {section === 'pricing' && <>
          <VehiclePricingFields id={id} currency={currency} mode={mode} onModeChange={setMode} dailyRate={dailyRate} onDailyRateChange={setDailyRate} grid={grid} onGridChange={setGrid} />
          <div><label htmlFor={`${id}-deposit`} className="flex items-center gap-2 text-sm font-medium"><WalletCards aria-hidden="true" className="size-4" />{pt("Возвратный депозит, ")}{currency}</label><Input id={`${id}-deposit`} type="number" required min="0" max="100000000" step="0.01" value={deposit} onChange={event => setDeposit(event.target.value)} className="mt-2 min-h-11 text-base tabular-nums" /></div>
          <p className="text-sm text-slate-600">{pt('Новые цены — только для новых заявок.')}</p>
        </>}
        {section === 'specs' && <VehicleSpecsFields id={id} specs={specs} onChange={setSpecs} features={features} onFeaturesChange={setFeatures} />}
        {section === 'description' && <div><label htmlFor={`${id}-description`} className="font-medium">{pt("Публичное описание автомобиля")}</label><Textarea id={`${id}-description`} maxLength={5000} rows={8} value={description} onChange={event => setDescription(event.target.value)} aria-describedby={`${id}-description-hint`} className="mt-2 text-base leading-6" /><p id={`${id}-description-hint`} className="mt-2 text-sm leading-6 text-slate-600">{pt("Особенности, комплектация, нестандартные условия. Этот текст увидят клиенты — не добавляйте внутренние заметки или чужие контакты. До 5000 символов.")}</p></div>}
      </fieldset>
      {error && <p role="alert" className="text-sm leading-6 text-red-800">{pt(error)}</p>}
      <div className="park-sheet-actions flex flex-wrap justify-end gap-2 border-t border-slate-200"><Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>{pt("Отмена")}</Button><Button type="submit" disabled={busy} className="min-h-11 gap-2 bg-emerald-700 text-white hover:bg-emerald-800"><Save aria-hidden="true" className="size-4" />{busy ? pt("Сохраняем…") : pt("Сохранить")}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
