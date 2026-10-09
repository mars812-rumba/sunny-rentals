const PLATFORM_API_BASE = "/api/platform";
const SESSION_STORAGE_KEY = "sunny_platform_admin_session";

export type TenantStatus = "draft" | "trial" | "active" | "suspended" | "cancelled";
export type AssetType = "car" | "scooter" | "motorcycle" | "bicycle" | "snowmobile" | "other";

export interface PlatformActor {
  id: string;
  first_name?: string | null;
  username?: string | null;
}

export interface PlatformSession {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  actor: PlatformActor;
}

export interface PlatformTenant {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  primary_asset_type: AssetType;
  vertical: string;
  currency: string;
  locale: string;
  timezone: string;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  domains: string[];
  branding?: { logo?: string };
}

export interface CreateTenantPayload {
  name: string;
  slug: string;
  owner_user_id?: string;
  primary_asset_type: AssetType;
  currency: string;
  locale: string;
  timezone: string;
  trial_days: number;
}

export class PlatformApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PlatformApiError";
    this.status = status;
  }
}

async function responseError(response: Response): Promise<PlatformApiError> {
  let message = "Не удалось выполнить запрос";
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") message = body.detail;
    else if (Array.isArray(body?.detail)) message = "Проверьте поля формы: " + body.detail.map((item: { loc?: string[]; msg?: string }) => `${item.loc?.slice(1).join(".") || "поле"}: ${item.msg || "некорректное значение"}`).join("; ");
  } catch {
    // The status-based fallback below remains useful for non-JSON gateway errors.
  }
  if (response.status === 404 && message === "Not Found") {
    message = "Контур суперадминки пока выключен на сервере";
  } else if (response.status === 401) {
    message = "Сессия Telegram недействительна или у аккаунта нет доступа";
  }
  return new PlatformApiError(message, response.status);
}

export function getStoredPlatformSession(): PlatformSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function clearPlatformSession(): void {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function authenticatePlatformAdmin(initData: string): Promise<PlatformSession> {
  const response = await fetch(`${PLATFORM_API_BASE}/session/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ init_data: initData }),
  });
  if (!response.ok) throw await responseError(response);
  const session = (await response.json()) as PlatformSession;
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export async function createPlatformBrowserHandoff(): Promise<{ code: string; expires_in: number }> {
  return platformFetch<{ code: string; expires_in: number }>("/session/browser-handoff", {
    method: "POST",
  });
}

export async function consumePlatformBrowserHandoff(code: string): Promise<PlatformSession> {
  const response = await fetch(`${PLATFORM_API_BASE}/session/browser-handoff/consume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new PlatformApiError("Ссылка для входа истекла или уже была использована", 401);
    }
    throw await responseError(response);
  }
  const session = (await response.json()) as PlatformSession;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

async function platformFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getStoredPlatformSession();
  if (!session?.access_token) throw new PlatformApiError("Нет активной сессии суперадминистратора", 401);
  const response = await fetch(`${PLATFORM_API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${session.access_token}`,
      ...init?.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401) clearPlatformSession();
    throw await responseError(response);
  }
  return response.json() as Promise<T>;
}

export async function listPlatformTenants(): Promise<PlatformTenant[]> {
  const response = await platformFetch<{ tenants: PlatformTenant[] }>("/tenants");
  return response.tenants;
}

export async function createPlatformTenant(payload: CreateTenantPayload): Promise<PlatformTenant> {
  const response = await platformFetch<{ tenant: PlatformTenant }>("/tenants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.tenant;
}

export async function publishPlatformTenant(tenantId: string): Promise<PlatformTenant> {
  const response = await platformFetch<{ tenant: PlatformTenant }>(
    `/tenants/${encodeURIComponent(tenantId)}/publish`,
    { method: "POST" },
  );
  return response.tenant;
}

export interface PlatformAsset {
  id: string;
  tenant_id: string;
  name: string;
  asset_type: AssetType;
  photos: { main?: string; gallery?: string[] };
  specs: { brand?: string; model?: string; year?: number; color?: string };
  pricing: { daily_rate?: number; currency?: string };
  deposit_policy: { amount?: number };
}

export interface PlatformAssetInput {
  name: string;
  asset_type: AssetType;
  brand: string;
  model: string;
  year: number | null;
  color: string;
  daily_rate: number;
  deposit: number;
}

function tenantPath(tenantId: string) {
  return `/tenants/${encodeURIComponent(tenantId)}`;
}

export async function getPlatformTenant(tenantId: string): Promise<PlatformTenant> {
  return (await platformFetch<{ tenant: PlatformTenant }>(tenantPath(tenantId))).tenant;
}

export async function listPlatformAssets(tenantId: string): Promise<PlatformAsset[]> {
  return (await platformFetch<{ assets: PlatformAsset[] }>(`${tenantPath(tenantId)}/assets`)).assets;
}

export async function savePlatformAsset(tenantId: string, data: PlatformAssetInput, assetId?: string): Promise<PlatformAsset> {
  return (await platformFetch<{ asset: PlatformAsset }>(`${tenantPath(tenantId)}/assets${assetId ? `/${encodeURIComponent(assetId)}` : ""}`, {
    method: assetId ? "PUT" : "POST", body: JSON.stringify(data),
  })).asset;
}

export async function archivePlatformAsset(tenantId: string, assetId: string): Promise<void> {
  await platformFetch(`${tenantPath(tenantId)}/assets/${encodeURIComponent(assetId)}`, { method: "DELETE" });
}

export async function uploadPlatformPhoto(tenantId: string, assetId: string, file: File): Promise<PlatformAsset> {
  const body = new FormData();
  body.append("file", file);
  return (await platformFetch<{ asset: PlatformAsset }>(`${tenantPath(tenantId)}/assets/${encodeURIComponent(assetId)}/photos`, { method: "POST", body })).asset;
}

export async function uploadPlatformLogo(tenantId: string, file: File): Promise<PlatformTenant> {
  const body = new FormData();
  body.append("file", file);
  return (await platformFetch<{ tenant: PlatformTenant }>(`${tenantPath(tenantId)}/logo`, { method: "POST", body })).tenant;
}

export async function loadPlatformMedia(tenantId: string, reference: string, signal: AbortSignal): Promise<Blob> {
  const session = getStoredPlatformSession();
  if (!session?.access_token) throw new PlatformApiError("Сессия истекла", 401);
  const response = await fetch(`${PLATFORM_API_BASE}${tenantPath(tenantId)}/media/${reference.split("/").map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${session.access_token}` }, signal,
  });
  if (!response.ok) throw await responseError(response);
  return response.blob();
}
