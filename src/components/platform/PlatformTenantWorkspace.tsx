import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, CarFront, ImageIcon, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PlatformParkTelegramPanel } from './PlatformParkTelegramPanel';
import { ParkBookingCalendar } from './ParkBookingCalendar';
import { ParkTrialStatus } from './ParkTrialStatus';
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
const message = (error: unknown) => error instanceof Error ? error.message : "Не удалось сохранить. Повторите попытку.";
const primaryButton = "bg-[#0d1b2a] text-white hover:bg-[#17324a]";

function validateImage(file: File) {
  if (!file.size || file.size > 8 * 1024 * 1024) throw new Error(`${file.name}: размер должен быть не больше 8 МБ`);
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error(`${file.name}: выберите JPEG, PNG или WebP`);
}

function PrivateImage({ tenantId, reference, alt, className, owner = false }: { tenantId: string; reference: string; alt: string; className: string; owner?: boolean }) {
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
  return url ? <img src={url} alt={alt} className={className} /> : <div className={`${className} grid place-items-center bg-slate-100 text-xs text-slate-600`} role="img" aria-label={alt}>{failed ? "Фото недоступно" : <Loader2 className="animate-spin" aria-hidden="true" />}</div>;
}

export function PlatformTenantWorkspace({ tenant, onBack, onTenantChanged, owner = false }: {
  tenant: PlatformTenant; onBack: () => void; onTenantChanged: (tenant: PlatformTenant) => void; owner?: boolean;
}) {
  const [assets, setAssets] = useState<PlatformAsset[]>([]);
  const [section, setSection] = useState('fleet');
  const [calendarVisited, setCalendarVisited] = useState(false);
  const [calendarRevision, setCalendarRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<PlatformAsset | "new" | null>(null);
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
      const asset = await (owner ? saveOwnerAsset : savePlatformAsset)(tenant.tenant_id, form, editing === "new" ? undefined : editing.id);
      replaceAsset(asset);
      setEditing(asset);
      toast.success("Техника сохранена. Можно добавить фотографии.");
    } catch (failure) { setEditorError(message(failure)); }
    finally { setBusy(false); }
  };

  const photos = async (asset: PlatformAsset, files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    setEditorError("");
    let completed = 0;
    try {
      if ((asset.photos.gallery?.length || 0) + files.length > 20) throw new Error("Не больше 20 фотографий на одну машину");
      files.forEach(validateImage);
      for (const [index, file] of files.entries()) {
        setUploadProgress(`Загружаем фото ${index + 1} из ${files.length}`);
        const updated = await (owner ? uploadOwnerPhoto : uploadPlatformPhoto)(tenant.tenant_id, asset.id, file);
        replaceAsset(updated);
        setEditing(updated);
        completed++;
      }
      toast.success(`Загружено фотографий: ${completed}`);
    } catch (failure) { setEditorError(`${message(failure)}${completed ? ` Уже сохранено: ${completed}. Повторите загрузку оставшихся файлов.` : ""}`); }
    finally { setBusy(false); setUploadProgress(""); }
  };

  const logo = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      validateImage(file);
      onTenantChanged(await uploadPlatformLogo(tenant.tenant_id, file));
      toast.success("Логотип сохранён");
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
      toast.success("Техника перенесена в архив");
    } catch (failure) { setArchiveError(message(failure)); }
    finally { setBusy(false); }
  };

  return <div className={`${owner ? 'rounded-xl' : 'min-h-screen'} bg-[#f4f6f8] px-4 py-6 text-slate-950 selection:bg-cyan-200 md:px-8`}>
    <div className="mx-auto max-w-6xl">
      {!owner && <Button variant="ghost" onClick={onBack} disabled={busy}><ArrowLeft aria-hidden="true" /> Все прокаты</Button>}
      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><Heading className="break-words text-3xl font-semibold tracking-[-0.03em]">{tenant.name}</Heading><p className="mt-2 break-all text-sm text-slate-600">/{tenant.slug} · {tenant.currency} · {tenant.timezone}</p></div>
        <span className="rounded-full bg-slate-200 px-3 py-1 text-sm">{tenant.status === "draft" ? "Черновик · триал ещё не начался" : "Парк опубликован"}</span>
      </header>
      <ParkTrialStatus tenant={tenant} />

      {!owner && <details className="mt-5"><summary className="min-h-11 cursor-pointer rounded-md py-3 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">Настройки подключения и оформления</summary>
      {!owner && <section className="mt-5 flex flex-wrap items-center gap-3" aria-label="Витрина парка">
        <Button variant="outline" disabled={previewBusy || busy} onClick={() => void preview()}>{previewBusy ? "Готовим превью…" : "Подготовить превью витрины"}</Button>
        {previewUrl && <a className="rounded-md px-3 py-2 text-sm font-medium text-blue-700 underline underline-offset-4 focus-visible:outline focus-visible:outline-2" href={previewUrl} target="_blank" rel="noopener noreferrer">Открыть закрытое превью</a>}
        {(tenant.status === "trial" || tenant.status === "active") && <a className="rounded-md px-3 py-2 text-sm font-medium text-blue-700 underline underline-offset-4 focus-visible:outline focus-visible:outline-2" href={`/p/${encodeURIComponent(tenant.tenant_id)}`} target="_blank" rel="noopener noreferrer">Публичная витрина</a>}
        {previewError && <p role="alert" className="w-full text-sm text-rose-800">{previewError}</p>}
        <p className="w-full text-sm text-slate-600">Превью показывает черновики и действует 1 час. Для публичной витрины включите «Показывать на витрине» в редакторе техники и опубликуйте парк.</p>
      </section>}

      {!owner && <PlatformParkTelegramPanel key={tenant.tenant_id} tenant={tenant} />}

      {!owner && <section className="mt-7 flex flex-wrap items-center gap-5 rounded-2xl bg-white p-5" aria-labelledby="branding-title">
        {tenant.branding?.logo ? <PrivateImage tenantId={tenant.tenant_id} reference={tenant.branding.logo} alt={`Логотип ${tenant.name}`} className="h-20 w-20 rounded-xl object-contain" /> : <div className="grid h-20 w-20 place-items-center rounded-xl bg-slate-100"><ImageIcon className="text-slate-500" aria-hidden="true" /></div>}
        <div className="min-w-0 flex-1"><h2 id="branding-title" className="font-semibold">Логотип проката</h2><p className="mt-1 text-sm leading-6 text-slate-600">JPEG, PNG или WebP до 8 МБ. Внутри парка сохраняются оригинал и версия для витрины.</p></div>
        <div><Label htmlFor="tenant-logo" className="mb-2 block">{tenant.branding?.logo ? "Заменить логотип" : "Загрузить логотип"}</Label><Input id="tenant-logo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || loading || loadFailed} className="max-w-64" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void logo(file); }} /></div>
      </section>}
      </details>}

      <Tabs value={section} onValueChange={(value) => { setSection(value); if (value === 'calendar') { setCalendarVisited(true); setCalendarRevision(current => current + 1); } }} activationMode="manual" className="mt-6 min-w-0">
        <TabsList aria-label="Управление парком" className="grid h-auto w-full grid-cols-2 p-1 sm:max-w-md">
          <TabsTrigger value="fleet" className="min-h-11 px-4">Автопарк</TabsTrigger>
          <TabsTrigger value="calendar" className="min-h-11 px-4">Календарь</TabsTrigger>
        </TabsList>
        <TabsContent value="fleet" forceMount hidden={section !== 'fleet'} className="mt-6 data-[state=inactive]:hidden">
      <section aria-labelledby="fleet-title">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="fleet-title" className="text-xl font-semibold">Техника парка</h2><p className="mt-1 text-sm text-slate-600">{loading || loadFailed ? "Количество уточняется" : `${assets.length} единиц`} · для первого демо подготовьте 5</p></div><Button className={primaryButton} onClick={() => edit("new")} disabled={busy || loading || loadFailed}><Plus aria-hidden="true" /> Добавить технику</Button></div>
        {error && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-800"><span>{error}</span><Button variant="outline" disabled={busy} onClick={() => setReload((value) => value + 1)}><RefreshCw aria-hidden="true" /> Обновить данные</Button></div>}
        {loading ? <p role="status" className="py-8 text-slate-600">Загружаем данные парка…</p> : loadFailed ? null : <>
          {assets.length === 0 && !editing && <div className="mt-4 rounded-2xl bg-white p-8 text-center"><CarFront className="mx-auto text-slate-500" aria-hidden="true" /><p className="mt-3 font-medium">Добавьте первую машину</p><p className="mt-2 text-sm text-slate-600">Название, характеристики, суточная цена и фотографии.</p></div>}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset) => <VehicleCardFrame key={asset.id} assetId={asset.id} media={asset.photos.main ? <PrivateImage owner={owner} tenantId={tenant.tenant_id} reference={asset.photos.main} alt={asset.name} className="aspect-[16/10] w-full object-cover" /> : <div className="grid aspect-[16/10] place-items-center bg-slate-100"><CarFront className="text-slate-500" aria-hidden="true" /></div>}>
              <CardContent className="flex flex-1 flex-col gap-4 p-4">
              <div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{asset.name}</h3><p className="mt-1 text-sm text-slate-600">{TYPES[asset.asset_type]} · {asset.pricing.daily_rate || 0} {tenant.currency}/день</p><p className="mt-1 text-sm text-slate-600">Фото: {asset.photos.gallery?.length || 0} · депозит: {asset.deposit_policy.amount || 0} {tenant.currency}</p></div>
              <div className="flex gap-2"><Button variant="outline" disabled={busy} aria-label={`Редактировать ${asset.name}`} onClick={() => edit(asset)}><Pencil aria-hidden="true" /> Изменить</Button><Button variant="outline" disabled={busy} aria-label={`В архив: ${asset.name}`} onClick={() => { setArchiveError(""); setArchiveTarget(asset); }}><Trash2 aria-hidden="true" /></Button></div>
              <p className="text-sm text-slate-600">{asset.public ? 'Показывается клиентам' : 'Скрыто с витрины'}</p>
              </CardContent></VehicleCardFrame>)}
          </div>
        </>}

        {editing && <section className="mt-6 rounded-2xl bg-white p-5 md:p-7" aria-labelledby="asset-editor-title">
          <h2 id="asset-editor-title" className="break-words text-xl font-semibold">{editing === "new" ? "Новая техника" : `Редактирование: ${editing.name}`}</h2>
          {editorError && <p role="alert" className="mt-3 text-sm text-rose-800">{editorError}</p>}
          <form onSubmit={save} className="mt-5">
            <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label htmlFor="asset-name">Название для клиента</Label><Input ref={nameInput} id="asset-name" required maxLength={160} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Toyota Yaris 2024, белый" className="mt-2" /></div>
              <div><Label htmlFor="asset-kind">Тип транспорта</Label><select id="asset-kind" className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-cyan-600" value={form.asset_type} onChange={(e) => setForm({ ...form, asset_type: e.target.value as AssetType })}>{Object.entries(TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div><Label htmlFor="asset-year">Год выпуска</Label><Input id="asset-year" type="number" min={1950} max={2100} value={form.year ?? ""} onChange={(e) => setForm({ ...form, year: e.target.value ? Number(e.target.value) : null })} className="mt-2" /></div>
              {([ ["brand", "Марка"], ["model", "Модель"], ["color", "Цвет"] ] as const).map(([field, label]) => <div key={field}><Label htmlFor={`asset-${field}`}>{label}</Label><Input id={`asset-${field}`} maxLength={80} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="mt-2" /></div>)}
              <div><Label htmlFor="asset-rate">Цена за день, {tenant.currency}</Label><Input id="asset-rate" type="number" required min={0} max={100000000} step="0.01" value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: Number(e.target.value) })} className="mt-2" /></div>
              <div><Label htmlFor="asset-deposit">Депозит, {tenant.currency}</Label><Input id="asset-deposit" type="number" required min={0} max={100000000} step="0.01" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) })} className="mt-2" /></div>
              <div className="sm:col-span-2"><label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={Boolean(form.public)} onChange={(event) => setForm({ ...form, public: event.target.checked })} className="h-4 w-4 accent-blue-700 focus-visible:outline focus-visible:outline-2" />Показывать на витрине</label><p className="mt-2 text-sm text-slate-600">После публикации парка машина, её цены и фотографии станут доступны по публичной ссылке.</p></div>
            </fieldset>
            <p className="mt-4 text-sm text-slate-600">На этом этапе задаётся базовая суточная цена. Сезонные тарифы добавим отдельно.</p>
            <div className="mt-5 flex flex-wrap gap-3"><Button type="submit" disabled={busy} className={primaryButton}>{busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null} Сохранить технику</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>Закрыть редактор</Button></div>
          </form>
          {editing !== "new" && <div className="mt-7 border-t border-slate-200 pt-5">
            <Label htmlFor="asset-photos">Фотографии машины</Label><p id="photo-hint" className="mt-1 text-sm text-slate-600">Первая фотография станет главной. Можно выбрать несколько файлов; до 20 фото, каждое до 8 МБ.</p>
            <Input id="asset-photos" aria-describedby="photo-hint" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} className="mt-3" onChange={(event) => { const files = Array.from(event.target.files || []); event.target.value = ""; void photos(editing, files); }} />
            <p role="status" aria-live="polite" className="mt-2 text-sm text-slate-600">{uploadProgress}</p>
            <div className="mt-3 flex flex-wrap gap-3">{editing.photos.gallery?.map((reference, index) => <PrivateImage key={reference} owner={owner} tenantId={tenant.tenant_id} reference={reference} alt={`${editing.name}, фото ${index + 1}`} className="h-24 w-32 rounded-xl object-cover" />)}</div>
          </div>}
        </section>}
      </section>
        </TabsContent>
        {calendarVisited && <TabsContent value="calendar" forceMount hidden={section !== 'calendar'} className="mt-6 min-w-0 data-[state=inactive]:hidden">
          <ParkBookingCalendar key={`calendar-${tenant.tenant_id}`} tenantId={tenant.tenant_id} admin={!owner} fleetRevision={calendarRevision} />
        </TabsContent>}
      </Tabs>
    </div>
    <AlertDialog open={Boolean(archiveTarget)} onOpenChange={(open) => { if (!open && !busy) setArchiveTarget(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="break-words">Перенести {archiveTarget?.name} в архив?</AlertDialogTitle><AlertDialogDescription>Техника исчезнет из активного списка. Её данные и фотографии сохранятся.</AlertDialogDescription></AlertDialogHeader>{archiveError && <p role="alert" className="text-sm text-rose-800">{archiveError}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Отмена</AlertDialogCancel><AlertDialogAction className={primaryButton} disabled={busy} onClick={(event) => { event.preventDefault(); void archive(); }}>{busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}{busy ? "Переносим…" : "В архив"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
}
