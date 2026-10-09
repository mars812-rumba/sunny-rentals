import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CarFront,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  ExternalLink,
  Loader2,
  MonitorUp,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformTenantWorkspace } from "@/components/platform/PlatformTenantWorkspace";
import { PlatformBotConnection } from "@/components/platform/PlatformBotConnection";
import {
  AssetType,
  CreateTenantPayload,
  PlatformActor,
  PlatformApiError,
  PlatformTenant,
  authenticatePlatformAdmin,
  clearPlatformSession,
  consumePlatformBrowserHandoff,
  createPlatformBrowserHandoff,
  createPlatformTenant,
  getStoredPlatformSession,
  listPlatformTenants,
  publishPlatformTenant,
} from "@/api/platform-admin";

type PageState = "authenticating" | "ready" | "missing-telegram" | "error";

const STATUS_LABELS: Record<PlatformTenant["status"], string> = {
  draft: "Черновик",
  trial: "Триал",
  active: "Активен",
  suspended: "Приостановлен",
  cancelled: "Закрыт",
};

const STATUS_STYLES: Record<PlatformTenant["status"], string> = {
  draft: "bg-slate-100 text-slate-700 ring-slate-200",
  trial: "bg-amber-50 text-amber-800 ring-amber-200",
  active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  suspended: "bg-rose-50 text-rose-800 ring-rose-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
};

const ASSET_LABELS: Record<AssetType, string> = {
  car: "Автомобили",
  scooter: "Электросамокаты",
  motorcycle: "Мотоциклы",
  bicycle: "Велосипеды",
  snowmobile: "Снегоходы",
  other: "Другой транспорт",
};

const initialForm: CreateTenantPayload = {
  name: "",
  slug: "",
  primary_asset_type: "car",
  currency: "THB",
  locale: "ru",
  timezone: "Asia/Bangkok",
  trial_days: 7,
};

function slugify(value: string): string {
  const ru: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return value
    .toLowerCase()
    .split("")
    .map((letter) => ru[letter] ?? letter)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: PlatformTenant["status"] }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] p-5 md:p-8" aria-busy="true">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-11 w-52 bg-slate-200" />
          <Skeleton className="h-10 w-36 bg-slate-200" />
        </div>
        <Skeleton className="h-28 w-full rounded-2xl bg-slate-200" />
        <div className="space-y-3">
          {[0, 1, 2].map((item) => <Skeleton key={item} className="h-20 w-full rounded-xl bg-slate-200" />)}
        </div>
      </div>
    </div>
  );
}

function AccessScreen({ state, message, onRetry }: { state: PageState; message: string; onRetry: () => void }) {
  const missingTelegram = state === "missing-telegram";
  return (
    <main className="grid min-h-screen place-items-center bg-[#0d1b2a] px-5 py-10 text-white">
      <section className="w-full max-w-lg rounded-2xl bg-[#14283a] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.35)] md:p-10">
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400 text-[#0d1b2a]">
          {missingTelegram ? <CircleUserRound aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
        </div>
        <h1 className="max-w-md text-3xl font-semibold tracking-[-0.025em]">
          {missingTelegram ? "Войдите через Telegram" : "Не удалось открыть суперадминку"}
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">{message}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {!missingTelegram && (
            <Button onClick={onRetry} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
              <RefreshCw aria-hidden="true" /> Повторить
            </Button>
          )}
          <Button variant="outline" onClick={() => window.history.back()} className="border-slate-600 bg-transparent text-white hover:bg-slate-700 hover:text-white">
            Вернуться назад
          </Button>
        </div>
        <div className="mt-8 flex items-center gap-2 border-t border-slate-700 pt-5 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          Доступ проверяется подписью Telegram и разрешённым ID
        </div>
      </section>
    </main>
  );
}

export default function PlatformAdminPage() {
  const [pageState, setPageState] = useState<PageState>("authenticating");
  const [errorMessage, setErrorMessage] = useState("");
  const [actor, setActor] = useState<PlatformActor | null>(null);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [publishingTenant, setPublishingTenant] = useState<PlatformTenant | null>(null);
  const [isPublishing, setPublishing] = useState(false);
  const [isOpeningBrowser, setOpeningBrowser] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<PlatformTenant | null>(null);

  const loadWorkspace = useCallback(async (sessionActor: PlatformActor) => {
    setActor(sessionActor);
    setTenants(await listPlatformTenants());
    setPageState("ready");
  }, []);

  const initialize = useCallback(async () => {
    setPageState("authenticating");
    setErrorMessage("");
    const handoffCode = new URLSearchParams(window.location.hash.slice(1)).get("handoff");
    if (handoffCode) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      try {
        const session = await consumePlatformBrowserHandoff(handoffCode);
        await loadWorkspace(session.actor);
      } catch (error) {
        clearPlatformSession();
        setErrorMessage(error instanceof Error ? error.message : "Не удалось подтвердить вход в браузере");
        setPageState("error");
      }
      return;
    }

    const storedSession = getStoredPlatformSession();
    if (storedSession) {
      try {
        await loadWorkspace(storedSession.actor);
        return;
      } catch {
        clearPlatformSession();
      }
    }

    const telegram = window.Telegram?.WebApp;
    telegram?.ready?.();
    const initData = telegram?.initData;
    if (!initData) {
      setErrorMessage("Откройте кабинет в служебном Telegram-боте, подтвердите вход и нажмите «Открыть в браузере».");
      setPageState("missing-telegram");
      return;
    }
    try {
      const session = await authenticatePlatformAdmin(initData);
      await loadWorkspace(session.actor);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Неизвестная ошибка авторизации");
      setPageState("error");
    }
  }, [loadWorkspace]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const isTelegramMiniApp = Boolean(window.Telegram?.WebApp?.initData);

  const handleOpenBrowser = async () => {
    setOpeningBrowser(true);
    try {
      const handoff = await createPlatformBrowserHandoff();
      const browserUrl = new URL("/platform-admin", window.location.origin);
      browserUrl.hash = `handoff=${encodeURIComponent(handoff.code)}`;
      const target = browserUrl.toString();
      if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(target);
      } else {
        const opened = window.open(target, "_blank", "noopener,noreferrer");
        if (!opened) window.location.assign(target);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось открыть кабинет в браузере");
    } finally {
      setOpeningBrowser(false);
    }
  };

  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tenants;
    return tenants.filter((tenant) =>
      `${tenant.name} ${tenant.slug} ${tenant.currency}`.toLowerCase().includes(query),
    );
  }, [search, tenants]);

  const counts = useMemo(() => ({
    all: tenants.length,
    draft: tenants.filter((tenant) => tenant.status === "draft").length,
    running: tenants.filter((tenant) => tenant.status === "trial" || tenant.status === "active").length,
  }), [tenants]);

  const handleCreated = (tenant: PlatformTenant) => {
    setTenants((current) => [tenant, ...current]);
    setCreateOpen(false);
    setSelectedTenant(tenant);
    toast.success(`${tenant.name} создан как черновик`);
  };

  const handlePublish = async () => {
    if (!publishingTenant) return;
    setPublishing(true);
    try {
      const published = await publishPlatformTenant(publishingTenant.tenant_id);
      setTenants((current) => current.map((tenant) => tenant.tenant_id === published.tenant_id ? published : tenant));
      toast.success(`Триал ${published.name} начался`);
      setPublishingTenant(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось опубликовать прокат");
    } finally {
      setPublishing(false);
    }
  };

  if (pageState === "authenticating") return <LoadingScreen />;
  if (pageState !== "ready") {
    return (
      <AccessScreen
        state={pageState}
        message={errorMessage}
        onRetry={initialize}
      />
    );
  }

  if (selectedTenant) return <PlatformTenantWorkspace key={selectedTenant.tenant_id} tenant={selectedTenant} onBack={() => setSelectedTenant(null)} onTenantChanged={(updated) => {
    setSelectedTenant(updated);
    setTenants((current) => current.map((item) => item.tenant_id === updated.tenant_id ? updated : item));
  }} />;

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-slate-950 selection:bg-cyan-200 selection:text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#0d1b2a] px-4 py-5 text-white lg:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400 text-slate-950">
            <CarFront className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="font-semibold tracking-[-0.02em]">Sunny Platform</div>
            <div className="text-xs text-slate-400">Control plane</div>
          </div>
        </div>
        <nav className="mt-10" aria-label="Разделы суперадминки">
          <button className="flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-left text-sm font-medium text-white">
            <Building2 className="h-4 w-4 text-cyan-300" aria-hidden="true" /> Прокаты
          </button>
        </nav>
        <div className="mt-auto rounded-xl bg-white/[0.06] p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-700 text-sm font-semibold">
              {(actor?.first_name || actor?.username || "A").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{actor?.first_name || actor?.username || "Суперадмин"}</div>
              <div className="truncate text-xs text-slate-400">Telegram ID {actor?.id}</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#f4f6f8]/95 px-4 py-4 md:px-8 lg:px-10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#0d1b2a] text-cyan-300">
                <CarFront className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold">Sunny Platform</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-sm text-slate-500 md:inline">Защищённая сессия</span>
              <ShieldCheck className="h-5 w-5 text-emerald-600" aria-label="Сессия подтверждена" />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-7 md:px-8 md:pt-10 lg:px-10">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">Прокаты</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                Создавайте парк как черновик, подготовьте данные и запускайте семидневный триал только после публикации.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="h-11 bg-[#0d1b2a] px-5 text-white hover:bg-[#17324a]">
              <Plus aria-hidden="true" /> Подключить прокат
            </Button>
          </div>

          <PlatformBotConnection />

          {isTelegramMiniApp && (
            <section className="mt-7 flex flex-col gap-5 rounded-2xl bg-[#0d1b2a] px-5 py-5 text-white shadow-[0_16px_38px_rgba(13,27,42,0.16)] sm:flex-row sm:items-center sm:justify-between sm:px-6" aria-labelledby="browser-mode-title">
              <div className="flex gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-400 text-slate-950">
                  <MonitorUp className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="browser-mode-title" className="font-semibold tracking-[-0.015em]">Продолжить в полном браузере</h2>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">Откроем этот же защищённый кабинет в Chrome или Safari. Повторно входить не придётся.</p>
                </div>
              </div>
              <Button onClick={() => void handleOpenBrowser()} disabled={isOpeningBrowser} className="h-11 shrink-0 bg-cyan-400 px-5 text-slate-950 hover:bg-cyan-300">
                {isOpeningBrowser ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ExternalLink aria-hidden="true" />}
                {isOpeningBrowser ? "Открываем…" : "Открыть в браузере"}
              </Button>
            </section>
          )}

          <section className="mt-8 grid overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:grid-cols-3" aria-label="Сводка по прокатам">
            <SummaryItem label="Всего прокатов" value={counts.all} icon={<Building2 />} />
            <SummaryItem label="Ждут подготовки" value={counts.draft} icon={<Clock3 />} border />
            <SummaryItem label="В работе" value={counts.running} icon={<Rocket />} border />
          </section>

          <section className="mt-8" aria-labelledby="tenant-list-title">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 id="tenant-list-title" className="text-lg font-semibold tracking-[-0.015em]">Все прокаты</h2>
                <p className="mt-1 text-sm text-slate-500">{filteredTenants.length} из {tenants.length}</p>
              </div>
              <Label className="relative block sm:w-72">
                <span className="sr-only">Найти прокат</span>
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Название или slug"
                  className="h-10 border-slate-200 bg-white pl-9 focus-visible:ring-cyan-500"
                />
              </Label>
            </div>

            {filteredTenants.length === 0 ? (
              <EmptyState hasSearch={Boolean(search)} onCreate={() => setCreateOpen(true)} />
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                <div className="hidden grid-cols-[minmax(220px,1.8fr)_1fr_0.8fr_0.8fr_auto] gap-4 border-b border-slate-100 px-5 py-3 text-xs font-medium text-slate-500 xl:grid">
                  <span>Прокат</span><span>Статус</span><span>Транспорт</span><span>Создан</span><span className="text-right">Действие</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {filteredTenants.map((tenant) => (
                    <TenantRow key={tenant.tenant_id} tenant={tenant} onOpen={() => setSelectedTenant(tenant)} onPublish={() => setPublishingTenant(tenant)} />
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <CreateTenantSheet open={isCreateOpen} onOpenChange={setCreateOpen} isSubmitting={isSubmitting} setSubmitting={setSubmitting} onCreated={handleCreated} />

      <AlertDialog open={Boolean(publishingTenant)} onOpenChange={(open) => !open && !isPublishing && setPublishingTenant(null)}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Опубликовать {publishingTenant?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              Парк перейдёт из черновика в триал. Семь дней полного доступа начнутся сразу после подтверждения.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPublishing}>Оставить черновиком</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void handlePublish(); }} disabled={isPublishing} className="bg-[#0d1b2a] hover:bg-[#17324a]">
              {isPublishing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Rocket aria-hidden="true" />}
              {isPublishing ? "Публикуем…" : "Начать триал"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryItem({ label, value, icon, border = false }: { label: string; value: number; icon: React.ReactNode; border?: boolean }) {
  return (
    <div className={`flex items-center gap-4 px-5 py-5 md:px-6 ${border ? "border-t border-slate-100 sm:border-l sm:border-t-0" : ""}`}>
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      <div><div className="text-2xl font-semibold tabular-nums tracking-[-0.025em]">{value}</div><div className="text-xs text-slate-500">{label}</div></div>
    </div>
  );
}

function TenantRow({ tenant, onPublish, onOpen }: { tenant: PlatformTenant; onPublish: () => void; onOpen: () => void }) {
  return (
    <article className="grid gap-4 px-5 py-5 transition-colors hover:bg-slate-50/70 xl:grid-cols-[minmax(220px,1.8fr)_1fr_0.8fr_0.8fr_auto] xl:items-center">
      <div className="min-w-0">
        <button onClick={onOpen} className="max-w-full truncate text-left font-semibold tracking-[-0.01em] text-slate-950 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600">{tenant.name}</button>
        <div className="mt-1 truncate text-xs text-slate-500">/{tenant.slug} · {tenant.currency}</div>
      </div>
      <div><StatusBadge status={tenant.status} /></div>
      <div className="text-sm text-slate-600"><span className="mr-2 text-xs text-slate-400 xl:hidden">Тип</span>{ASSET_LABELS[tenant.primary_asset_type]}</div>
      <div className="text-sm tabular-nums text-slate-600"><span className="mr-2 text-xs text-slate-400 xl:hidden">Создан</span>{formatDate(tenant.created_at)}</div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onOpen}>Открыть парк</Button>
        {tenant.status === "draft" ? (
          <Button variant="outline" size="sm" onClick={onPublish} className="w-full border-slate-300 bg-white hover:bg-slate-100 sm:w-auto">
            Опубликовать <ArrowRight aria-hidden="true" />
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"><Check className="h-4 w-4" aria-hidden="true" /> Опубликован</span>
        )}
      </div>
    </article>
  );
}

function EmptyState({ hasSearch, onCreate }: { hasSearch: boolean; onCreate: () => void }) {
  return (
    <div className="mt-4 rounded-2xl bg-white px-6 py-14 text-center shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-500"><Building2 aria-hidden="true" /></div>
      <h3 className="mt-5 text-lg font-semibold">{hasSearch ? "Ничего не найдено" : "Первый прокат ещё не подключён"}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasSearch ? "Попробуйте другое название или очистите поиск." : "Создайте черновик, заполните основные данные и опубликуйте его, когда парк будет готов к триалу."}
      </p>
      {!hasSearch && <Button onClick={onCreate} className="mt-6 bg-[#0d1b2a] hover:bg-[#17324a]"><Plus aria-hidden="true" /> Подключить прокат</Button>}
    </div>
  );
}

function CreateTenantSheet({
  open,
  onOpenChange,
  isSubmitting,
  setSubmitting,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  setSubmitting: (value: boolean) => void;
  onCreated: (tenant: PlatformTenant) => void;
}) {
  const [form, setForm] = useState<CreateTenantPayload>(initialForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setSlugTouched(false);
      setFormError("");
    }
  }, [open]);

  const update = <K extends keyof CreateTenantPayload>(key: K, value: CreateTenantPayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleName = (value: string) => {
    setForm((current) => ({ ...current, name: value, slug: slugTouched ? current.slug : slugify(value) }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError("");
    if (!form.name.trim() || !form.slug.trim()) {
      setFormError("Заполните название и slug");
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
      setFormError("Slug может содержать строчные латинские буквы, цифры и дефисы");
      return;
    }
    setSubmitting(true);
    try {
      onCreated(await createPlatformTenant({ ...form, name: form.name.trim(), slug: form.slug.trim() }));
    } catch (error) {
      setFormError(error instanceof PlatformApiError ? error.message : "Не удалось создать прокат");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(value) => !isSubmitting && onOpenChange(value)}>
      <SheetContent className="w-full overflow-y-auto border-0 bg-white p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-slate-100 px-6 pb-5 pt-6 text-left sm:px-8">
          <SheetTitle className="text-2xl tracking-[-0.025em]">Подключить прокат</SheetTitle>
          <SheetDescription className="max-w-md leading-6">Сначала создаём безопасный черновик. Триал не начнётся, пока вы отдельно не опубликуете парк.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="px-6 py-6 sm:px-8">
          <fieldset disabled={isSubmitting} className="space-y-8">
            <div>
              <h3 className="font-semibold">Парк и витрина</h3>
              <p className="mt-1 text-sm text-slate-500">Основные данные будущего проката.</p>
              <div className="mt-5 space-y-5">
                <FormField id="tenant-name" label="Название проката" hint="Так название увидит владелец в кабинете.">
                  <Input id="tenant-name" autoFocus value={form.name} onChange={(event) => handleName(event.target.value)} placeholder="Например, Phuket Drive" className="focus-visible:ring-cyan-500" />
                </FormField>
                <FormField id="tenant-slug" label="Slug" hint="Используется в URL и внутренних идентификаторах.">
                  <div className="flex h-10 overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-cyan-500 focus-within:ring-offset-2">
                    <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">/</span>
                    <input id="tenant-slug" value={form.slug} onChange={(event) => { setSlugTouched(true); update("slug", slugify(event.target.value)); }} placeholder="phuket-drive" className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" />
                  </div>
                </FormField>
                <FormField id="asset-type" label="Основной транспорт">
                  <Select value={form.primary_asset_type} onValueChange={(value: AssetType) => update("primary_asset_type", value)}>
                    <SelectTrigger id="asset-type" className="focus:ring-cyan-500"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(ASSET_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-7">
              <h3 className="font-semibold">Расчёты и регион</h3>
              <p className="mt-1 text-sm text-slate-500">Парк можно подготовить заранее. Доступ владельцу подключается отдельно.</p>
              <div className="mt-5 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField id="currency" label="Валюта">
                    <Select value={form.currency} onValueChange={(value) => update("currency", value)}>
                      <SelectTrigger id="currency" className="focus:ring-cyan-500"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="THB">THB — бат</SelectItem><SelectItem value="RUB">RUB — рубль</SelectItem><SelectItem value="USD">USD — доллар</SelectItem><SelectItem value="EUR">EUR — евро</SelectItem></SelectContent>
                    </Select>
                  </FormField>
                  <FormField id="locale" label="Язык">
                    <Select value={form.locale} onValueChange={(value) => update("locale", value)}>
                      <SelectTrigger id="locale" className="focus:ring-cyan-500"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="ru">Русский</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
                    </Select>
                  </FormField>
                </div>
                <FormField id="timezone" label="Часовой пояс">
                  <Select value={form.timezone} onValueChange={(value) => update("timezone", value)}>
                    <SelectTrigger id="timezone" className="focus:ring-cyan-500"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Asia/Bangkok">Пхукет / Бангкок (UTC+7)</SelectItem><SelectItem value="Europe/Moscow">Москва (UTC+3)</SelectItem><SelectItem value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</SelectItem><SelectItem value="Asia/Novosibirsk">Новосибирск (UTC+7)</SelectItem></SelectContent>
                  </Select>
                </FormField>
              </div>
            </div>
          </fieldset>

          {formError && <div role="alert" className="mt-6 flex gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{formError}</div>}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#0d1b2a] hover:bg-[#17324a]">
              {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
              {isSubmitting ? "Создаём…" : "Создать черновик"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function FormField({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs leading-5 text-slate-500">{hint}</p>}
    </div>
  );
}
