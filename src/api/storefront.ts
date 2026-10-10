export interface StorefrontAsset {
  id: string;
  name: string;
  asset_type: string;
  specs: { brand?: string; model?: string; year?: number; color?: string };
  daily_rate: number | null;
  deposit: number | null;
  photos: string[];
}

export interface Storefront {
  tenant: { id: string; slug: string; name: string; currency: string; timezone: string; logo: string | null };
  assets: StorefrontAsset[];
  preview: boolean;
  booking_enabled: boolean;
}

export function storefrontMediaUrl(tenantId: string, reference: string) {
  return `/api/storefront/${encodeURIComponent(tenantId)}/media/${reference.split('/').map(encodeURIComponent).join('/')}`;
}

export async function fetchStorefront(tenantId: string, preview: string, signal: AbortSignal): Promise<Storefront> {
  const response = await fetch(`/api/storefront/${encodeURIComponent(tenantId)}`, {
    signal, headers: preview ? { 'X-Storefront-Preview': preview } : {}, cache: 'no-store',
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Ссылка превью истекла. Откройте её заново из суперадминки.');
    if (response.status === 404) throw new Error('Витрина не найдена или ещё не опубликована.');
    throw new Error('Не удалось загрузить витрину. Проверьте соединение и повторите попытку.');
  }
  return response.json();
}
