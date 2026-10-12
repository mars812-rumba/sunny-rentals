import { parkText as pt } from '@/lib/park-locale';
import type { PlatformAsset, PlatformAssetInput, PlatformTenant, VehicleDetailsInput } from './platform-admin';
import { browserOwnerMode, ownerWebFetch } from './park-owner-web';
function identity(tenantId: string) {
  if (browserOwnerMode()) return { tenant_id: tenantId, init_data: undefined };
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) throw new Error(pt("Откройте кабинет из сообщения бота парка."));
  return { tenant_id: tenantId, init_data: initData };
}
async function ownerFetch(path: string, body: object | FormData, signal?: AbortSignal): Promise<Response> {
  const multipart = body instanceof FormData;
  if (browserOwnerMode()) return ownerWebFetch(`/fleet/${path}`, { method: 'POST', body: multipart ? body : JSON.stringify(body), signal });
  const response = await fetch(`/api/partners/fleet/${path}`, { method: 'POST', body: multipart ? body : JSON.stringify(body), headers: multipart ? undefined : { 'Content-Type': 'application/json' }, signal, cache: 'no-store' });
  if (!response.ok) {
    if (response.status === 403) throw new Error(pt("Доступ владельца недействителен. Заново откройте парк через бота или запросите приглашение."));
    if (response.status === 404) throw new Error(pt("Машина или фотография больше недоступна. Обновите автопарк."));
    if (response.status === 422 || response.status === 413) throw new Error(pt("Проверьте поля машины и фото: JPEG, PNG или WebP, не больше 8 МБ."));
    throw new Error(pt("Не удалось загрузить или сохранить автопарк. Повторите попытку."));
  }
  return response;
}
export async function fetchOwnerFleet(tenantId: string, signal?: AbortSignal): Promise<{ tenant: PlatformTenant; assets: PlatformAsset[] }> {
  const result = await (await ownerFetch('list', identity(tenantId), signal)).json();
  if (result.tenant?.tenant_id !== tenantId || !Array.isArray(result.assets) || result.assets.some((asset: PlatformAsset) => asset.tenant_id !== tenantId)) throw new Error(pt("Получены неверные данные парка."));
  return result;
}
export async function saveOwnerAsset(tenantId: string, data: PlatformAssetInput, assetId?: string): Promise<PlatformAsset> {
  const result = await (await ownerFetch('save', { ...identity(tenantId), data, ...(assetId ? { asset_id: assetId } : {}) })).json();
  if (result.asset?.tenant_id !== tenantId) throw new Error(pt("Получены неверные данные машины."));
  return result.asset;
}
export async function archiveOwnerAsset(tenantId: string, assetId: string): Promise<void> { await ownerFetch('archive', { ...identity(tenantId), asset_id: assetId }); }
export async function saveOwnerAssetDetails(tenantId: string, assetId: string, data: VehicleDetailsInput): Promise<PlatformAsset> {
  const result = await (await ownerFetch('details', { ...identity(tenantId), asset_id: assetId, data })).json();
  if (result.asset?.tenant_id !== tenantId || result.asset.id !== assetId) throw new Error(pt("Получены неверные данные машины."));
  return result.asset;
}
export async function uploadOwnerPhoto(tenantId: string, assetId: string, file: File): Promise<PlatformAsset> {
  const signed = identity(tenantId); const body = new FormData();
  body.set('tenant_id', signed.tenant_id); if (signed.init_data) body.set('init_data', signed.init_data); body.set('asset_id', assetId); body.set('file', file);
  const result = await (await ownerFetch('photo', body)).json();
  if (result.asset?.tenant_id !== tenantId) throw new Error(pt("Получены неверные данные машины."));
  return result.asset;
}
export async function loadOwnerMedia(tenantId: string, reference: string, signal?: AbortSignal): Promise<Blob> { return (await ownerFetch('media', { ...identity(tenantId), reference }, signal)).blob(); }
