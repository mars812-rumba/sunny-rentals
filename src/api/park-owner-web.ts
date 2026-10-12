import { parkText as pt } from '@/lib/park-locale';
export const browserOwnerMode = () => typeof window !== 'undefined' && Boolean(window.location?.pathname?.startsWith('/owner/'));

export async function ownerWebFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('X-Owner-Request', '1');
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`/api/owner${path}`, { ...options, headers, credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) {
    if (response.status === 401 && path !== '/login') window.dispatchEvent(new Event('owner-session-expired'));
    const result = await response.json().catch(() => null);
    const detail = typeof result?.detail === 'string' ? result.detail : null;
    throw new Error(detail ? pt(detail) : (response.status === 422 ? pt("Проверьте заполненные поля.") : pt("Не удалось выполнить действие. Повторите попытку.")));
  }
  return response;
}

export async function ownerWebRequest<T>(path: string, body: object, signal?: AbortSignal): Promise<T> {
  return (await ownerWebFetch(path, { method: 'POST', body: JSON.stringify(body), signal })).json();
}
