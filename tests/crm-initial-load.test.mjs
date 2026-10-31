import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { build, transformSync } from 'esbuild';
import Module from 'node:module';
import { resolve } from 'node:path';

const source = readFileSync('src/pages/CRMPage.tsx', 'utf8');
const match = source.match(/const loadMainData = useCallback\((async[\s\S]*?), \[activeStatus, period\]\);/);
assert.ok(match, 'Exercise the real CRM loading callback');
const callback = transformSync(`(${match[1]})`, { loader: 'ts' }).code;
const bundle = await build({ entryPoints: ['src/lib/crm-status-navigation.ts'], bundle: true,
  write: false, format: 'cjs', platform: 'node' });
const compiled = new Module(resolve('tests/crm-load-fixture.cjs'));
compiled.filename = resolve('tests/crm-load-fixture.cjs');
compiled._compile(bundle.outputFiles[0].text, compiled.filename);
const { normalizeCrmLead } = compiled.exports;

function fixture() {
  const pending = [];
  const state = { all: [], users: [], stats: null, error: '', loading: false };
  const context = {
    mainController: { current: null }, period: 'all', activeStatus: 'new', AbortController,
    normalizeCrmLead, console: { error() {} },
    fetch(url, options) { return new Promise((resolve, reject) => pending.push({ url, options, resolve, reject })); },
    setLoading(value) { state.loading = value; }, setLoadError(value) { state.error = value; },
    setAllUsers(value) { state.all = value; }, setUsers(value) { state.users = value; },
    setStats(value) { state.stats = value; },
  };
  const load = vm.runInNewContext(callback, context);
  const respond = (request, data, ok = true) => request.resolve({ ok, async json() { return data; } });
  return { context, pending, state, load, respond };
}

test('first opening starts exactly two requests in parallel and derives every tab from one snapshot', async () => {
  for (const status of ['new', 'in_work', 'pre_booking', 'confirmed']) {
    const f = fixture();
    f.context.activeStatus = status;
    const done = f.load();
    assert.equal(f.pending.length, 2, 'Both requests start before either response');
    assert.deepEqual(f.pending.map(r => r.url), ['/api/crm/users?period=all', '/api/crm/stats?period=all']);
    assert.equal(f.pending[0].options.signal, f.pending[1].options.signal);
    f.respond(f.pending[1], { status: 'ok', stats: { new: 2 } });
    f.respond(f.pending[0], { status: 'ok', users: [
      { user_id: 1, status: 'interested' }, { user_id: 2, status: 'in_progress' },
      { user_id: 3, status: 'pending' }, { user_id: 4, status: 'confirmed' },
    ] });
    await done;
    assert.equal(f.state.all.length, 4);
    assert.equal(f.state.users.length, 1);
    assert.equal(f.state.users[0].status, status);
    assert.equal(f.state.loading, false);
    assert.equal(f.state.error, '');
  }
});

test('failed optional statistics do not discard the successful user list', async () => {
  for (const mode of ['network', 'http', 'json']) {
    const f = fixture();
    const done = f.load();
    f.respond(f.pending[0], { status: 'ok', users: [{ user_id: 1, status: 'new' }] });
    if (mode === 'network') f.pending[1].reject(new Error('offline'));
    if (mode === 'http') f.respond(f.pending[1], {}, false);
    if (mode === 'json') f.pending[1].resolve({ ok: true, json() { throw new Error('invalid JSON'); } });
    await done;
    assert.equal(f.state.users.length, 1);
    assert.equal(f.state.error, '');
    assert.equal(f.state.loading, false);
  }
});

test('failed or malformed user responses show an error rather than a false empty state', async () => {
  for (const [data, ok] of [[{ status: 'ok', users: [] }, false], [{ status: 'error' }, true], [{ status: 'ok' }, true]]) {
    const f = fixture();
    const done = f.load();
    f.respond(f.pending[0], data, ok);
    f.respond(f.pending[1], { status: 'ok', stats: {} });
    await done;
    assert.ok(f.state.error);
    assert.equal(f.state.loading, false);
  }
});

test('a new tab/period aborts both old requests and late responses cannot overwrite current state', async () => {
  const f = fixture();
  const old = f.load();
  const oldSignal = f.pending[0].options.signal;
  f.context.period = 'week';
  f.context.activeStatus = 'confirmed';
  const current = f.load();
  assert.equal(oldSignal.aborted, true);
  assert.equal(f.pending[2].url, '/api/crm/users?period=week');
  f.respond(f.pending[2], { status: 'ok', users: [{ user_id: 2, status: 'confirmed' }] });
  f.respond(f.pending[3], { status: 'ok', stats: { confirmed: 1 } });
  await current;
  f.respond(f.pending[0], { status: 'ok', users: [{ user_id: 1, status: 'new' }] });
  f.respond(f.pending[1], { status: 'ok', stats: { confirmed: 100 } });
  await old;
  assert.equal(f.state.users[0].user_id, 2);
  assert.equal(f.state.stats.confirmed, 1);
  assert.equal(f.state.loading, false);
});
