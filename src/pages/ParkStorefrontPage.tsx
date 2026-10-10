import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, CarFront, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { VehicleCardFrame } from '@/components/VehicleCardFrame';
import { ImageCarousel } from '@/components/CarCard';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { fetchStorefront, Storefront, StorefrontAsset, storefrontMediaUrl } from '@/api/storefront';
import HeroBanner from '@/components/HeroBanner';
import { ParkTelegramEntry, type ParkView } from '@/components/platform/ParkTelegramEntry';
import { ParkBookingForm } from '@/components/platform/ParkBookingForm';
import { ParkRentalFilters } from '@/components/platform/ParkRentalFilters';
import { fetchParkAvailability, ParkAvailability } from '@/api/park-telegram';
import { ParkRentalPeriod, rentalDays, rentalMoney } from '@/lib/park-rental';

const types: Record<string, string> = { car: 'Автомобили', scooter: 'Электросамокаты', motorcycle: 'Мотоциклы / скутеры', bicycle: 'Велосипеды', snowmobile: 'Снегоходы', other: 'Другая техника' };
const actionClass = 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white hover:from-cyan-700 hover:to-blue-800';

function StorefrontImage({ tenantId, reference, preview, alt, className }: { tenantId: string; reference?: string | null; preview: string; alt: string; className: string }) {
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
    : <div className={`${className} flex flex-col items-center justify-center gap-2 bg-slate-100 text-slate-600`} role="img" aria-label={alt}><ImageIcon aria-hidden="true" /><span className="text-xs">{failed ? 'Фото недоступно' : reference ? 'Загружаем фото…' : 'Фото пока нет'}</span></div>;
}

function AssetCard({ asset, tenantId, currency, preview, bookingEnabled, period, onBooked }: { asset: StorefrontAsset; tenantId: string; currency: string; preview: string; bookingEnabled: boolean; period: ParkRentalPeriod | null; onBooked: () => void }) {
  const [photo, setPhoto] = useState(0);
  const [created, setCreated] = useState(false);
  const days = period ? rentalDays(period) : 0;
  const price = (amount: number) => {
    try { return new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); }
    catch { return `${amount.toLocaleString('ru-RU')} ${currency}`; }
  };
  return <VehicleCardFrame assetId={asset.id} media={<div className="relative aspect-[16/10] overflow-hidden">
    <ImageCarousel photos={asset.photos} carName={asset.name} carId={`${tenantId}:${asset.id}`} t={() => 'Фото пока нет'} renderPhoto={(reference, index) => <StorefrontImage tenantId={tenantId} reference={reference} preview={preview} alt={`${asset.name}, фото ${index + 1}`} className="h-full w-full object-cover" />} />
  </div>}>
    <CardContent className="flex flex-1 flex-col p-4">
      <h3 className="break-words text-lg font-semibold leading-tight">{asset.name}</h3>
      <p className="mt-1 text-sm text-slate-600">{[asset.specs.brand, asset.specs.model, asset.specs.year, asset.specs.color].filter(Boolean).join(' · ')}</p>
      <p className="mt-3 text-xs text-slate-600">{types[asset.asset_type] || 'Транспорт'}</p>
      <div className="mt-auto pt-5"><p className="break-words text-2xl font-bold tabular-nums text-blue-700">{asset.daily_rate ? price(asset.daily_rate * (days || 1)) : 'Цена по запросу'}</p>{Boolean(asset.daily_rate) && <p className="text-sm text-slate-600">{days ? `${price(asset.daily_rate)} / сутки · за ${days} суток` : 'за сутки'}</p>}{days > 0 && <p className="mt-1 text-xs text-slate-600">Ориентир; точный расчёт подтвердит сервер</p>}<p className="mt-2 text-sm text-slate-600">{asset.deposit !== null ? `Депозит отдельно: ${price(asset.deposit)}` : 'Депозит уточняется'}</p></div>
      <Dialog onOpenChange={(open) => { if (open) { setPhoto(0); setCreated(false); } else if (created) onBooked(); }}>
        <DialogTrigger asChild><Button className={`mt-4 min-h-12 w-full rounded-xl ${actionClass}`} aria-label={`${period && bookingEnabled ? 'Выбрать' : 'Посмотреть'} ${asset.name}`}>{period && bookingEnabled ? 'Выбрать транспорт' : 'Посмотреть'} <ArrowRight aria-hidden="true" className="h-4 w-4" /></Button></DialogTrigger>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-xl p-4 sm:p-6">
          <DialogTitle className="break-words pr-8 leading-snug">{asset.name}</DialogTitle>
          <DialogDescription>{period ? 'Проверьте автомобиль и условия на выбранные даты.' : 'Посмотрите фотографии и выберите даты для расчёта аренды.'}</DialogDescription>
          <StorefrontImage key={asset.photos[photo]} tenantId={tenantId} reference={asset.photos[photo]} preview={preview} alt={`${asset.name}, фото ${photo + 1}`} className="aspect-[4/3] max-h-[50dvh] w-full rounded-lg object-contain" />
          {asset.photos.length > 1 && <div className="flex items-center justify-between gap-2"><Button variant="outline" aria-label="Предыдущее фото" onClick={() => setPhoto((value) => (value - 1 + asset.photos.length) % asset.photos.length)}><ArrowLeft aria-hidden="true" /></Button><p role="status" className="text-sm tabular-nums">Фото {photo + 1} из {asset.photos.length}</p><Button variant="outline" aria-label="Следующее фото" onClick={() => setPhoto((value) => (value + 1) % asset.photos.length)}><ArrowRight aria-hidden="true" /></Button></div>}
          <p className="font-semibold tabular-nums">{asset.daily_rate ? `${price(asset.daily_rate)} / сутки` : 'Цена по запросу'}{asset.deposit !== null ? ` · депозит ${price(asset.deposit)}` : ''}</p>
          {bookingEnabled && !preview && <ParkBookingForm key={`${asset.id}:${period?.start}:${period?.end}`} tenantId={tenantId} assetId={asset.id} initialPeriod={period} onCreated={() => setCreated(true)} />}
        </DialogContent>
      </Dialog>
    </CardContent>
  </VehicleCardFrame>;
}

function ParkStorefront({ tenantId }: { tenantId: string }) {
  const [preview] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('preview') || '');
  const [view, setView] = useState<ParkView>(() => !preview && window.Telegram?.WebApp?.initData ? 'checking' : 'client');
  const [data, setData] = useState<Storefront | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
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
    fetchParkAvailability(tenantId, period.start, period.end, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setAvailability(result); })
      .catch((failure) => { if (!controller.signal.aborted) setAvailabilityError(failure instanceof Error ? failure.message : 'Не удалось проверить наличие.'); })
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
      .catch((failure) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Не удалось загрузить витрину'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tenantId, preview, reload]);
  const assets = useMemo(() => data?.assets.filter((asset) => (!period || (availability?.start_date === period.start && availability.end_date === period.end && availability.available_asset_ids.includes(asset.id))) && (type === 'all' || asset.asset_type === type) && `${asset.name} ${asset.specs.brand || ''} ${asset.specs.model || ''}`.toLocaleLowerCase('ru').includes(search.trim().toLocaleLowerCase('ru'))) || [], [data, search, type, period, availability]);
  const name = data?.tenant.name || 'Витрина проката';
  const rates = data?.assets.map((asset) => asset.daily_rate).filter((rate): rate is number => rate !== null && rate > 0) || [];
  return <main className={`min-h-screen text-slate-950 selection:bg-blue-200 ${view === 'owner' || view === 'checking' ? 'bg-slate-50' : 'bg-gradient-to-br from-blue-50 via-white to-orange-50'}`}>
    <Helmet><html lang="ru" /><title>{name} — транспорт в аренду</title><meta name="robots" content="noindex, nofollow" /><meta name="referrer" content="no-referrer" /><meta name="description" content={`Каталог транспорта ${name}: фотографии и цены проката.`} /><link rel="canonical" href={`${window.location.origin}/p/${encodeURIComponent(tenantId)}`} /><meta property="og:type" content="website" /><meta property="og:title" content={`${name} — транспорт в аренду`} /><meta property="og:description" content={`Каталог транспорта ${name}: фотографии и цены проката.`} /><meta property="og:url" content={`${window.location.origin}/p/${encodeURIComponent(tenantId)}`} /><meta name="twitter:card" content="summary" /></Helmet>
    {data && !data.preview && <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"><ParkTelegramEntry key={tenantId} tenantId={tenantId} view={view} onViewChange={setView} /></div>}
    {view === 'client' && <header><HeroBanner park={{ name, minimumPrice: data && rates.length ? rentalMoney(Math.min(...rates), data.tenant.currency) : null, logo: data?.tenant.logo ? <StorefrontImage tenantId={tenantId} reference={data.tenant.logo} preview={preview} alt={`Логотип ${name}`} className="mx-auto mb-2 h-10 w-10 rounded-lg bg-white object-contain p-1" /> : undefined }} /></header>}
    <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
      {data?.preview && <p role="status" className="mt-4 rounded-xl bg-amber-100 p-3 text-sm text-amber-950">Закрытое превью · здесь видны и неопубликованные машины. Ссылка действует 24 часа и не даёт доступа к управлению парком.</p>}
      {loading ? <p role="status" aria-live="polite" className="py-12 text-center text-slate-600">Загружаем транспорт парка…</p> : error ? <div role="alert" className="py-12 text-center"><p className="text-slate-700">{error}</p><Button className={`mt-4 ${actionClass}`} onClick={() => setReload((value) => value + 1)}>Повторить загрузку</Button></div> : data && view === 'client' && <>
        <ParkRentalFilters period={period} onPeriodChange={setPeriod} search={search} onSearchChange={setSearch} type={type} onTypeChange={setType} types={Array.from(new Set(data.assets.map((asset) => asset.asset_type)))} timezone={data.tenant.timezone} datesEnabled={data.booking_enabled && !data.preview} />
        <section aria-labelledby="park-catalog-title" className="mt-8"><h2 id="park-catalog-title" className="text-xl font-semibold">{period ? 'Доступно на ваши даты' : 'Выберите транспорт'}</h2><p role="status" className="mb-4 mt-1 text-sm text-slate-600">{checking ? 'Проверяем наличие…' : `Найдено: ${assets.length}`}{period && !checking ? ` · ${rentalDays(period)} суток` : ''}</p>
          {checking ? <p role="status" className="py-8 text-slate-600">Проверяем свободные машины на выбранные даты…</p> : availabilityError ? <div role="alert" className="py-6"><p>{availabilityError}</p><Button variant="outline" className="mt-3" onClick={() => setAvailabilityReload((value) => value + 1)}>Повторить поиск</Button></div> : assets.length ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">{assets.map((asset) => <AssetCard key={asset.id} asset={asset} tenantId={tenantId} currency={data.tenant.currency} preview={preview} bookingEnabled={data.booking_enabled} period={period} onBooked={() => setAvailabilityReload((value) => value + 1)} />)}</div> : <div className="rounded-xl bg-white px-5 py-10 text-center"><CarFront aria-hidden="true" className="mx-auto text-slate-500" /><p className="mt-3 font-medium">{data.assets.length ? period ? 'На эти даты подходящий транспорт не найден' : 'По вашему запросу ничего не найдено' : 'Транспорт пока не опубликован'}</p>{data.assets.length > 0 && <Button variant="outline" className="mt-4" onClick={() => { setSearch(''); setType('all'); setPeriod(null); }}>Сбросить фильтры</Button>}</div>}
        </section><p className="mt-8 text-sm text-slate-600">{data.booking_enabled ? 'Откройте карточку транспорта, чтобы проверить даты и отправить заявку через Telegram.' : 'Бронирование на этой витрине ещё не включено.'}</p>
      </>}
    </div>
  </main>;
}

export default function ParkStorefrontPage() {
  const { tenantId = '' } = useParams();
  return <ParkStorefront key={tenantId} tenantId={tenantId} />;
}
