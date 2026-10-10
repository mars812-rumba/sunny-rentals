import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle = await build({ entryPoints: ['src/api/park-owner-fleet.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const previousFetch = globalThis.fetch; const previousWindow = globalThis.window;
afterEach(() => { globalThis.fetch = previousFetch; globalThis.window = previousWindow; });
const signed = () => { globalThis.window = { Telegram: { WebApp: { initData: 'signed-test-data' } } }; };
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('owner fleet uses signed body, no bearer or init_data in URL', async () => {
  signed(); const signal = new AbortController().signal;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/partners/fleet/list'); assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, undefined); assert.equal(options.signal, signal);
    assert.equal(options.cache, 'no-store');
    assert.deepEqual(JSON.parse(options.body), { tenant_id: 'park-a', init_data: 'signed-test-data' });
    return response({ tenant: { tenant_id: 'park-a' }, assets: [] });
  };
  assert.deepEqual((await api.fetchOwnerFleet('park-a', signal)).assets, []);
});
test('missing identity prevents network, foreign response is rejected', async () => {
  globalThis.window = {}; globalThis.fetch = async () => { throw new Error('must not call'); };
  await assert.rejects(api.fetchOwnerFleet('park-a'), /из сообщения бота/);
  signed(); globalThis.fetch = async () => response({ tenant: { tenant_id: 'park-a' }, assets: [{ tenant_id: 'park-b' }] });
  await assert.rejects(api.fetchOwnerFleet('park-a'), /неверные данные/);
});
test('photo uses browser multipart boundary and signed fields', async () => {
  signed();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/partners/fleet/photo'); assert.equal(options.headers, undefined);
    assert.equal(options.body.get('init_data'), 'signed-test-data'); assert.equal(options.body.get('asset_id'), 'test-asset');
    return response({ asset: { tenant_id: 'park-a' } });
  };
  await api.uploadOwnerPhoto('park-a', 'test-asset', new File(['fake'], 'test.png', { type: 'image/png' }));
});
test('private media is POST body and revocation error is actionable', async () => {
  signed();
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/partners/fleet/media'); assert.equal(JSON.parse(options.body).reference, 'assets/photo.webp');
    return new Response('fake-webp');
  };
  assert.equal(await (await api.loadOwnerMedia('park-a', 'assets/photo.webp')).text(), 'fake-webp');
  globalThis.fetch = async () => response({ detail: 'private-server-data' }, 403);
  await assert.rejects(api.archiveOwnerAsset('park-a', 'test-asset'), /Доступ владельца/);
});
