import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, CarFront, ImageIcon, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { fetchStorefront, Storefront, StorefrontAsset, storefrontMediaUrl } from '@/api/storefront';
import heroBg from '@/assets/hero_bg.jpg.webp';
import heroMob from '@/assets/hero_mob.jpg.webp';

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

function AssetCard({ asset, tenantId, currency, preview }: { asset: StorefrontAsset; tenantId: string; currency: string; preview: string }) {
  const [photo, setPhoto] = useState(0);
  const price = (amount: number) => {
    try { return new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); }
    catch { return `${amount.toLocaleString('ru-RU')} ${currency}`; }
  };
  return <Card className="flex min-w-0 flex-col overflow-hidden border-0 shadow-soft">
    <StorefrontImage tenantId={tenantId} reference={asset.photos[0]} preview={preview} alt={asset.name} className="aspect-[16/10] w-full object-cover" />
    <CardContent className="flex flex-1 flex-col p-4">
      <p className="mb-2 text-xs text-slate-600">{types[asset.asset_type] || 'Транспорт'}</p>
      <h3 className="break-words text-lg font-semibold leading-tight">{asset.name}</h3>
      <p className="mt-1 text-sm text-slate-600">{[asset.specs.brand, asset.specs.model, asset.specs.year, asset.specs.color].filter(Boolean).join(' · ')}</p>
      <div className="mt-auto pt-5"><p className="break-words text-2xl font-bold tabular-nums text-blue-700">{asset.daily_rate ? price(asset.daily_rate) : 'Цена по запросу'}</p>{Boolean(asset.daily_rate) && <p className="text-sm text-slate-600">за сутки</p>}<p className="mt-2 text-xs text-slate-600">{asset.deposit !== null ? `Депозит: ${price(asset.deposit)}` : 'Депозит уточняется'}</p></div>
      <Dialog onOpenChange={(open) => { if (open) setPhoto(0); }}>
        <DialogTrigger asChild><Button className={`mt-4 w-full rounded-xl ${actionClass}`} aria-label={`Посмотреть ${asset.name}`}>Посмотреть <ArrowRight aria-hidden="true" className="h-4 w-4" /></Button></DialogTrigger>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-xl p-4 sm:p-6">
          <DialogTitle className="break-words pr-8 leading-snug">{asset.name}</DialogTitle>
          <DialogDescription>Фотографии и базовая цена парка. Бронирование через эту витрину пока не подключено.</DialogDescription>
          <StorefrontImage key={asset.photos[photo]} tenantId={tenantId} reference={asset.photos[photo]} preview={preview} alt={`${asset.name}, фото ${photo + 1}`} className="aspect-[4/3] max-h-[50dvh] w-full rounded-lg object-contain" />
          {asset.photos.length > 1 && <div className="flex items-center justify-between gap-2"><Button variant="outline" aria-label="Предыдущее фото" onClick={() => setPhoto((value) => (value - 1 + asset.photos.length) % asset.photos.length)}><ArrowLeft aria-hidden="true" /></Button><p role="status" className="text-sm tabular-nums">Фото {photo + 1} из {asset.photos.length}</p><Button variant="outline" aria-label="Следующее фото" onClick={() => setPhoto((value) => (value + 1) % asset.photos.length)}><ArrowRight aria-hidden="true" /></Button></div>}
          <p className="font-semibold tabular-nums">{asset.daily_rate ? `${price(asset.daily_rate)} / сутки` : 'Цена по запросу'}{asset.deposit !== null ? ` · депозит ${price(asset.deposit)}` : ''}</p>
        </DialogContent>
      </Dialog>
    </CardContent>
  </Card>;
}

function ParkStorefront({ tenantId }: { tenantId: string }) {
  const [preview] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('preview') || '');
  const [data, setData] = useState<Storefront | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
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
  const assets = useMemo(() => data?.assets.filter((asset) => (type === 'all' || asset.asset_type === type) && `${asset.name} ${asset.specs.brand || ''} ${asset.specs.model || ''}`.toLocaleLowerCase('ru').includes(search.trim().toLocaleLowerCase('ru'))) || [], [data, search, type]);
  const name = data?.tenant.name || 'Витрина проката';
  return <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 text-slate-950 selection:bg-cyan-200">
    <Helmet><html lang="ru" /><title>{name} — транспорт в аренду</title><meta name="robots" content="noindex, nofollow" /><meta name="referrer" content="no-referrer" /><meta name="description" content={`Каталог транспорта ${name}: фотографии и цены проката.`} /><link rel="canonical" href={`${window.location.origin}/p/${encodeURIComponent(tenantId)}`} /><meta property="og:type" content="website" /><meta property="og:title" content={`${name} — транспорт в аренду`} /><meta property="og:description" content={`Каталог транспорта ${name}: фотографии и цены проката.`} /><meta property="og:url" content={`${window.location.origin}/p/${encodeURIComponent(tenantId)}`} /><meta name="twitter:card" content="summary" /></Helmet>
    <header className="relative flex min-h-64 items-center justify-center overflow-hidden px-4 py-8 text-center text-white">
      <picture className="absolute inset-0"><source media="(max-width: 767px)" srcSet={heroMob} /><img src={heroBg} alt="" className="h-full w-full object-cover" /></picture><div className="absolute inset-0 bg-black/65" />
      <div className="relative mx-auto max-w-3xl">{data?.tenant.logo && <StorefrontImage tenantId={tenantId} reference={data.tenant.logo} preview={preview} alt={`Логотип ${name}`} className="mx-auto mb-3 h-16 w-16 rounded-xl bg-white object-contain p-1" />}<h1 className="break-words text-3xl font-bold sm:text-4xl">{name}</h1><p className="mt-3 text-base text-white">Транспорт, фотографии и цены вашего проката</p></div>
    </header>
    <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
      {data?.preview && <p role="status" className="mt-4 rounded-xl bg-amber-100 p-3 text-sm text-amber-950">Закрытое превью · здесь видны и неопубликованные машины. Ссылка действует 1 час и не даёт доступа к управлению парком.</p>}
      {loading ? <p role="status" aria-live="polite" className="py-12 text-center text-slate-600">Загружаем транспорт парка…</p> : error ? <div role="alert" className="py-12 text-center"><p className="text-slate-700">{error}</p><Button className={`mt-4 ${actionClass}`} onClick={() => setReload((value) => value + 1)}>Повторить загрузку</Button></div> : data && <>
        <section aria-label="Поиск транспорта" className="relative mt-5 grid gap-4 rounded-xl bg-white p-4 shadow-soft sm:grid-cols-2">
          <div><label htmlFor="park-search" className="mb-2 block text-sm font-medium">Марка или модель</label><div className="relative"><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-slate-500" /><Input id="park-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти транспорт" className="pl-9" /></div></div>
          <div><label htmlFor="park-type" className="mb-2 block text-sm font-medium">Тип транспорта</label><select id="park-type" value={type} onChange={(event) => setType(event.target.value)} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm focus:outline-cyan-700"><option value="all">Весь транспорт</option>{Array.from(new Set(data.assets.map((asset) => asset.asset_type))).map((value) => <option key={value} value={value}>{types[value] || value}</option>)}</select></div>
        </section>
        <section aria-labelledby="park-catalog-title" className="mt-8"><h2 id="park-catalog-title" className="text-xl font-semibold">Транспорт парка</h2><p role="status" className="mb-4 mt-1 text-sm text-slate-600">Показано: {assets.length} из {data.assets.length}</p>
          {assets.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{assets.map((asset) => <AssetCard key={asset.id} asset={asset} tenantId={tenantId} currency={data.tenant.currency} preview={preview} />)}</div> : <div className="rounded-xl bg-white px-5 py-10 text-center"><CarFront aria-hidden="true" className="mx-auto text-slate-500" /><p className="mt-3 font-medium">{data.assets.length ? 'По вашему запросу ничего не найдено' : 'Транспорт пока не опубликован'}</p>{data.assets.length > 0 && <Button variant="outline" className="mt-4" onClick={() => { setSearch(''); setType('all'); }}>Сбросить фильтры</Button>}</div>}
        </section><p className="mt-8 text-sm text-slate-600">Бронирование и проверка свободных дат пока не подключены.</p>
      </>}
    </div>
  </main>;
}

export default function ParkStorefrontPage() {
  const { tenantId = '' } = useParams();
  return <ParkStorefront key={tenantId} tenantId={tenantId} />;
}
