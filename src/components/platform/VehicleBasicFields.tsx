import { useId, type Ref, type ReactNode } from 'react';
import { CalendarDays, CarFront, Eye, Factory, IdCard, Palette, Settings2, Type, type LucideIcon } from 'lucide-react';
import type { AssetType, PlatformAssetInput } from '@/api/platform-admin';
import { useParkLocale } from '@/contexts/park-locale';
import { Input } from '@/components/ui/input';

export const vehicleAssetTypeLabels: Record<AssetType, string> = {
  car: 'Автомобиль', scooter: 'Электросамокат', motorcycle: 'Мотоцикл / скутер',
  bicycle: 'Велосипед', snowmobile: 'Снегоход', other: 'Другая техника',
};

function FieldLabel({ htmlFor, icon: Icon, children }: { htmlFor: string; icon: LucideIcon; children: ReactNode }) {
  return <label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-medium text-slate-900"><Icon aria-hidden="true" className="size-4 shrink-0 text-slate-600" />{children}</label>;
}

function FieldGroup({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  const { pt } = useParkLocale();
  return <fieldset className="min-w-0 rounded-xl bg-slate-100 p-4"><legend className="float-left mb-4 flex w-full items-center gap-2 font-semibold"><Icon aria-hidden="true" className="size-5 shrink-0 text-slate-600" />{pt(title)}</legend><div className="clear-both grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">{children}</div></fieldset>;
}

export function VehicleLicensePlateField({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const { pt } = useParkLocale();
  return <div className="min-w-0">
    <FieldLabel htmlFor={`${id}-license-plate`} icon={IdCard}>{pt('Госномер')}</FieldLabel>
    <Input id={`${id}-license-plate`} maxLength={80} value={value} onChange={event => onChange(event.target.value)} aria-describedby={`${id}-license-plate-hint`} autoComplete="off" spellCheck={false} className="mt-2 min-h-12 text-base" />
    <p id={`${id}-license-plate-hint`} className="mt-2 text-sm leading-6 text-slate-600">{pt('Номер и регион с таблички, включая тайские буквы. Видно только владельцу и администратору. До 80 символов.')}</p>
  </div>;
}

export function VehicleBasicFields({ data, onChange, nameInput }: { data: PlatformAssetInput; onChange: (data: PlatformAssetInput) => void; nameInput?: Ref<HTMLInputElement> }) {
  const { pt } = useParkLocale();
  const id = useId();
  return <div className="space-y-4">
    <FieldGroup title="Название и модель" icon={CarFront}>
      <div className="min-w-0 sm:col-span-2"><FieldLabel htmlFor={`${id}-name`} icon={Type}>{pt('Название для клиента')}</FieldLabel><Input ref={nameInput} id={`${id}-name`} required maxLength={160} value={data.name} onChange={event => onChange({ ...data, name: event.target.value })} placeholder={pt('Toyota Yaris 2024, белый')} className="mt-2 min-h-12 text-base" /></div>
      {([['brand', 'Марка', Factory], ['model', 'Модель', CarFront]] as const).map(([key, label, Icon]) => <div key={key} className="min-w-0"><FieldLabel htmlFor={`${id}-${key}`} icon={Icon}>{pt(label)}</FieldLabel><Input id={`${id}-${key}`} maxLength={80} value={data[key]} onChange={event => onChange({ ...data, [key]: event.target.value })} className="mt-2 min-h-12 text-base" /></div>)}
    </FieldGroup>
    <FieldGroup title="Данные автомобиля" icon={Settings2}>
      <div className="min-w-0"><FieldLabel htmlFor={`${id}-kind`} icon={CarFront}>{pt('Тип транспорта')}</FieldLabel><select id={`${id}-kind`} value={data.asset_type} onChange={event => onChange({ ...data, asset_type: event.target.value as AssetType })} className="mt-2 min-h-12 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">{Object.entries(vehicleAssetTypeLabels).map(([value, label]) => <option key={value} value={value}>{pt(label)}</option>)}</select></div>
      <div className="min-w-0"><FieldLabel htmlFor={`${id}-year`} icon={CalendarDays}>{pt('Год выпуска')}</FieldLabel><Input id={`${id}-year`} type="number" min={1950} max={2100} value={data.year ?? ''} onChange={event => onChange({ ...data, year: event.target.value ? Number(event.target.value) : null })} className="mt-2 min-h-12 text-base tabular-nums" /></div>
      <div className="min-w-0"><FieldLabel htmlFor={`${id}-color`} icon={Palette}>{pt('Цвет')}</FieldLabel><Input id={`${id}-color`} maxLength={80} value={data.color} onChange={event => onChange({ ...data, color: event.target.value })} className="mt-2 min-h-12 text-base" /></div>
      <VehicleLicensePlateField id={id} value={data.license_plate || ''} onChange={license_plate => onChange({ ...data, license_plate })} />
    </FieldGroup>
    <FieldGroup title="Видимость на витрине" icon={Eye}>
      <div className="sm:col-span-2"><label className="flex min-h-11 items-center gap-3 text-sm font-medium"><input type="checkbox" checked={Boolean(data.public)} onChange={event => onChange({ ...data, public: event.target.checked })} aria-describedby={`${id}-visibility-hint`} className="size-4 shrink-0 accent-blue-700 focus-visible:outline focus-visible:outline-2" />{pt('Показывать на витрине')}</label><p id={`${id}-visibility-hint`} className="mt-2 text-sm leading-6 text-slate-600">{pt('После публикации парка машина, её цены и фотографии станут доступны по публичной ссылке.')}</p></div>
    </FieldGroup>
  </div>;
}
