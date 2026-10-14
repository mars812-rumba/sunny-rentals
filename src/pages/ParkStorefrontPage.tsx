import { parkText } from '@/lib/park-locale';
import { parkText as pt } from '@/lib/park-locale';
import { useParkLocale } from '@/contexts/park-locale';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, CalendarDays, CarFront, FileText, ImageIcon, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { VehicleCardFrame } from '@/components/VehicleCardFrame';
import { ImageCarousel } from '@/components/CarCard';
import { DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ParkFormSheet as Dialog, ParkFormSheetContent as DialogContent } from '@/components/platform/ParkFormSheet';
import { fetchStorefront, Storefront, StorefrontAsset, storefrontMediaUrl } from '@/api/storefront';
import { ParkStorefrontHero } from '@/components/platform/ParkStorefrontHero';
import { ParkLanguageSwitcher } from '@/contexts/ParkLocaleContext';
import { ParkTelegramEntry } from '@/components/platform/ParkTelegramEntry';
import type { ParkView } from '@/lib/park-entry';
import { ParkBookingForm } from '@/components/platform/ParkBookingForm';
import { ParkBookingReceipt } from '@/components/platform/ParkBookingReceipt';
import { ParkStorefrontHeader } from '@/components/platform/ParkStorefrontHeader';
import { VehicleSpecSummary, VehicleTariffTable } from '@/components/platform/VehicleDetailsEditor';
import { ParkRentalFilters } from '@/components/platform/ParkRentalFilters';
import { fetchParkAvailability, ParkAvailability, type ParkBooking, type ParkCatalogRentalPrice } from '@/api/park-telegram';
import { ParkCatalogPrice } from '@/components/platform/ParkCatalogPrice';
import { catalogRentalPrice } from '@/lib/catalog-rental-price';
import { ParkRentalPeriod, paidRentalDays } from '@/lib/park-rental';
import type { ParkPickup } from '@/lib/park-pickup';

const types: Record<string, string> = { car: 'Автомобили', scooter: 'Электросамокаты', motorcycle: 'Мотоциклы / скутеры', bicycle: 'Велосипеды', snowmobile: 'Снегоходы', other: 'Другая техника' };
const actionClass = 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white hover:from-cyan-700 hover:to-blue-800';

function StorefrontImage({ tenantId, reference, preview, alt, className }: { tenantId: string; reference?: string | null; preview: string; alt: string; className: string }) {
  const { pt, intlLocale } = useParkLocale();
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    setUrl(''); setFailed(false);
    if (reference) {
      const path = storefrontMediaUrl(tenantId, reference);
      if (!preview) setUrl(path);
      else fetch(path, { headers: { 'X-Storefront-Preview': preview }, signal: controller.signal, cache: 'no-store' })
        .then((response) => { if (!response.ok) throw new Error(); return response.blob(); })
        .then((blob) => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); } })
        .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    }
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [tenantId, reference, preview]);
  return url && !failed ? <img src={url} alt={alt} loading="lazy" decoding="async" className={className} onError={() => setFailed(true)} />
    : <div className={`${className} flex flex-col items-center justify-center gap-2 bg-slate-100 text-slate-600`} role="img" aria-label={alt}><ImageIcon aria-hidden="true" /><span className="text-xs">{failed ? pt("Фото недоступно") : reference ? pt("Загружаем фото…") : pt("Фото пока нет")}</span></div>;
}

function AssetCard({ asset, tenantId, currency, preview, bookingEnabled, period, pickup, onBooked, rental }: { asset: StorefrontAsset; tenantId: string; currency: string; preview: string; bookingEnabled: boolean; period: ParkRentalPeriod | null; pickup: ParkPickup; onBooked: () => void; rental?: ParkCatalogRentalPrice }) {
  const { pt, intlLocale } = useParkLocale();
  const [photo, setPhoto] = useState(0);
  const [created, setCreated] = useState<ParkBooking | null>(null);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const receiptTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!created) return;
    const body = dialogRef.current?.querySelector('[data-park-sheet-body]');
    if (body) body.scrollTop = 0;
    receiptTitle.current?.focus({ preventScroll: true });
  }, [created]);
  const days = period ? paidRentalDays(period) : 0;
  return <VehicleCardFrame assetId={asset.id} media={<div className="relative aspect-[16/10] overflow-hidden">
    <ImageCarousel photos={asset.photos} carName={asset.name} carId={`${tenantId}:${asset.id}`} t={() => pt("Фото пока нет")} renderPhoto={(reference, index) => <StorefrontImage tenantId={tenantId} reference={reference} preview={preview} alt={pt("{0}, фото {1}", [asset.name, index + 1])} className="h-full w-full object-cover" />} />
  </div>}>
    <CardContent className="flex flex-1 flex-col p-4">
      <h3 className="break-words text-lg font-semibold leading-tight">{asset.name}</h3>
      <p className="mt-1 text-sm text-slate-600">{[asset.specs.brand, asset.specs.model, asset.specs.year, asset.specs.color].filter(Boolean).join(' · ')}</p>
      <p className="mt-3 flex items-center gap-2 text-sm text-slate-600"><CarFront aria-hidden="true" className="h-4 w-4 shrink-0" />{pt(types[asset.asset_type] || pt("Транспорт"))}</p>
      <VehicleSpecSummary specs={asset.specs} />
      {asset.description && <details className="mt-3 text-sm"><summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md font-medium text-blue-700 focus-visible:outline focus-visible:outline-2"><FileText aria-hidden="true" className="size-4" />{pt("Описание")}</summary><p className="mt-2 whitespace-pre-wrap break-words leading-6 text-slate-700">{asset.description}</p></details>}
      <ParkCatalogPrice asset={asset} currency={currency} selected={!!period} rental={rental} />
      <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (nextOpen) { setPhoto(0); setCreated(null); } else if (created) onBooked(); }}>
        <DialogTrigger asChild><Button className={`mt-4 min-h-12 w-full rounded-xl ${actionClass}`} aria-label={`${period && bookingEnabled ? pt("Выбрать") : pt("Посмотреть")} ${asset.name}`}>{period && bookingEnabled ? pt("Выбрать транспорт") : pt("Посмотреть")} <ArrowRight aria-hidden="true" className="h-4 w-4" /></Button></DialogTrigger>
        <DialogContent ref={dialogRef} closeLabel={pt('Закрыть')} header={created ? <><DialogTitle ref={receiptTitle} tabIndex={-1} className="text-left text-xl leading-snug focus:outline-none">{pt('Заявка принята')}</DialogTitle><DialogDescription className="mt-2 text-left">{pt('Заявка отправлена парку.')}</DialogDescription></> : <><DialogTitle className="break-words leading-snug">{asset.name}</DialogTitle><DialogDescription className="mt-2">{period ? pt('Проверьте автомобиль и условия на выбранные даты.') : pt('Посмотрите фотографии и выберите даты для расчёта аренды.')}</DialogDescription></>}>
          {created ? <>
            <ParkBookingReceipt booking={created} />
            <Button type="button" className="min-h-12 w-full bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => { setOpen(false); onBooked(); }}>{pt('Понятно')}</Button>
          </> : <>
          <StorefrontImage key={asset.photos[photo]} tenantId={tenantId} reference={asset.photos[photo]} preview={preview} alt={pt("{0}, фото {1}", [asset.name, photo + 1])} className="aspect-[4/3] max-h-[50dvh] w-full rounded-lg object-contain" />
          {asset.photos.length > 1 && <div className="flex items-center justify-between gap-2"><Button variant="outline" aria-label={pt("Предыдущее фото")} onClick={() => setPhoto((value) => (value - 1 + asset.photos.length) % asset.photos.length)}><ArrowLeft aria-hidden="true" /></Button><p role="status" className="text-sm tabular-nums">{pt("Фото ")}{photo + 1} {pt(" из ")}{asset.photos.length}</p><Button variant="outline" aria-label={pt("Следующее фото")} onClick={() => setPhoto((value) => (value + 1) % asset.photos.length)}><ArrowRight aria-hidden="true" /></Button></div>}
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            <li className="inline-flex items-center gap-2"><CarFront aria-hidden="true" className="h-4 w-4 shrink-0" />{pt(types[asset.asset_type] || pt("Транспорт"))}</li>
            {asset.specs.year && <li className="inline-flex items-center gap-2"><CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />{asset.specs.year} {pt(" год")}</li>}
            {asset.specs.color && <li className="inline-flex items-center gap-2"><Palette aria-hidden="true" className="h-4 w-4 shrink-0" />{asset.specs.color}</li>}
          </ul>
          {bookingEnabled && !preview ? <ParkBookingForm key={`${asset.id}:${period?.start}:${period?.end}`} tenantId={tenantId} assetId={asset.id} asset={asset} initialPeriod={period} initialPickup={pickup} initialRental={rental} currency={currency} onCreated={setCreated} /> : <ParkCatalogPrice asset={asset} currency={currency} selected={!!period} rental={rental} />}
          <VehicleSpecSummary specs={asset.specs} detailed />
          {asset.description && <section className="rounded-lg bg-slate-100 p-3 text-slate-900"><h4 className="flex items-center gap-2 font-semibold"><FileText aria-hidden="true" className="size-4 text-slate-600" />{pt("Описание")}</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{asset.description}</p></section>}
          {asset.tariff_grid && <VehicleTariffTable grid={asset.tariff_grid} currency={currency} />}
          </>}
        </DialogContent>
      </Dialog>
    </CardContent>
  </VehicleCardFrame>;
}

function ParkStorefront({ tenantId, ownerEntry }: { tenantId: string; ownerEntry: boolean }) {
  const { pt, intlLocale } = useParkLocale();
  const [preview] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('preview') || '');
  const [view, setView] = useState<ParkView>(() => ownerEntry && !preview && window.Telegram?.WebApp?.initData ? 'checking' : 'client');
  const [data, setData] = useState<Storefront | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [pickup, setPickup] = useState<ParkPickup>({ time: '', location: 'airport', address: '', return_location: 'airport', return_address: '' });
  const [type, setType] = useState('all');
  const [period, setPeriod] = useState<ParkRentalPeriod | null>(null);
  const [availability, setAvailability] = useState<ParkAvailability | null>(null);
  const [availabilityError, setAvailabilityError] = useState('');
  const [checking, setChecking] = useState(false);
  const [availabilityReload, setAvailabilityReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setAvailability(null); setAvailabilityError('');
    if (!period || !data?.booking_enabled || data.preview) { setChecking(false); return () => controller.abort(); }
    setChecking(true);
    fetchParkAvailability(tenantId, period.start, period.end, controller.signal, period.pickup?.time || undefined, period.pickup?.return_time || undefined)
      .then((result) => { if (!controller.signal.aborted) setAvailability(result); })
      .catch((failure) => { if (!controller.signal.aborted) setAvailabilityError(failure instanceof Error ? failure.message : parkText("Не удалось проверить наличие.")); })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [tenantId, period, data?.booking_enabled, data?.preview, availabilityReload]);
  useEffect(() => {
    // Legacy index.html has static Sunny metadata not managed by Helmet.
    // Remove those defaults only on this surface; restore on SPA navigation.
    const defaults = Array.from(document.head.querySelectorAll('meta[name="description"], meta[name="author"], meta[name^="twitter:"], meta[property^="og:"], link[rel="canonical"]'))
      .filter((element) => !element.hasAttribute('data-rh'));
    defaults.forEach((element) => element.remove());
    return () => { defaults.forEach((element) => document.head.appendChild(element)); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    fetchStorefront(tenantId, preview, controller.signal).then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : parkText("Не удалось загрузить витрину")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tenantId, preview, reload]);
  const assets = useMemo(() => data?.assets.filter((asset) => (!period || (availability?.start_date === period.start && availability.end_date === period.end && availability.available_asset_ids.includes(asset.id))) && (type === 'all' || asset.asset_type === type)) || [], [data, type, period, availability]);
  const name = data?.tenant.name || pt("Витрина проката");
  return <main className={`min-h-screen text-slate-950 selection:bg-blue-200 ${view === 'owner' || view === 'checking' ? 'bg-slate-50' : 'bg-gradient-to-br from-blue-50 via-white to-orange-50'}`}>
    <Helmet><title>{name} {pt(" — транспорт в аренду")}</title><meta name="robots" content="noindex, nofollow" /><meta name="referrer" content="no-referrer" /><meta name="description" content={pt("Каталог транспорта {0}: фотографии и цены проката.", [name])} /><link rel="canonical" href={`${window.location.origin}/p/${encodeURIComponent(tenantId)}`} /><meta property="og:type" content="website" /><meta property="og:title" content={pt("{0} — транспорт в аренду", [name])} /><meta property="og:description" content={pt("Каталог транспорта {0}: фотографии и цены проката.", [name])} /><meta property="og:url" content={`${window.location.origin}/p/${encodeURIComponent(tenantId)}`} /><meta name="twitter:card" content="summary" /></Helmet>
    {data && !data.preview && <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"><ParkTelegramEntry key={tenantId} tenantId={tenantId} ownerEntry={ownerEntry} view={view} onViewChange={setView} /></div>}
    {view === 'client' ? <><ParkStorefrontHeader name={name} logo={data?.tenant.logo ? <StorefrontImage tenantId={tenantId} reference={data.tenant.logo} preview={preview} alt={pt('Логотип {0}', [name])} className="h-full w-full bg-white object-contain" /> : undefined} /><ParkStorefrontHero name={name} /></> : <div className="mx-auto flex max-w-6xl justify-end px-4 py-2"><ParkLanguageSwitcher compact /></div>}
    <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
      {data?.preview && <p role="status" className="mt-4 rounded-xl bg-amber-100 p-3 text-sm text-amber-950">{pt("Закрытое превью · здесь видны и неопубликованные машины. Ссылка действует 24 часа и не даёт доступа к управлению парком.")}</p>}
      {loading ? <p role="status" aria-live="polite" className="py-12 text-center text-slate-600">{pt("Загружаем транспорт парка…")}</p> : error ? <div role="alert" className="py-12 text-center"><p className="text-slate-700">{pt(error)}</p><Button className={`mt-4 ${actionClass}`} onClick={() => setReload((value) => value + 1)}>{pt("Повторить загрузку")}</Button></div> : data && view === 'client' && <>
        <ParkRentalFilters period={period} onPeriodChange={value => setPeriod(value ? { ...value, pickup } : null)} pickup={pickup} onPickupChange={value => { setPickup(value); setPeriod(current => current ? { ...current, pickup: value } : null); }} currency={data.tenant.currency} type={type} onTypeChange={setType} types={Array.from(new Set(data.assets.map((asset) => asset.asset_type)))} timezone={data.tenant.timezone} datesEnabled={data.booking_enabled && !data.preview} />
        <section aria-labelledby="park-catalog-title" className="mt-8"><h2 id="park-catalog-title" className="text-xl font-semibold">{period ? pt("Доступно на ваши даты") : pt("Выберите транспорт")}</h2><p role="status" className="mb-4 mt-1 text-sm text-slate-600">{checking ? pt("Проверяем наличие…") : pt("Найдено: {0}", [assets.length])}{period && !checking ? pt(" · {0} суток", [paidRentalDays(period)]) : ''}</p>
          {checking ? <p role="status" className="py-8 text-slate-600">{pt("Проверяем свободные машины на выбранные даты…")}</p> : availabilityError ? <div role="alert" className="py-6"><p>{availabilityError}</p><Button variant="outline" className="mt-3" onClick={() => setAvailabilityReload((value) => value + 1)}>{pt("Повторить поиск")}</Button></div> : assets.length ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">{assets.map((asset) => <AssetCard key={asset.id} asset={asset} tenantId={tenantId} currency={data.tenant.currency} preview={preview} bookingEnabled={data.booking_enabled} period={period} pickup={pickup} rental={catalogRentalPrice(availability, period, asset.id)} onBooked={() => setAvailabilityReload((value) => value + 1)} />)}</div> : <div className="rounded-xl bg-white px-5 py-10 text-center"><CarFront aria-hidden="true" className="mx-auto text-slate-500" /><p className="mt-3 font-medium">{data.assets.length ? period ? pt("На эти даты подходящий транспорт не найден") : pt("По вашему запросу ничего не найдено") : pt("Транспорт пока не опубликован")}</p>{data.assets.length > 0 && <Button variant="outline" className="mt-4" onClick={() => { setType('all'); setPeriod(null); }}>{pt("Сбросить фильтры")}</Button>}</div>}
        </section><p className="mt-8 text-sm text-slate-600">{data.booking_enabled ? pt("Откройте карточку транспорта, чтобы проверить даты и отправить заявку.") : pt("Бронирование на этой витрине ещё не включено.")}</p>
      </>}
    </div>
  </main>;
}

export default function ParkStorefrontPage({ ownerEntry = false }: { ownerEntry?: boolean }) {
  const { pt, intlLocale } = useParkLocale();
  const { tenantId = '' } = useParams();
  return <ParkStorefront key={`${tenantId}:${ownerEntry}`} tenantId={tenantId} ownerEntry={ownerEntry} />;
}
