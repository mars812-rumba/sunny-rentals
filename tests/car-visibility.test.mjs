import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transformSync, buildSync } from 'esbuild';

const source = readFileSync('src/hooks/useCarVisibility.ts', 'utf8');
function fixture(fetch) {
  const states = [];
  const context = {
    fetch, useRef: initial => ({ current: initial }),
    useState: initial => {
      const index = states.push(initial) - 1;
      return [initial, update => { states[index] = typeof update === 'function' ? update(states[index]) : update; }];
    },
  };
  runInNewContext(transformSync(source.replace(/^import[^\n]+\n/, '').replace(/export /g, '') +
    '\nglobalThis.makeHook = useCarVisibility;', { loader: 'ts' }).code, context);
  const saved = [];
  const hook = context.makeHook({ apiUrl: '', adminKey: 'fixture', onSaved: car => saved.push(car), refresh: async () => {} });
  return { hook, states, saved };
}

test('toggle patches only visibility, waits for confirmation and handles repeated clicks', async () => {
  let finish;
  const requests = [];
  const f = fixture((url, options) => {
    requests.push({ url, options });
    return new Promise(resolve => { finish = resolve; });
  });
  const pending = f.hook.toggle('car-id', false);
  await f.hook.toggle('car-id', true);
  assert.equal(requests.length, 1);
  assert.equal(f.states[0]['car-id'], true);
  assert.equal(f.saved.length, 0);
  assert.match(requests[0].url, /\/car-id\/visibility\?key=fixture$/);
  assert.equal(requests[0].options.method, 'PATCH');
  assert.deepEqual(JSON.parse(requests[0].options.body), { available: false });
  finish({ ok: true, json: async () => ({ id: 'car-id', available: false, updated_at: 'now' }) });
  await pending;
  assert.equal(f.saved[0].available, false);
  assert.equal(f.states[0]['car-id'], false);
});

test('HTTP errors, network errors and mismatching confirmations leave car unchanged and allow retry', async () => {
  for (const fetch of [async () => ({ ok: false }), async () => { throw new Error('offline'); },
    async () => ({ ok: true, json: async () => ({ id: 'car-id', available: true }) })]) {
    const f = fixture(fetch);
    await f.hook.toggle('car-id', false);
    assert.equal(f.saved.length, 0);
    assert.ok(f.states[1]);
    assert.equal(f.states[0]['car-id'], false);
    await f.hook.toggle('car-id', false);
    assert.equal(f.states[0]['car-id'], false);
  }
});

test('both manager screens keep hidden cars and expose pending/error state accessibly', () => {
  for (const path of ['src/pages/CarsPage.tsx', 'src/pages/AdminPanel.tsx']) {
    const page = readFileSync(path, 'utf8');
    assert.match(page, /Object.values\(data.cars \|\| \{\}\)/);
    assert.match(page, /checked=\{car.available !== false\}/);
    assert.match(page, /disabled=\{visibility.pending\[car.id\]\}/);
    assert.match(page, /aria-label=\{`Показывать/);
    assert.match(page, /visibility.error && <p role="alert"/);
    assert.doesNotMatch(page, /isAdmin \? `\/api\/admin\/cars/);
  }
});

test('marketing export excludes hidden inventory before model adaptation', () => {
  const content = readFileSync('apps/marketing/src/content/cars.ts', 'utf8');
  assert.match(content, /if \(inventory.available === false\) return \[\];/);
});

test('changed manager screens bundle without running deployment', () => {
  buildSync({ entryPoints: ['src/pages/CarsPage.tsx', 'src/pages/AdminPanel.tsx'], outdir: '/tmp/unused-visibility-output',
    bundle: true, write: false, platform: 'browser', define: { 'import.meta.env': '{}' },
    loader: { '.webp': 'dataurl', '.png': 'dataurl', '.jpg': 'dataurl' }, logLevel: 'silent' });
});
