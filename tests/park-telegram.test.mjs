import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Test the real TS client without adding dependencies or writing bundled files.
const result = await build({ entryPoints: ['src/api/park-telegram.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const originalFetch = globalThis.fetch;
const store = new Map();
globalThis.sessionStorage = globalThis.localStorage = {
  getItem: (key) => store.get(key) || null,
  removeItem: (key) => store.delete(key),
};
afterEach(() => { globalThis.fetch = originalFetch; store.clear(); });
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const session = () => store.set('sunny_platform_admin_session', JSON.stringify({ access_token: 'test-admin-session' }));

test('availability is public, dates-only and checks the park in the response', async () => {
  session();
  const signal = new AbortController().signal;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/partners/parks/park-a/availability');
    assert.equal(options.headers.has('Authorization'), false);
    assert.equal(options.signal, signal);
    assert.deepEqual(JSON.parse(options.body), { start_date: '2026-10-11', end_date: '2026-10-14' });
    return response({ tenant_id: 'park-a', start_date: '2026-10-11', end_date: '2026-10-14', days: 3, available_asset_ids: [] });
  };
  assert.deepEqual((await api.fetchParkAvailability('park-a', '2026-10-11', '2026-10-14', signal)).available_asset_ids, []);
  globalThis.fetch = async () => response({ tenant_id: 'park-b', start_date: '2026-10-11', end_date: '2026-10-14', days: 3, available_asset_ids: [] });
  await assert.rejects(api.fetchParkAvailability('park-a', '2026-10-11', '2026-10-14'));
});

test('webhook management requires admin and passes only a fixed route, no credentials in body', async () => {
  globalThis.fetch = async () => { throw new Error('must not send'); };
  await assert.rejects(api.fetchPlatformWebhook(), /Сессия суперадминистратора/);
  await assert.rejects(api.connectPlatformWebhook(), /Сессия суперадминистратора/);
  session();
  const signal = new AbortController().signal;
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.get('Authorization'), 'Bearer test-admin-session');
    assert.equal(options.signal, signal);
    assert.equal(options.body, undefined);
    assert.equal(url, options.method === 'POST' ? '/api/partners/admin/webhook/connect' : '/api/partners/admin/webhook');
    return response({ state: 'configured' });
  };
  assert.equal((await api.fetchPlatformWebhook(signal)).state, 'configured');
  assert.equal((await api.connectPlatformWebhook(signal)).state, 'configured');
});

test('webhook failures explain conflict and unavailable Telegram without upstream secrets', async () => {
  session();
  globalThis.fetch = async () => response({ detail: 'upstream-secret' }, 409);
  await assert.rejects(api.connectPlatformWebhook(), /другой webhook/);
  globalThis.fetch = async () => response({ detail: 'upstream-secret' }, 503);
  await assert.rejects(api.fetchPlatformWebhook(), /Telegram недоступен/);
});

test('public bot link has no admin authorization or stored credentials', async () => {
  session();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/partners/parks/park-a/bot-link');
    assert.equal(options.headers.has('Authorization'), false);
    assert.equal(options.cache, 'no-store');
    return response({ url: 'https://t.me/partners_test_bot?start=ppark-a' });
  };
  assert.equal(await api.fetchParkBotLink('park-a'), 'https://t.me/partners_test_bot?start=ppark-a');
});

test('invitation uses admin session and returns server expiry, never persists invite', async () => {
  session();
  const before = [...store];
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/partners/parks/park-a/owner-invitations');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.get('Authorization'), 'Bearer test-admin-session');
    assert.equal(options.body, '{}');
    return response({ invitation_id: 'a'.repeat(64), url: 'https://t.me/partners_test_bot?start=i_test', expires_in: 3600 });
  };
  assert.equal((await api.createParkOwnerInvitation('park-a')).expires_in, 3600);
  assert.deepEqual([...store], before);
});

test('missing session prevents invitation network call', async () => {
  globalThis.fetch = async () => { throw new Error('must not send'); };
  await assert.rejects(api.createParkOwnerInvitation('park-a'), /Сессия суперадминистратора/);
});

test('expired admin session clears local session', async () => {
  session();
  globalThis.fetch = async () => response({}, 401);
  await assert.rejects(api.createParkOwnerInvitation('park-a'), /Войдите заново/);
  assert.equal(store.size, 0);
});

test('disabled bot and invalid identity have actionable errors', async () => {
  globalThis.fetch = async () => response({}, 404);
  await assert.rejects(api.fetchParkBotLink('park-a'), /ещё не включён/);
  globalThis.fetch = async () => response({}, 403);
  await assert.rejects(api.verifyParkTelegramIdentity('park-a', 'signed'), /заново откройте/);
});

test('identity sends signed data in body, not URL; never sends client role or admin session', async () => {
  session();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/partners/identity');
    assert.deepEqual(JSON.parse(options.body), { tenant_id: 'park-a', init_data: 'signed' });
    assert.equal(options.headers.has('Authorization'), false);
    return response({ tenant_id: 'park-a', user_id: '42', telegram_linked: true, role: 'customer' });
  };
  assert.equal((await api.verifyParkTelegramIdentity('park-a', 'signed')).role, 'customer');
});

test('cross-park identity response and unknown role are rejected', async () => {
  globalThis.fetch = async () => response({ tenant_id: 'park-b', telegram_linked: true, role: 'owner' });
  await assert.rejects(api.verifyParkTelegramIdentity('park-a', 'signed'), /этому парку/);
  globalThis.fetch = async () => response({ tenant_id: 'park-a', telegram_linked: true, role: 'platform_admin' });
  await assert.rejects(api.verifyParkTelegramIdentity('park-a', 'signed'), /этому парку/);
});

test('links to another host, unsafe schemes or malformed bot payloads are rejected', async () => {
  for (const url of ['javascript:alert(1)', 'https://evil.test/?start=x', 'https://t.me/partners_test_bot?start=', 'https://t.me/partners_test_bot?start=x#leak', 'https://user:secret@t.me/partners_test_bot?start=x']) {
    globalThis.fetch = async () => response({ url });
    await assert.rejects(api.fetchParkBotLink('park-a'));
  }
});

test('revocation targets only the chosen park and invite', async () => {
  session();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/partners/parks/park-a/owner-invitations/abc');
    assert.equal(options.method, 'DELETE');
    assert.equal(options.headers.get('Authorization'), 'Bearer test-admin-session');
    return response({ revoked: true });
  };
  await api.revokeParkOwnerInvitation('park-a', 'abc');
});

test('abort signal is preserved on public read and identity', async () => {
  const controller = new AbortController();
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.signal, controller.signal);
    throw new DOMException('Aborted', 'AbortError');
  };
  controller.abort();
  await assert.rejects(api.fetchParkBotLink('park-a', controller.signal), { name: 'AbortError' });
  await assert.rejects(api.verifyParkTelegramIdentity('park-a', 'signed', controller.signal), { name: 'AbortError' });
});

test('quote and submit preserve dates and idempotency ID without trusting browser totals', async () => {
  const period = { tenant_id: 'park-a', init_data: 'signed', asset_id: 'a'.repeat(32), start_date: '2026-10-11', end_date: '2026-10-14' };
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.has('Authorization'), false);
    if (url.endsWith('/quote')) {
      assert.deepEqual(JSON.parse(options.body), period);
      return response({ quote_token: 'b'.repeat(64), total_rental: '2400.00' });
    }
    assert.deepEqual(JSON.parse(options.body), { ...period, quote_token: 'b'.repeat(64), request_id: 'same_request_12345' });
    return response({ booking: { id: 'id', status: 'requested' } });
  };
  const quote = await api.quoteParkBooking(period);
  assert.equal((await api.submitParkBooking(period, quote.quote_token, 'same_request_12345')).status, 'requested');
});

test('admin calendar is scoped and authenticated; conflict explains recovery', async () => {
  session();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/partners/parks/park-a/calendar');
    assert.equal(options.headers.get('Authorization'), 'Bearer test-admin-session');
    return response({ bookings: [] });
  };
  assert.deepEqual(await api.fetchParkCalendar('park-a', true), []);
  globalThis.fetch = async () => response({}, 409);
  await assert.rejects(api.quoteParkBooking({}), /Обновите расчёт/);
});
