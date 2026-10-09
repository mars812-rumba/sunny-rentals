import { clearPlatformSession, getStoredPlatformSession } from './platform-admin';

export interface ParkInvitation { invitation_id: string; url: string; expires_in: number }
export interface ParkIdentity { tenant_id: string; user_id: string; telegram_linked: boolean; role: 'owner' | 'customer' }

async function request<T>(path: string, options: RequestInit = {}, admin = false): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (admin) {
    const session = getStoredPlatformSession();
    if (!session?.access_token) throw new Error('Сессия суперадминистратора истекла. Войдите заново.');
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  const response = await fetch(`/api/partners${path}`, { ...options, headers, cache: 'no-store' });
  if (!response.ok) {
    if (admin && path.startsWith('/admin/webhook')) {
      if (response.status === 409) throw new Error('У бота уже установлен другой webhook. Автоматическая замена запрещена.');
      if (response.status === 503) throw new Error('Telegram недоступен или настройки бота не совпадают. Проверьте токен и имя на сервере, затем повторите проверку.');
    }
    if (response.status === 401 && admin) {
      clearPlatformSession();
      throw new Error('Сессия суперадминистратора истекла. Войдите заново.');
    }
    if (response.status === 404) throw new Error('Бот ещё не включён на сервере или парк недоступен.');
    if (response.status === 403) throw new Error('Откройте этот парк по ссылке в новом боте. Если Telegram уже подключён — закройте и заново откройте мини-приложение.');
    if (response.status === 409) throw new Error('Даты уже заняты, цена или статус изменились. Обновите расчёт или календарь.');
    if (response.status === 422) throw new Error('Проверьте даты: получение не в прошлом, возврат позже получения, период не больше 365 суток. Для техники должна быть задана цена.');
    throw new Error('Не удалось связаться с ботом. Проверьте соединение и повторите попытку.');
  }
  return response.json() as Promise<T>;
}

function safeBotLink(url: string): string {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://t.me' || parsed.username || parsed.password || parsed.hash
      || !/^\/[A-Za-z][A-Za-z0-9_]{4,31}$/.test(parsed.pathname)
      || !/^[A-Za-z0-9_-]{1,64}$/.test(parsed.searchParams.get('start') || '')) {
    throw new Error('Ссылка бота некорректна. Обратитесь к администратору.');
  }
  return parsed.href;
}

export async function fetchParkBotLink(tenantId: string, signal?: AbortSignal): Promise<string> {
  const data = await request<{ url: string }>(`/parks/${encodeURIComponent(tenantId)}/bot-link`, { signal });
  return safeBotLink(data.url);
}

export async function createParkOwnerInvitation(tenantId: string): Promise<ParkInvitation> {
  const data = await request<ParkInvitation>(`/parks/${encodeURIComponent(tenantId)}/owner-invitations`, { method: 'POST', body: '{}' }, true);
  if (!/^[a-f0-9]{64}$/.test(data.invitation_id) || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new Error('Не удалось подготовить приглашение. Повторите попытку.');
  return { ...data, url: safeBotLink(data.url) };
}

export async function revokeParkOwnerInvitation(tenantId: string, invitationId: string): Promise<void> {
  await request(`/parks/${encodeURIComponent(tenantId)}/owner-invitations/${encodeURIComponent(invitationId)}`, { method: 'DELETE' }, true);
}

export async function verifyParkTelegramIdentity(tenantId: string, initData: string, signal?: AbortSignal): Promise<ParkIdentity> {
  const data = await request<ParkIdentity>('/identity', { method: 'POST', body: JSON.stringify({ tenant_id: tenantId, init_data: initData }), signal });
  if (data.tenant_id !== tenantId || data.telegram_linked !== true || !['owner', 'customer'].includes(data.role)) throw new Error('Не удалось подтвердить подключение к этому парку.');
  return data;
}

export interface PlatformWebhookStatus {
  username: string;
  state: 'not_set' | 'configured' | 'other';
  expected_url: string;
  pending_updates: number;
  delivery_error: boolean;
  last_error_at: number | null;
}

export function fetchPlatformWebhook(signal?: AbortSignal): Promise<PlatformWebhookStatus> {
  return request('/admin/webhook', { signal }, true);
}

export function connectPlatformWebhook(signal?: AbortSignal): Promise<PlatformWebhookStatus> {
  return request('/admin/webhook/connect', { method: 'POST', signal }, true);
}

export interface ParkQuote {
  asset_id: string; asset_name: string; start_date: string; end_date: string;
  days: number; daily_rate: string; total_rental: string; deposit: string;
  currency: string; timezone: string; quote_token: string;
}
export interface ParkBooking {
  id: string; asset_id: string; status: string; start_at: string; end_at: string; currency: string;
  pricing: { asset_name: string; start_date: string; end_date: string; days: number; daily_rate: string; total_rental: string; timezone: string };
  deposit: { amount: string };
}
export interface ParkPeriod { tenant_id: string; init_data: string; asset_id: string; start_date: string; end_date: string }
export const quoteParkBooking = (period: ParkPeriod) => request<ParkQuote>('/bookings/quote', { method: 'POST', body: JSON.stringify(period) });
export async function submitParkBooking(period: ParkPeriod, quoteToken: string, requestId: string): Promise<ParkBooking> {
  return (await request<{ booking: ParkBooking }>('/bookings', { method: 'POST', body: JSON.stringify({ ...period, quote_token: quoteToken, request_id: requestId }) })).booking;
}
export async function fetchParkCalendar(tenantId: string, admin: boolean, signal?: AbortSignal): Promise<ParkBooking[]> {
  const options = admin ? { signal } : { signal, method: 'POST', body: JSON.stringify({ tenant_id: tenantId, init_data: window.Telegram?.WebApp?.initData || '' }) };
  return (await request<{ bookings: ParkBooking[] }>(admin ? `/parks/${encodeURIComponent(tenantId)}/calendar` : '/calendar', options, admin)).bookings;
}
export async function changeParkBookingStatus(tenantId: string, booking: ParkBooking, status: 'confirmed' | 'cancelled', admin: boolean): Promise<void> {
  const action = { status, expected_status: booking.status };
  await request(admin ? `/parks/${encodeURIComponent(tenantId)}/bookings/${encodeURIComponent(booking.id)}/status` : '/bookings/status', {
    method: admin ? 'PATCH' : 'POST', body: JSON.stringify(admin ? action : { ...action, tenant_id: tenantId, booking_id: booking.id, init_data: window.Telegram?.WebApp?.initData || '' }),
  }, admin);
}
