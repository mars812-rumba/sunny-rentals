import { useState, type ReactNode } from 'react';
import { CarFront, DoorOpen, Fuel, Gauge, Plus, Settings2, Snowflake, Users, Wrench, X, Zap, type LucideIcon } from 'lucide-react';
import type { VehicleSpecs } from '@/api/platform-admin';
import { useParkLocale } from '@/contexts/park-locale';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { splitVehicleFeatures, toggleVehicleFeature, vehicleDoorOptions, vehicleFeatureOptions, vehicleNumericSpec, vehicleSeatOptions, vehicleSpecOptions } from '@/lib/vehicle-spec-options';
import { useParkFormSheetDirty } from './park-form-sheet-context';

const selectClass = 'mt-2 min-h-12 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700';

function SpecGroup({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  const { pt } = useParkLocale();
  return <fieldset className="min-w-0 space-y-4 rounded-xl bg-slate-100 p-4 text-slate-900"><legend className="float-left mb-4 flex w-full items-center gap-2 font-semibold"><Icon aria-hidden="true" className="size-5 shrink-0 text-slate-600" />{pt(title)}</legend><div className="clear-both grid min-w-0 gap-4 sm:grid-cols-2">{children}</div></fieldset>;
}

function SpecLabel({ htmlFor, label, icon: Icon }: { htmlFor: string; label: string; icon: LucideIcon }) {
  const { pt } = useParkLocale();
  return <label htmlFor={htmlFor} className="flex items-start gap-2 text-sm font-medium"><Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-600" />{pt(label)}</label>;
}

export function VehicleSpecsFields({ id, specs, onChange, features, onFeaturesChange }: {
  id: string; specs: VehicleSpecs; onChange: (value: VehicleSpecs) => void; features: string; onFeaturesChange: (value: string) => void;
}) {
  const { pt } = useParkLocale();
  const [custom, setCustom] = useState('');
  const [featureError, setFeatureError] = useState('');
  const markDirty = useParkFormSheetDirty();
  const selected = splitVehicleFeatures(features);
  const extras = selected.filter(value => !vehicleFeatureOptions.includes(value));
  const select = (key: keyof typeof vehicleSpecOptions, label: string, Icon: LucideIcon) => {
    const options: readonly string[] = vehicleSpecOptions[key];
    const value = specs[key] || '';
    return <div className="min-w-0"><SpecLabel htmlFor={`${id}-${key}`} label={label} icon={Icon} /><select id={`${id}-${key}`} value={value} className={selectClass} onChange={event => onChange({ ...specs, [key]: event.target.value })}>
      {value && !options.includes(value) && <option value={value}>{pt('Текущее значение: {0}', [value])}</option>}
      {options.map(option => <option key={option} value={option}>{option ? pt(option) : pt('Не указано')}</option>)}
    </select></div>;
  };
  const number = (key: 'power' | 'engine', label: string, Icon: LucideIcon) => {
    const current = specs[key] || '';
    const numeric = vehicleNumericSpec(current, key);
    return <div className="min-w-0"><SpecLabel htmlFor={`${id}-${key}`} label={label} icon={Icon} /><Input id={`${id}-${key}`} type={numeric === null ? 'text' : 'number'} inputMode="decimal" min="0.01" step="any" maxLength={80} value={numeric ?? current} onChange={event => onChange({ ...specs, [key]: event.target.value })} className="mt-2 min-h-12 text-base tabular-nums" /></div>;
  };
  const count = (key: 'seats' | 'doors', label: string, Icon: LucideIcon, options: number[]) => <div className="min-w-0"><SpecLabel htmlFor={`${id}-${key}`} label={label} icon={Icon} /><select id={`${id}-${key}`} value={specs[key] ?? ''} className={selectClass} onChange={event => onChange({ ...specs, [key]: event.target.value === '' ? null : Number(event.target.value) })}><option value="">{pt('Не указано')}</option>{options.map(value => <option key={value} value={value}>{value}</option>)}</select></div>;
  const chooseFeature = (option: string, checked: boolean) => {
    const next = toggleVehicleFeature(features, option, checked);
    if (checked && (splitVehicleFeatures(next).length > 20 || option.length > 80)) { setFeatureError(pt('Укажите до 20 опций, каждая — до 80 символов.')); return false; }
    markDirty?.(); onFeaturesChange(next); setFeatureError(''); return true;
  };
  const addCustom = () => { const value = custom.trim(); if (value && chooseFeature(value, true)) setCustom(''); };
  return <div className="space-y-4">
    <SpecGroup title="Двигатель и коробка" icon={Wrench}>
      {select('fuel', 'Топливо', Fuel)}{select('transmission', 'Коробка передач', Settings2)}
      {number('power', 'Мощность (л.с.)', Zap)}{number('engine', 'Объём двигателя, л', Wrench)}
      {select('drive', 'Привод', Settings2)}
    </SpecGroup>
    <SpecGroup title="Кузов и салон" icon={CarFront}>
      {select('body_type', 'Кузов', CarFront)}{count('seats', 'Количество мест', Users, vehicleSeatOptions)}{count('doors', 'Количество дверей', DoorOpen, vehicleDoorOptions)}
    </SpecGroup>
    <SpecGroup title="Эксплуатация" icon={Gauge}>
      <div className="min-w-0"><SpecLabel htmlFor={`${id}-mileage`} label="Пробег, км" icon={Gauge} /><Input id={`${id}-mileage`} type="number" min="0" max="5000000" step="1" value={specs.mileage ?? ''} onChange={event => onChange({ ...specs, mileage: event.target.value === '' ? null : Number(event.target.value) })} className="mt-2 min-h-12 text-base tabular-nums" /></div>
      <div className="min-w-0"><SpecLabel htmlFor={`${id}-ac`} label="Кондиционер" icon={Snowflake} /><select id={`${id}-ac`} value={specs.air_conditioning == null ? '' : String(specs.air_conditioning)} onChange={event => onChange({ ...specs, air_conditioning: event.target.value === '' ? null : event.target.value === 'true' })} className={selectClass}><option value="">{pt('Не указано')}</option><option value="true">{pt('Есть')}</option><option value="false">{pt('Нет')}</option></select></div>
    </SpecGroup>
    <fieldset className="min-w-0 space-y-4 rounded-xl bg-slate-100 p-4 text-slate-900"><legend className="float-left mb-4 flex w-full items-center gap-2 font-semibold"><Settings2 aria-hidden="true" className="size-5 shrink-0 text-slate-600" />{pt('Дополнительные опции')}</legend>
      <p id={`${id}-features-hint`} className="clear-both text-sm text-slate-600">{pt('Выберите опции или добавьте свою. До 20 опций, каждая — до 80 символов.')}</p>
      <div className="grid gap-2 sm:grid-cols-2">{vehicleFeatureOptions.map(option => <label key={option} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-white px-3 py-2 text-sm has-[:checked]:bg-blue-100 has-[:checked]:text-blue-950"><input type="checkbox" checked={selected.includes(option)} onChange={event => chooseFeature(option, event.target.checked)} aria-describedby={`${id}-features-hint`} className="size-4 shrink-0 accent-blue-700" /><span className="min-w-0 break-words">{pt(option)}</span></label>)}</div>
      {!!extras.length && <ul className="flex flex-wrap gap-2">{extras.map(option => <li key={option} className="flex min-w-0 max-w-full items-center gap-1 rounded-md bg-white pl-3 text-sm"><span className="break-words">{option}</span><Button type="button" variant="ghost" className="size-11 shrink-0 p-0" aria-label={pt('Убрать опцию: {0}', [option])} onClick={() => chooseFeature(option, false)}><X aria-hidden="true" className="size-4" /></Button></li>)}</ul>}
      <div><SpecLabel htmlFor={`${id}-custom-feature`} label="Своя опция" icon={Plus} /><div className="mt-2 flex flex-wrap gap-2"><Input id={`${id}-custom-feature`} maxLength={80} value={custom} onChange={event => { setCustom(event.target.value); setFeatureError(''); }} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); addCustom(); } }} aria-invalid={!!featureError} aria-describedby={`${id}-features-hint${featureError ? ` ${id}-features-error` : ''}`} className="min-h-12 min-w-0 flex-1 text-base" /><Button type="button" variant="outline" className="min-h-12 gap-2" disabled={!custom.trim()} onClick={addCustom}><Plus aria-hidden="true" className="size-4" />{pt('Добавить')}</Button></div></div>
      {featureError && <p id={`${id}-features-error`} role="alert" className="text-sm text-rose-800">{featureError}</p>}
      <p className="text-sm text-slate-600">{pt('Опции видны клиентам. Год и цвет — в основном редакторе авто.')}</p>
    </fieldset>
  </div>;
}
