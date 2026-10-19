import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/lib/park-calendar-refresh.ts', 'src/lib/park-calendar-updates.ts'], bundle: true, write: false, outdir: '/unused', format: 'esm', platform: 'node' });
const load = async name => import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles.find(file => file.path.endsWith(name)).text).toString('base64')}`);
const policy = await load('park-calendar-refresh.js');
const events = await load('park-calendar-updates.js');

test('unchanged server snapshots preserve identity; edits, cancellation and empty lists replace it', () => {
  const previous = [{ id: 'a', tenant_id: 'park-a', status: 'confirmed', pricing: { days: 7 } }];
  assert.equal(policy.retainCalendarSnapshot(previous, JSON.parse(JSON.stringify(previous))), previous);
  for (const incoming of [[], [{ ...previous[0], status: 'cancelled' }], [{ ...previous[0], pricing: { days: 8 } }], [{ ...previous[0], tenant_id: 'park-b' }]]) {
    assert.equal(policy.retainCalendarSnapshot(previous, incoming), incoming);
  }
  assert.equal(previous[0].status, 'confirmed');
});

test('polls at 60s, refreshes on focus, skips hidden documents and releases all listeners', () => {
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  const windowListeners = new Map(), documentListeners = new Map(), timers = new Map();
  let calls = 0, interval = 0;
  globalThis.window = {
    setInterval(callback, ms) { interval = ms; timers.set(1, callback); return 1; },
    clearInterval(id) { timers.delete(id); },
    addEventListener: (type, callback) => windowListeners.set(type, callback),
    removeEventListener: type => windowListeners.delete(type),
  };
  globalThis.document = { visibilityState: 'visible',
    addEventListener: (type, callback) => documentListeners.set(type, callback),
    removeEventListener: type => documentListeners.delete(type),
  };
  try {
    const stop = policy.startParkCalendarPolling(() => calls++);
    assert.equal(interval, 60_000); assert.equal(calls, 0);
    timers.get(1)(); assert.equal(calls, 1);
    document.visibilityState = 'hidden'; timers.get(1)(); windowListeners.get('focus')(); assert.equal(calls, 1);
    document.visibilityState = 'visible'; documentListeners.get('visibilitychange')(); assert.equal(calls, 2);
    windowListeners.get('focus')(); assert.equal(calls, 3);
    stop(); assert.equal(timers.size, 0); assert.equal(windowListeners.size, 0); assert.equal(documentListeners.size, 0);
  } finally { globalThis.window = oldWindow; globalThis.document = oldDocument; }
});

test('same-tab mutations invalidate immediately, scoped to tenant, and unsubscribe cleanly', () => {
  let a = 0, b = 0;
  const stopA = events.subscribeParkCalendar('park-a', () => a++);
  const stopB = events.subscribeParkCalendar('park-b', () => b++);
  events.invalidateParkCalendar('park-a'); assert.equal(a, 1); assert.equal(b, 0);
  stopA(); events.invalidateParkCalendar('park-a'); assert.equal(a, 1);
  events.invalidateParkCalendar('park-b'); assert.equal(b, 1); stopB();
});

test('heavy views retain lazy-mounted DOM; memo dependencies do not include view or selection', () => {
  const source = readFileSync('src/components/platform/ParkBookingCalendar.tsx', 'utf8');
  for (const name of ['timetable', 'deliveries']) {
    const element = source.match(new RegExp(`const ${name} = useMemo\\([\\s\\S]*?\\n  \\[([^\\]]*)\\]\\);`));
    assert.ok(element, name); assert.doesNotMatch(element[1], /\bview\b|\bselection\b/);
    assert.match(source, new RegExp(`<TabsContent value="${name}" forceMount hidden=\\{view !== '${name}'\\}`));
  }
  assert.match(source, /deliveriesVisited && <TabsContent/);
  assert.match(source, /key=\{`\$\{props.tenantId\}:\$\{!!props.admin\}`\}/);
  assert.match(source, /if \(!refreshEnabled \|\| busy \|\| draft \|\| selection \|\| cancelTarget \|\| vehicleId\) return/);
  assert.match(source, /if \(!inFlight.current\) setReload/);
  assert.match(source, /setLoading\(!loaded.current\)/);
});

test('typing is local to form; submit reads the latest draft and navigation does not refetch', () => {
  const source = readFileSync('src/components/platform/PlatformTenantWorkspace.tsx', 'utf8');
  assert.match(source, /onDraftChange = useCallback\(\(data: PlatformAssetInput\) => \{ formDraft.current = data; \}, \[\]\)/);
  assert.match(source, /fleetBasicInput\(formDraft.current\)/);
  const navigation = source.match(/const selectScreen = [\s\S]*?\n  };/)[0];
  assert.doesNotMatch(navigation, /setCalendarRevision|fetch/);
  const form = readFileSync('src/components/platform/VehicleBasicFields.tsx', 'utf8');
  assert.match(form, /setDraft\(data\); onDraftChange\(data\)/);
  assert.doesNotMatch(form, /setTimeout|debounce/);
});
