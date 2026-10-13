import { parkText as pt } from '@/lib/park-locale';
import { clearPlatformSession, getStoredPlatformSession } from './platform-admin';
import { invalidateParkCalendar } from '@/lib/park-calendar-updates';
import { browserOwnerMode, ownerWebRequest } from './park-owner-web';

export interface ParkInvitation { invitation_id: string; url: string; expires_in: number }
export interface ParkIdentity { tenant_id: string; user_id: string; telegram_linked: boolean; role: 'owner' | 'customer' }

async function request<T>(path: string, options: RequestInit = {}, admin = false): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (admin) {
    const session = getStoredPlatformSession();
    if (!session?.access_token) throw new Error(pt("Сессия суперадминистратора истекла. Войдите заново."));
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  const response = await fetch(`/api/partners${path}`, { ...options, headers, cache: 'no-store' });
  if (!response.ok) {
    if (admin && path.startsWith('/admin/webhook')) {
      if (response.status === 409) throw new Error(pt("У бота уже установлен другой webhook. Автоматическая замена запрещена."));
      if (response.status === 503) throw new Error(pt("Telegram недоступен или настройки бота не совпадают. Проверьте токен и имя на сервере, затем повторите проверку."));
    }
    if (response.status === 401 && admin) {
      clearPlatformSession();
      throw new Error(pt("Сессия суперадминистратора истекла. Войдите заново."));
    }
    if (response.status === 404 && path.endsWith('/calendar/manual')) throw new Error(pt("Сервер не нашёл маршрут создания ручной брони (404). Администратору нужно проверить версию backend и настройку API. Изменение имени клиента или переподключение бота не исправит эту ошибку."));
    if (response.status === 404) throw new Error(pt("API парка недоступен (404). Проверьте ссылку парка и обратитесь к администратору."));
    if (response.status === 403) throw new Error(pt("Откройте этот парк по ссылке в новом боте. Если Telegram уже подключён — закройте и заново откройте мини-приложение."));
    if (response.status === 409) throw new Error(pt("Даты уже заняты, цена или статус изменились. Обновите расчёт или календарь."));
    if (response.status === 422 && path.endsWith('/calendar/manual')) throw new Error(pt("Проверьте поля: возврат позже получения, период до 365 суток, начало не старше года. Для аренды нужны имя и положительная ставка; для блокировки — причина без цены."));
    if (response.status === 422 && path === '/bookings') throw new Error(pt("Проверьте даты и контакт. Без Telegram username нужен WhatsApp, MAX или телефон: номер с кодом страны, например +66…"));
    if (response.status === 422) throw new Error(pt("Проверьте даты: получение не в прошлом, возврат позже получения, период не больше 365 суток. Для техники должна быть задана цена."));
    throw new Error(pt("Не удалось выполнить запрос к серверу парка. Проверьте соединение, затем обновите календарь перед повторной попыткой."));
  }
  return response.json() as Promise<T>;
}

function safeBotLink(url: string): string {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://t.me' || parsed.username || parsed.password || parsed.hash
      || !/^\/[A-Za-z][A-Za-z0-9_]{4,31}$/.test(parsed.pathname)
      || !/^[A-Za-z0-9_-]{1,64}$/.test(parsed.searchParams.get('start') || '')) {
    throw new Error(pt("Ссылка бота некорректна. Обратитесь к администратору."));
  }
  return parsed.href;
}

export async function fetchParkBotLink(tenantId: string, signal?: AbortSignal): Promise<string> {
  const data = await request<{ url: string }>(`/parks/${encodeURIComponent(tenantId)}/bot-link`, { signal });
  return safeBotLink(data.url);
}

export async function createParkOwnerInvitation(tenantId: string): Promise<ParkInvitation> {
  const data = await request<ParkInvitation>(`/parks/${encodeURIComponent(tenantId)}/owner-invitations`, { method: 'POST', body: '{}' }, true);
  if (!/^[a-f0-9]{64}$/.test(data.invitation_id) || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new Error(pt("Не удалось подготовить приглашение. Повторите попытку."));
  return { ...data, url: safeBotLink(data.url) };
}

export async function revokeParkOwnerInvitation(tenantId: string, invitationId: string): Promise<void> {
  await request(`/parks/${encodeURIComponent(tenantId)}/owner-invitations/${encodeURIComponent(invitationId)}`, { method: 'DELETE' }, true);
}

export async function verifyParkTelegramIdentity(tenantId: string, initData: string, signal?: AbortSignal): Promise<ParkIdentity> {
  const data = await request<ParkIdentity>('/identity', { method: 'POST', body: JSON.stringify({ tenant_id: tenantId, init_data: initData }), signal });
  if (data.tenant_id !== tenantId || data.telegram_linked !== true || !['owner', 'customer'].includes(data.role)) throw new Error(pt("Не удалось подтвердить подключение к этому парку."));
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

export interface ParkAvailability {
  tenant_id: string;
  start_date: string;
  end_date: string;
  days: number;
  available_asset_ids: string[];
}

async function storefrontBookingRequest<T>(tenantId: string, endpoint: string, body: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/storefront/${encodeURIComponent(tenantId)}/${endpoint}`, { method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json', 'X-Storefront-Request': '1' }), credentials: 'omit',
    body: JSON.stringify(body), signal, cache: 'no-store' });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    if (response.status === 409) throw new Error(pt("Даты заняты или цена изменилась. Обновите расчёт и повторите попытку."));
    throw new Error(typeof result?.detail === 'string' ? pt(result.detail) : pt("Проверьте имя, контакт, даты и время. Затем повторите попытку."));
  }
  return response.json();
}

export async function fetchParkAvailability(tenantId: string, start: string, end: string, signal?: AbortSignal, pickupTime?: string, returnTime?: string): Promise<ParkAvailability> {
  const data = { start_date: start, end_date: end, ...(pickupTime ? { pickup_time: pickupTime } : {}), ...(returnTime ? { return_time: returnTime } : {}) };
  const web = typeof window === 'undefined' || !window.Telegram?.WebApp?.initData;
  const result = web ? await storefrontBookingRequest<ParkAvailability>(tenantId, 'availability', data, signal)
    : await request<ParkAvailability>(`/parks/${encodeURIComponent(tenantId)}/availability`, {
    method: 'POST', body: JSON.stringify({ start_date: start, end_date: end, ...(pickupTime ? { pickup_time: pickupTime } : {}), ...(returnTime ? { return_time: returnTime } : {}) }), signal,
  });
  if (result.tenant_id !== tenantId || result.start_date !== start || result.end_date !== end
      || !Array.isArray(result.available_asset_ids) || !Number.isInteger(result.days) || result.days < 1) {
    throw new Error(pt("Не удалось проверить наличие для этого парка. Повторите поиск."));
  }
  return result;
}

export interface ParkQuote {
  asset_id: string; asset_name: string; start_date: string; end_date: string;
  days: number; daily_rate: string; total_rental: string; deposit: string;
  currency: string; timezone: string; quote_token: string;
  requires_contact?: boolean;
  customer_name_required?: boolean;
  tariff_breakdown?: TariffBreakdown[];
  pickup?: import('@/lib/park-pickup').ParkPickup; delivery_fee?: string; return_fee?: string; extra_day?: boolean; total_payable?: string;
}
export interface TariffBreakdown { season: 'low_season' | 'high_season'; days: number; daily_rate: string; subtotal: string }
export interface ParkContact { channel: 'whatsapp' | 'max' | 'phone'; value: string; consent?: true }
export interface ParkBooking {
  updated_at?: string;
  booking_number?: string;
  id: string; asset_id: string; status: string; start_at: string; end_at: string; currency: string;
  pricing: { asset_name: string; start_date: string; end_date: string; days: number; daily_rate: string; total_rental: string; timezone: string; tariff_breakdown?: TariffBreakdown[]; pickup?: import('@/lib/park-pickup').ParkPickup; delivery_fee?: string; return_fee?: string; extra_day?: boolean; total_payable?: string };
  deposit: { amount: string };
  entry_type?: 'rental' | 'block';
  source?: string;
  operator_details?: { customer_name: string; note: string };
  customer?: { name: string | null; username: string | null; phone: string | null; telegram_user_id: string | null; contact?: ParkContact };
}

export interface ParkBookingEdit { customer_name: string; contact_channel: ParkContact['channel']; contact_value: string; note: string; expected_updated_at: string }
export async function editParkBooking(tenantId: string, bookingId: string, data: ParkBookingEdit, admin: boolean): Promise<void> {
  if (!admin && browserOwnerMode()) await ownerWebRequest('/bookings/edit', { ...data, tenant_id: tenantId, booking_id: bookingId });
  else await request(admin ? `/parks/${encodeURIComponent(tenantId)}/bookings/${encodeURIComponent(bookingId)}/details` : '/bookings/edit', {
    method: admin ? 'PATCH' : 'POST', body: JSON.stringify(admin ? data : { ...data, tenant_id: tenantId, booking_id: bookingId, init_data: window.Telegram?.WebApp?.initData || '' }),
  }, admin);
  invalidateParkCalendar(tenantId);
}

export interface ParkManualInput {
  asset_id: string; start_date: string; end_date: string; request_id: string;
  entry_type: 'rental' | 'block'; customer_name: string; note: string;
  daily_rate?: string; deposit?: string;
  booking_status?: 'confirmed' | 'requested';
  pickup?: import('@/lib/park-pickup').ParkPickup;
  contact_channel?: ParkContact['channel']; contact_value?: string;
}
export async function createParkManualBooking(tenantId: string, data: ParkManualInput, admin: boolean, signal?: AbortSignal): Promise<ParkBooking> {
  const web = !admin && browserOwnerMode();
  const initData = admin || web ? '' : window.Telegram?.WebApp?.initData;
  if (!admin && !web && !initData) throw new Error(pt("Откройте кабинет владельца заново через бота парка."));
  const result = web ? await ownerWebRequest<{ booking: ParkBooking }>('/calendar/manual', { ...data, tenant_id: tenantId }, signal)
    : await request<{ booking: ParkBooking }>(admin ? `/parks/${encodeURIComponent(tenantId)}/calendar/manual` : '/calendar/manual', {
    method: 'POST', signal, body: JSON.stringify(admin ? data : { ...data, tenant_id: tenantId, init_data: initData }),
  }, admin);
  if (result.booking?.asset_id !== data.asset_id || result.booking.entry_type !== data.entry_type
      || result.booking.pricing?.start_date !== data.start_date || result.booking.pricing?.end_date !== data.end_date
      || result.booking.status !== (data.booking_status || 'confirmed')) throw new Error(pt("Данные записи изменились. Обновите календарь перед повторной попыткой."));
  if (web) invalidateParkCalendar(tenantId);
  return result.booking;
}
export interface ParkPeriod { tenant_id: string; init_data: string; asset_id: string; start_date: string; end_date: string; pickup?: import('@/lib/park-pickup').ParkPickup }
export const quoteParkBooking = (period: ParkPeriod, signal?: AbortSignal) => {
  if (!period.init_data) { const { init_data: _unused, ...data } = period; return storefrontBookingRequest<ParkQuote>(period.tenant_id, 'quote', data, signal); }
  return request<ParkQuote>('/bookings/quote', { method: 'POST', body: JSON.stringify(period), signal });
};
export async function submitParkBooking(period: ParkPeriod, quoteToken: string, requestId: string, signal?: AbortSignal, contact?: ParkContact, customerName?: string): Promise<ParkBooking> {
  const { init_data: _unused, ...webPeriod } = period;
  const payload = { quote_token: quoteToken, request_id: requestId, ...(contact ? { contact } : {}) };
  const result = !period.init_data
    ? await storefrontBookingRequest<{ booking: ParkBooking }>(period.tenant_id, 'bookings', { ...webPeriod, ...payload, customer_name: customerName }, signal)
    : await request<{ booking: ParkBooking }>('/bookings', { method: 'POST', body: JSON.stringify({ ...period, ...payload }), signal });
  const booking = result.booking;
  invalidateParkCalendar(period.tenant_id);
  return booking;
}
export async function fetchParkCalendar(tenantId: string, admin: boolean, signal?: AbortSignal): Promise<ParkBooking[]> {
  if (!admin && browserOwnerMode()) return (await ownerWebRequest<{ bookings: ParkBooking[] }>('/calendar', { tenant_id: tenantId }, signal)).bookings;
  const options = admin ? { signal } : { signal, method: 'POST', body: JSON.stringify({ tenant_id: tenantId, init_data: window.Telegram?.WebApp?.initData || '' }) };
  return (await request<{ bookings: ParkBooking[] }>(admin ? `/parks/${encodeURIComponent(tenantId)}/calendar` : '/calendar', options, admin)).bookings;
}
export async function changeParkBookingStatus(tenantId: string, booking: ParkBooking, status: 'confirmed' | 'cancelled', admin: boolean): Promise<void> {
  const action = { status, expected_status: booking.status };
  if (!admin && browserOwnerMode()) {
    await ownerWebRequest('/bookings/status', { ...action, tenant_id: tenantId, booking_id: booking.id });
    invalidateParkCalendar(tenantId);
    return;
  }
  await request(admin ? `/parks/${encodeURIComponent(tenantId)}/bookings/${encodeURIComponent(booking.id)}/status` : '/bookings/status', {
    method: admin ? 'PATCH' : 'POST', body: JSON.stringify(admin ? action : { ...action, tenant_id: tenantId, booking_id: booking.id, init_data: window.Telegram?.WebApp?.initData || '' }),
  }, admin);
  invalidateParkCalendar(tenantId);
}
