import { parkText as pt } from '@/lib/park-locale';
import { useParkLocale } from '@/contexts/park-locale';
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, CarFront, CalendarDays, CheckCircle2, ClipboardList, Eye, EyeOff, ImageIcon, Loader2, Plus, RefreshCw, Store, WalletCards, Banknote, Save, X, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PlatformParkTelegramPanel } from './PlatformParkTelegramPanel';
import { PlatformParkWebAccessPanel } from './PlatformParkWebAccessPanel';
import { ParkBookingCalendar } from './ParkBookingCalendar';
import { ParkRequestsPanel } from './ParkRequestsPanel';
import { ParkTrialStatus } from './ParkTrialStatus';
import { VehicleDetailsEditor, VehicleSpecSummary } from './VehicleDetailsEditor';
import { ParkDateField } from './ParkDateField';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ParkFormSheet, ParkFormSheetContent } from './ParkFormSheet';
import { activeVehicleGrid, minimumVehicleRate, vehiclePricingMode } from '@/lib/vehicle-pricing';
import { FleetCardActions, FleetPhotoActions } from './FleetCardActions';
import { useFleetAvailability } from '@/hooks/useFleetAvailability';
import { fleetPeriodError, isFleetAssetFree } from '@/lib/fleet-availability';
import { fleetBasicInput } from '@/lib/fleet-asset';
import { fetchOwnerFleet, saveOwnerAsset, uploadOwnerPhoto, archiveOwnerAsset, loadOwnerMedia } from '@/api/park-owner-fleet';
import { VehicleCardFrame } from '@/components/VehicleCardFrame';
import { CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  AssetType, PlatformAsset, PlatformAssetInput, PlatformTenant, archivePlatformAsset,
  listPlatformAssets, loadPlatformMedia, savePlatformAsset,
  uploadPlatformLogo, uploadPlatformPhoto,
  createStorefrontPreview,
} from "@/api/platform-admin";

const TYPES: Record<AssetType, string> = {
  car: "Автомобиль", scooter: "Электросамокат", motorcycle: "Мотоцикл / скутер",
  bicycle: "Велосипед", snowmobile: "Снегоход", other: "Другая техника",
};
const blank = (type: AssetType): PlatformAssetInput => ({ name: "", asset_type: type, brand: "", model: "", year: null, color: "", daily_rate: 0, deposit: 0, public: false });
const minimumRate = minimumVehicleRate;
const message = (error: unknown) => error instanceof Error ? error.message : pt("Не удалось сохранить. Повторите попытку.");
const primaryButton = "min-h-11 rounded-lg bg-blue-700 text-white hover:bg-blue-800";
const workspaceTab = "min-h-11 flex-col gap-1 rounded-lg px-2 py-2 text-xs text-slate-600 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:shadow-none hover:bg-blue-50 focus-visible:ring-blue-700";

function validateImage(file: File) {
  if (!file.size || file.size > 8 * 1024 * 1024) throw new Error(pt("{0}: размер должен быть не больше 8 МБ", [file.name]));
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error(pt("{0}: выберите JPEG, PNG или WebP", [file.name]));
}

export function PrivateImage({ tenantId, reference, alt, className, owner = false }: { tenantId: string; reference: string; alt: string; className: string; owner?: boolean }) {
  const { pt, intlLocale } = useParkLocale();
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    setUrl("");
    setFailed(false);
    (owner ? loadOwnerMedia : loadPlatformMedia)(tenantId, reference, controller.signal).then((blob) => {
      if (!controller.signal.aborted) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [tenantId, reference, owner]);
  return url ? <img src={url} alt={alt} className={className} /> : <div className={`${className} grid place-items-center bg-slate-100 text-xs text-slate-600`} role="img" aria-label={alt}>{failed ? pt("Фото недоступно") : <Loader2 className="animate-spin" aria-hidden="true" />}</div>;
}

export function PlatformTenantWorkspace({ tenant, onBack, onTenantChanged, owner = false, onViewStorefront, hideHeaderLogo = false }: {
  tenant: PlatformTenant; onBack: () => void; onTenantChanged: (tenant: PlatformTenant) => void; owner?: boolean; onViewStorefront?: () => void; hideHeaderLogo?: boolean;
}) {
  const { pt, intlLocale } = useParkLocale();
  const [assets, setAssets] = useState<PlatformAsset[]>([]);
  const [section, setSection] = useState('requests');
  const [calendarVisited, setCalendarVisited] = useState(false);
  const [requestsVisited, setRequestsVisited] = useState(true);
  const [calendarRevision, setCalendarRevision] = useState(0);
  const filterId = useId();
  const [fleetPeriod, setFleetPeriod] = useState({ start: '', end: '' });
  const [fleetFilterRevision, setFleetFilterRevision] = useState(0);
  const changeFleetPeriod = (period: { start: string; end: string }) => { setFleetPeriod(period); setFleetFilterRevision(value => value + 1); };
  const periodError = fleetPeriodError(fleetPeriod);
  const filterActive = Boolean(fleetPeriod.start && fleetPeriod.end && !periodError);
  const availability = useFleetAvailability(tenant.tenant_id, !owner, fleetPeriod.start, fleetPeriod.end, filterActive, calendarRevision + fleetFilterRevision);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<PlatformAsset | "new" | null>(null);
  const [detailEditor, setDetailEditor] = useState<{ asset: PlatformAsset; section: 'pricing' | 'specs' | 'description' } | null>(null);
  const detailTrigger = useRef<HTMLButtonElement>(null);
  const [editorError, setEditorError] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const editingId = editing === "new" ? "new" : editing?.id;
  useEffect(() => { if (editingId) nameInput.current?.focus(); }, [editingId]);
  const [form, setForm] = useState<PlatformAssetInput>(blank(tenant.primary_asset_type));
  const [archiveTarget, setArchiveTarget] = useState<PlatformAsset | null>(null);
  const [archiveError, setArchiveError] = useState("");
  const Heading = owner ? 'h2' : 'h1';
  const [uploadProgress, setUploadProgress] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const filteredAssets = !filterActive ? assets : availability.loading || availability.error ? [] : assets.filter(asset => isFleetAssetFree(asset.id, availability.bookings, fleetPeriod));
  const preview = async () => {
    setPreviewBusy(true); setPreviewError(""); setPreviewUrl("");
    try {
      const result = await createStorefrontPreview(tenant.tenant_id);
      setPreviewUrl(`/p/${encodeURIComponent(tenant.tenant_id)}#preview=${encodeURIComponent(result.token)}`);
    } catch (failure) { setPreviewError(message(failure)); }
    finally { setPreviewBusy(false); }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    setError("");
    setEditorError("");
    (owner ? fetchOwnerFleet(tenant.tenant_id).then((result) => result.assets) : listPlatformAssets(tenant.tenant_id)).then((items) => {
      if (active) setAssets(items);
    }).catch((failure) => { if (active) { setError(message(failure)); setLoadFailed(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tenant.tenant_id, reload, owner]);

  const replaceAsset = (asset: PlatformAsset) => {
    setAssets((current) => current.some((item) => item.id === asset.id)
      ? current.map((item) => item.id === asset.id ? asset : item) : [...current, asset]);
    setCalendarRevision((value) => value + 1);
  };

  const edit = (asset: PlatformAsset | "new") => {
    setEditing(asset);
    setError("");
    setEditorError("");
    setForm(asset === "new" ? blank(tenant.primary_asset_type) : {
      name: asset.name, asset_type: asset.asset_type, brand: asset.specs.brand || "", model: asset.specs.model || "",
      year: asset.specs.year || null, color: asset.specs.color || "", daily_rate: asset.pricing.daily_rate || 0, deposit: asset.deposit_policy.amount || 0,
      public: asset.public,
    });
    if (editingId === (asset === "new" ? "new" : asset.id)) nameInput.current?.focus();
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setEditorError("");
    try {
      const asset = await (owner ? saveOwnerAsset : savePlatformAsset)(tenant.tenant_id, fleetBasicInput(form), editing === "new" ? undefined : editing.id);
      replaceAsset(asset);
      setEditing(asset);
      toast.success(pt("Техника сохранена. Можно добавить фотографии."));
    } catch (failure) { setEditorError(message(failure)); }
    finally { setBusy(false); }
  };

  const visibility = async (asset: PlatformAsset) => {
    setBusy(true); setError('');
    try {
      const data = fleetBasicInput({ name: asset.name, asset_type: asset.asset_type, brand: asset.specs.brand || '', model: asset.specs.model || '', year: asset.specs.year || null, color: asset.specs.color || '', public: !asset.public });
      const saved = await (owner ? saveOwnerAsset : savePlatformAsset)(tenant.tenant_id, data, asset.id);
      replaceAsset(saved);
      if (editing !== 'new' && editing?.id === asset.id) { setEditing(saved); setForm(current => ({ ...current, public: saved.public })); }
    } catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  };

  const photos = async (asset: PlatformAsset, files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    setEditorError("");
    let completed = 0;
    try {
      if ((asset.photos.gallery?.length || 0) + files.length > 20) throw new Error(pt("Не больше 20 фотографий на одну машину"));
      files.forEach(validateImage);
      for (const [index, file] of files.entries()) {
        setUploadProgress(pt("Загружаем фото {0} из {1}", [index + 1, files.length]));
        const updated = await (owner ? uploadOwnerPhoto : uploadPlatformPhoto)(tenant.tenant_id, asset.id, file);
        replaceAsset(updated);
        setEditing(updated);
        completed++;
      }
      toast.success(pt("Загружено фотографий: {0}", [completed]));
    } catch (failure) { setEditorError(`${message(failure)}${completed ? pt(" Уже сохранено: {0}. Повторите загрузку оставшихся файлов.", [completed]) : ""}`); }
    finally { setBusy(false); setUploadProgress(""); }
  };

  const logo = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      validateImage(file);
      onTenantChanged(await uploadPlatformLogo(tenant.tenant_id, file));
      toast.success(pt("Логотип сохранён"));
    } catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  };

  const archive = async () => {
    if (!archiveTarget) return;
    setBusy(true);
    setArchiveError("");
    try {
      await (owner ? archiveOwnerAsset : archivePlatformAsset)(tenant.tenant_id, archiveTarget.id);
      setAssets((current) => current.filter((item) => item.id !== archiveTarget.id));
      setCalendarRevision((value) => value + 1);
      if (editing !== "new" && editing?.id === archiveTarget.id) setEditing(null);
      setArchiveTarget(null);
      toast.success(pt("Техника перенесена в архив"));
    } catch (failure) { setArchiveError(message(failure)); }
    finally { setBusy(false); }
  };

  return <div className={`${owner ? 'rounded-xl' : 'min-h-screen'} bg-slate-50 px-4 py-6 text-slate-950 selection:bg-blue-200 md:px-8 [&_button:not([data-compact-event])]:min-h-11 [&_input]:min-h-11`}>
    <div className="mx-auto max-w-6xl">
      {!owner && <Button variant="ghost" onClick={onBack} disabled={busy}><ArrowLeft aria-hidden="true" /> {pt(" Все прокаты")}</Button>}
      <header className="flex items-start gap-3 sm:gap-4">
        {!hideHeaderLogo && (tenant.branding?.logo ? <PrivateImage owner={owner} tenantId={tenant.tenant_id} reference={tenant.branding.logo} alt={pt("Логотип {0}", [tenant.name])} className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain p-1 sm:h-14 sm:w-14" /> : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700 sm:h-14 sm:w-14"><Store aria-hidden="true" className="h-6 w-6" /></div>)}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-4"><Heading className="min-w-0 flex-1 break-words text-xl font-semibold leading-tight tracking-tight sm:text-3xl">{tenant.name}</Heading>
            {owner && onViewStorefront ? <Button variant="outline" className="shrink-0 gap-2 rounded-lg border-blue-200 bg-white px-3 text-blue-700 hover:bg-blue-50" onClick={onViewStorefront}><Store aria-hidden="true" className="h-4 w-4" />{pt("Витрина")}</Button> : !owner && tenant.status !== 'draft' && <Button asChild variant="outline" className="shrink-0 gap-2 rounded-lg border-blue-200 bg-white px-3 text-blue-700 hover:bg-blue-50"><a href={`/p/${encodeURIComponent(tenant.tenant_id)}`} target="_blank" rel="noopener noreferrer"><Store aria-hidden="true" className="h-4 w-4" />{pt("Витрина")}</a></Button>}
          </div>
          <p className="mt-2 flex items-start gap-2 break-all text-xs leading-5 text-slate-600 sm:text-sm"><Globe aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />/{tenant.slug} · {tenant.currency} · {tenant.timezone}</p>
          <ParkTrialStatus tenant={tenant} />
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700"><CheckCircle2 aria-hidden="true" className={`h-3.5 w-3.5 ${tenant.status === 'draft' ? 'text-slate-500' : 'text-emerald-700'}`} />{tenant.status === "draft" ? pt("Черновик · триал ещё не начался") : pt("Парк опубликован")}</p>
        </div>
      </header>

      {!owner && <details className="mt-5"><summary className="min-h-11 cursor-pointer rounded-md py-3 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">{pt("Настройки подключения и оформления")}</summary>
      {!owner && <section className="mt-5 flex flex-wrap items-center gap-3" aria-label={pt("Витрина парка")}>
        <Button variant="outline" disabled={previewBusy || busy} onClick={() => void preview()}>{previewBusy ? pt("Готовим превью…") : pt("Подготовить превью витрины")}</Button>
        {previewUrl && <a className="rounded-md px-3 py-2 text-sm font-medium text-blue-700 underline underline-offset-4 focus-visible:outline focus-visible:outline-2" href={previewUrl} target="_blank" rel="noopener noreferrer">{pt("Открыть закрытое превью")}</a>}
        {(tenant.status === "trial" || tenant.status === "active") && <a className="rounded-md px-3 py-2 text-sm font-medium text-blue-700 underline underline-offset-4 focus-visible:outline focus-visible:outline-2" href={`/p/${encodeURIComponent(tenant.tenant_id)}`} target="_blank" rel="noopener noreferrer">{pt("Публичная витрина")}</a>}
        {previewError && <p role="alert" className="w-full text-sm text-rose-800">{pt(previewError)}</p>}
        <p className="w-full text-sm text-slate-600">{pt("Превью показывает черновики и действует 24 часа. Для публичной витрины включите «Показывать на витрине» в редакторе техники и опубликуйте парк.")}</p>
      </section>}

      {!owner && <PlatformParkWebAccessPanel key={`web-${tenant.tenant_id}`} tenant={tenant} />}
      {!owner && <PlatformParkTelegramPanel key={tenant.tenant_id} tenant={tenant} />}

      {!owner && <section className="mt-7 flex flex-wrap items-center gap-5 rounded-2xl bg-white p-5" aria-labelledby="branding-title">
        {tenant.branding?.logo ? <PrivateImage tenantId={tenant.tenant_id} reference={tenant.branding.logo} alt={pt("Логотип {0}", [tenant.name])} className="h-20 w-20 rounded-xl object-contain" /> : <div className="grid h-20 w-20 place-items-center rounded-xl bg-slate-100"><ImageIcon className="text-slate-500" aria-hidden="true" /></div>}
        <div className="min-w-0 flex-1"><h2 id="branding-title" className="font-semibold">{pt("Логотип проката")}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{pt("JPEG, PNG или WebP до 8 МБ. Внутри парка сохраняются оригинал и версия для витрины.")}</p></div>
        <div><Label htmlFor="tenant-logo" className="mb-2 block">{tenant.branding?.logo ? pt("Заменить логотип") : pt("Загрузить логотип")}</Label><Input id="tenant-logo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || loading || loadFailed} className="max-w-64" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void logo(file); }} /></div>
      </section>}
      </details>}

      <Tabs value={section} onValueChange={(value) => { setSection(value); if (value === 'calendar') setCalendarVisited(true); if (value === 'requests') setRequestsVisited(true); setCalendarRevision(current => current + 1); }} activationMode="manual" className="mt-6 min-w-0">
        <TabsList aria-label={pt("Управление парком")} className="mx-auto grid h-auto w-full max-w-xl grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1">
          <TabsTrigger value="requests" className={workspaceTab}><ClipboardList aria-hidden="true" className="h-4 w-4" />{pt("Заявки")}</TabsTrigger>
          <TabsTrigger value="calendar" className={workspaceTab}><CalendarDays aria-hidden="true" className="h-4 w-4" />{pt("Календарь")}</TabsTrigger>
          <TabsTrigger value="fleet" className={workspaceTab}><CarFront aria-hidden="true" className="h-4 w-4" />{pt("Автопарк")}</TabsTrigger>
        </TabsList>
        <TabsContent value="fleet" forceMount hidden={section !== 'fleet'} className="mt-6 data-[state=inactive]:hidden">
      <section aria-labelledby="fleet-title">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="fleet-title" className="text-xl font-semibold">{pt("Техника парка")}</h2><p className="mt-1 text-sm text-slate-600">{loading || loadFailed ? pt("Количество уточняется") : pt("{0} единиц", [assets.length])} {pt(" · для первого демо подготовьте 5")}</p></div><Button className={primaryButton} onClick={() => edit("new")} disabled={busy || loading || loadFailed}><Plus aria-hidden="true" /> {pt(" Добавить технику")}</Button></div>
        <fieldset className="mt-5 min-w-0"><legend className="mb-3 flex items-center gap-2 text-sm font-medium"><CalendarDays aria-hidden="true" className="size-4" />{pt("Свободная техника на даты")}</legend><div className="flex flex-wrap items-end gap-3">
          {([['start', 'Дата начала'], ['end', 'Дата окончания']] as const).map(([key, label]) => <div key={key} className="min-w-0 flex-1"><Label htmlFor={`${filterId}-${key}`}>{pt(label)}</Label><ParkDateField id={`${filterId}-${key}`} value={fleetPeriod[key]} min={key === 'end' ? fleetPeriod.start || undefined : undefined} onChange={event => changeFleetPeriod({ ...fleetPeriod, [key]: event.target.value })} aria-invalid={Boolean(periodError)} aria-describedby={`${filterId}-hint${periodError ? ` ${filterId}-error` : ''}`} className="mt-2" /></div>)}
          <Button type="button" variant="outline" className="min-h-11 gap-2" disabled={!fleetPeriod.start && !fleetPeriod.end} onClick={() => changeFleetPeriod({ start: '', end: '' })}><X aria-hidden="true" className="size-4" />{pt("Сбросить")}</Button>
        </div><p id={`${filterId}-hint`} className="mt-2 text-sm leading-6 text-slate-600">{pt("Выберите обе даты — покажем только свободную технику. День возврата свободен. Часовой пояс: ")}{tenant.timezone}.</p>{periodError && <p id={`${filterId}-error`} role="alert" className="mt-2 text-sm text-red-800">{periodError}</p>}</fieldset>
        {filterActive && (availability.loading ? <p role="status" className="mt-4 text-sm text-slate-600">{pt("Проверяем занятость…")}</p> : availability.error ? <div className="mt-4"><p role="alert" className="text-sm text-red-800">{pt("Не удалось проверить занятость. ")}{availability.error}</p><Button type="button" variant="outline" className="mt-2 min-h-11" onClick={availability.retry}>{pt("Повторить проверку")}</Button></div> : !loading && !loadFailed && <p role="status" className="mt-4 text-sm text-slate-700">{pt("Свободно: ")}{filteredAssets.length} {pt(" из ")}{assets.length}</p>)}
        {error && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-800"><span>{pt(error)}</span><Button variant="outline" disabled={busy} onClick={() => setReload((value) => value + 1)}><RefreshCw aria-hidden="true" /> {pt(" Обновить данные")}</Button></div>}
        {loading ? <p role="status" className="py-8 text-slate-600">{pt("Загружаем данные парка…")}</p> : loadFailed ? null : <>
          {assets.length === 0 && !editing && <div className="mt-4 rounded-2xl bg-white p-8 text-center"><CarFront className="mx-auto text-slate-500" aria-hidden="true" /><p className="mt-3 font-medium">{pt("Добавьте первую машину")}</p><p className="mt-2 text-sm text-slate-600">{pt("Название, характеристики и фотографии. Тарифы — в разделе «Цены».")}</p></div>}
          {filterActive && !availability.loading && !availability.error && assets.length > 0 && !filteredAssets.length && <p className="mt-4 text-sm text-slate-600">{pt("На выбранный период свободной техники нет. Измените даты или сбросьте фильтр.")}</p>}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAssets.map((asset) => <VehicleCardFrame key={asset.id} assetId={asset.id} media={<div className="relative">{asset.photos.main ? <PrivateImage owner={owner} tenantId={tenant.tenant_id} reference={asset.photos.main} alt={asset.name} className="aspect-[16/10] w-full object-cover" /> : <div className="grid aspect-[16/10] place-items-center bg-slate-100"><CarFront className="text-slate-500" aria-hidden="true" /></div>}<FleetPhotoActions name={asset.name} busy={busy} onEdit={() => edit(asset)} onArchive={() => { setArchiveError(''); setArchiveTarget(asset); }} /></div>}>
              <CardContent className="flex flex-1 flex-col gap-4 p-4">
              <div className="min-w-0 flex-1"><h3 className="break-words text-lg font-semibold leading-snug">{asset.name}</h3><p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><CarFront aria-hidden="true" className="h-4 w-4 shrink-0" />{pt(TYPES[asset.asset_type])}</p><p className="mt-3 flex items-center gap-2 text-base font-semibold tabular-nums text-blue-700"><Banknote aria-hidden="true" className="h-4 w-4 shrink-0" />{activeVehicleGrid(asset) ? pt("от ") : ''}{minimumRate(asset).toLocaleString(intlLocale)} {tenant.currency}{pt("/день")}</p><p className="mt-2 flex items-center gap-2 text-sm tabular-nums text-slate-600"><WalletCards aria-hidden="true" className="h-4 w-4 shrink-0" />{pt("Депозит: ")}{asset.deposit_policy.amount || 0} {tenant.currency}</p></div>
              <VehicleSpecSummary specs={asset.specs} photoCount={asset.photos.gallery?.length || 0} />
              {activeVehicleGrid(asset) && <p className="text-sm text-slate-600">{vehiclePricingMode(asset) === 'duration' ? pt("Тарифы по сроку") : pt("Сезонная сетка")} {pt(" · 4 диапазона аренды")}</p>}
              <FleetCardActions name={asset.name} visible={asset.public} busy={busy} onDetails={(section, trigger) => { detailTrigger.current = trigger; setDetailEditor({ asset, section }); }} onVisibility={() => void visibility(asset)} />
              <p className={`flex items-center gap-2 text-sm ${asset.public ? 'text-emerald-700' : 'text-slate-600'}`}>{asset.public ? <Eye aria-hidden="true" className="h-4 w-4 shrink-0" /> : <EyeOff aria-hidden="true" className="h-4 w-4 shrink-0" />}{asset.public ? pt("Показывается клиентам") : pt("Скрыто с витрины")}</p>
              </CardContent></VehicleCardFrame>)}
          </div>
        </>}

        {editing && <ParkFormSheet open busy={busy} onOpenChange={open => { if (!open) setEditing(null); }}><ParkFormSheetContent header={<><DialogTitle className="break-words">{editing === "new" ? pt("Новая техника") : pt("Редактирование: {0}", [editing.name])}</DialogTitle><DialogDescription className="mt-2">{pt('Название для клиента')}</DialogDescription></>}><section>
          {editorError && <p role="alert" className="mt-3 text-sm text-rose-800">{pt(editorError)}</p>}
          <form onSubmit={save} className="mt-5">
            <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label htmlFor="asset-name">{pt("Название для клиента")}</Label><Input ref={nameInput} id="asset-name" required maxLength={160} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={pt("Toyota Yaris 2024, белый")} className="mt-2" /></div>
              <div><Label htmlFor="asset-kind">{pt("Тип транспорта")}</Label><select id="asset-kind" className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-cyan-600" value={form.asset_type} onChange={(e) => setForm({ ...form, asset_type: e.target.value as AssetType })}>{Object.entries(TYPES).map(([value, label]) => <option key={value} value={value}>{pt(label)}</option>)}</select></div>
              <div><Label htmlFor="asset-year">{pt("Год выпуска")}</Label><Input id="asset-year" type="number" min={1950} max={2100} value={form.year ?? ""} onChange={(e) => setForm({ ...form, year: e.target.value ? Number(e.target.value) : null })} className="mt-2" /></div>
              {([ ["brand", "Марка"], ["model", "Модель"], ["color", "Цвет"] ] as const).map(([field, label]) => <div key={field}><Label htmlFor={`asset-${field}`}>{pt(label)}</Label><Input id={`asset-${field}`} maxLength={80} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="mt-2" /></div>)}
              <div className="sm:col-span-2"><label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={Boolean(form.public)} onChange={(event) => setForm({ ...form, public: event.target.checked })} className="h-4 w-4 accent-blue-700 focus-visible:outline focus-visible:outline-2" />{pt("Показывать на витрине")}</label><p className="mt-2 text-sm text-slate-600">{pt("После публикации парка машина, её цены и фотографии станут доступны по публичной ссылке.")}</p></div>
            </fieldset>
            <p className="mt-4 text-sm text-slate-600">{pt("Цены и депозит настраиваются только через «Действия → Цены» в карточке. После создания техники настройте тарифы перед приёмом заявок.")}</p>
            <div className="park-sheet-actions mt-5 flex flex-wrap gap-3"><Button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800">{busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />} {pt(" Сохранить технику")}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}><X aria-hidden="true" />{pt("Закрыть редактор")}</Button></div>
          </form>
          {editing !== "new" && <div className="mt-7 border-t border-slate-200 pt-5">
            <Label htmlFor="asset-photos">{pt("Фотографии машины")}</Label><p id="photo-hint" className="mt-1 text-sm text-slate-600">{pt("Первая фотография станет главной. Можно выбрать несколько файлов; до 20 фото, каждое до 8 МБ.")}</p>
            <Input id="asset-photos" aria-describedby="photo-hint" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} className="mt-3" onChange={(event) => { const files = Array.from(event.target.files || []); event.target.value = ""; void photos(editing, files); }} />
            <p role="status" aria-live="polite" className="mt-2 text-sm text-slate-600">{pt(uploadProgress)}</p>
            <div className="mt-3 flex flex-wrap gap-3">{editing.photos.gallery?.map((reference, index) => <PrivateImage key={reference} owner={owner} tenantId={tenant.tenant_id} reference={reference} alt={pt("{0}, фото {1}", [editing.name, index + 1])} className="h-24 w-32 rounded-xl object-cover" />)}</div>
          </div>}
        </section></ParkFormSheetContent></ParkFormSheet>}
      </section>
        </TabsContent>
        {calendarVisited && <TabsContent value="calendar" forceMount hidden={section !== 'calendar'} className="mt-6 min-w-0 data-[state=inactive]:hidden">
          <ParkBookingCalendar key={`calendar-${tenant.tenant_id}`} tenantId={tenant.tenant_id} admin={!owner} fleetRevision={calendarRevision} timezone={tenant.timezone} />
        </TabsContent>}
        {requestsVisited && <TabsContent value="requests" forceMount hidden={section !== 'requests'} className="mt-6 min-w-0 data-[state=inactive]:hidden">
          <ParkRequestsPanel key={`requests-${tenant.tenant_id}`} tenantId={tenant.tenant_id} admin={!owner} assets={assets} revision={calendarRevision} onCreated={() => setCalendarRevision(value => value + 1)} />
        </TabsContent>}
      </Tabs>
    </div>
    <AlertDialog open={Boolean(archiveTarget)} onOpenChange={(open) => { if (!open && !busy) setArchiveTarget(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="break-words">{pt("Перенести ")}{archiveTarget?.name} {pt(" в архив?")}</AlertDialogTitle><AlertDialogDescription>{pt("Техника исчезнет из активного списка. Её данные и фотографии сохранятся.")}</AlertDialogDescription></AlertDialogHeader>{archiveError && <p role="alert" className="text-sm text-rose-800">{pt(archiveError)}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>{pt("Отмена")}</AlertDialogCancel><AlertDialogAction className={primaryButton} disabled={busy} onClick={(event) => { event.preventDefault(); void archive(); }}>{busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}{busy ? pt("Переносим…") : pt("В архив")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
    {detailEditor && <VehicleDetailsEditor key={`${detailEditor.asset.id}:${detailEditor.section}`} asset={detailEditor.asset} section={detailEditor.section} currency={tenant.currency} owner={owner} onRestoreFocus={() => detailTrigger.current?.focus()} onClose={() => setDetailEditor(null)} onSaved={asset => { replaceAsset(asset); if (editing !== 'new' && editing?.id === asset.id) { setEditing(asset); if (detailEditor.section === 'pricing') setForm(current => ({ ...current, deposit: asset.deposit_policy.amount ?? 0, daily_rate: asset.pricing.daily_rate ?? 0 })); } toast.success(pt("Данные автомобиля сохранены.")); }} />}
  </div>;
}
