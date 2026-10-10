import type { PlatformAsset, PlatformAssetInput, PlatformTenant } from './platform-admin';
function identity(tenantId: string) {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) throw new Error('Откройте кабинет из сообщения бота парка.');
  return { tenant_id: tenantId, init_data: initData };
}
async function ownerFetch(path: string, body: object | FormData, signal?: AbortSignal): Promise<Response> {
  const multipart = body instanceof FormData;
  const response = await fetch(`/api/partners/fleet/${path}`, { method: 'POST', body: multipart ? body : JSON.stringify(body), headers: multipart ? undefined : { 'Content-Type': 'application/json' }, signal, cache: 'no-store' });
  if (!response.ok) {
    if (response.status === 403) throw new Error('Доступ владельца недействителен. Заново откройте парк через бота или запросите приглашение.');
    if (response.status === 404) throw new Error('Машина или фотография больше недоступна. Обновите автопарк.');
    if (response.status === 422 || response.status === 413) throw new Error('Проверьте поля машины и фото: JPEG, PNG или WebP, не больше 8 МБ.');
    throw new Error('Не удалось загрузить или сохранить автопарк. Повторите попытку.');
  }
  return response;
}
export async function fetchOwnerFleet(tenantId: string, signal?: AbortSignal): Promise<{ tenant: PlatformTenant; assets: PlatformAsset[] }> {
  const result = await (await ownerFetch('list', identity(tenantId), signal)).json();
  if (result.tenant?.tenant_id !== tenantId || !Array.isArray(result.assets) || result.assets.some((asset: PlatformAsset) => asset.tenant_id !== tenantId)) throw new Error('Получены неверные данные парка.');
  return result;
}
export async function saveOwnerAsset(tenantId: string, data: PlatformAssetInput, assetId?: string): Promise<PlatformAsset> {
  const result = await (await ownerFetch('save', { ...identity(tenantId), data, ...(assetId ? { asset_id: assetId } : {}) })).json();
  if (result.asset?.tenant_id !== tenantId) throw new Error('Получены неверные данные машины.');
  return result.asset;
}
export async function archiveOwnerAsset(tenantId: string, assetId: string): Promise<void> { await ownerFetch('archive', { ...identity(tenantId), asset_id: assetId }); }
export async function uploadOwnerPhoto(tenantId: string, assetId: string, file: File): Promise<PlatformAsset> {
  const signed = identity(tenantId); const body = new FormData();
  body.set('tenant_id', signed.tenant_id); body.set('init_data', signed.init_data); body.set('asset_id', assetId); body.set('file', file);
  const result = await (await ownerFetch('photo', body)).json();
  if (result.asset?.tenant_id !== tenantId) throw new Error('Получены неверные данные машины.');
  return result.asset;
}
export async function loadOwnerMedia(tenantId: string, reference: string, signal?: AbortSignal): Promise<Blob> { return (await ownerFetch('media', { ...identity(tenantId), reference }, signal)).blob(); }
