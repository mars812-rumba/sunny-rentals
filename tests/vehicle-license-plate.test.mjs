import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: `
  export { VehicleSpecSummary } from './src/components/platform/VehicleDetailsEditor';
  export { VehicleLicensePlateField, VehicleBasicFields } from './src/components/platform/VehicleBasicFields';
  export { ParkWorkspaceNavigation } from './src/components/platform/ParkWorkspaceNavigation';
  export { FleetVehicleIdentity } from './src/components/platform/FleetVehicleIdentity';
  export { ParkLocaleProvider } from './src/contexts/ParkLocaleContext';
  export { saveOwnerAsset } from './src/api/park-owner-fleet';
  export { fleetBasicInput } from './src/lib/fleet-asset';
  export { saveParkLanguage } from './src/lib/park-locale';
`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'node',
  format: 'cjs', jsx: 'automatic', external: ['react', 'react/jsx-runtime', 'react-dom'],
  define: { 'import.meta.env.VITE_API_URL': '""' } });
const compiled = new Module(resolve('tests/license-plate-fixture.cjs'));
compiled.filename = resolve('tests/license-plate-fixture.cjs');
compiled.paths = Module._nodeModulePaths(process.cwd());
compiled._compile(bundle.outputFiles[0].text, compiled.filename);
const ui = compiled.exports;
const previousWindow = globalThis.window;
const previousFetch = globalThis.fetch;
afterEach(() => { globalThis.window = previousWindow; globalThis.fetch = previousFetch; ui.saveParkLanguage('ru'); });
const render = (component, props, language = 'ru') => renderToStaticMarkup(React.createElement(
  ui.ParkLocaleProvider, { initialLanguage: language, showSwitcher: false }, React.createElement(component, props)));

test('plate field has a linked label and hint, preserves Thai text, and is optional', () => {
  for (const language of ['ru', 'en']) {
    const html = render(ui.VehicleLicensePlateField, { id: 'car', value: 'ขต 1517 ภูเก็ต', onChange() {} }, language);
    assert.match(html, /for="car-license-plate"/);
    assert.match(html, /id="car-license-plate"/);
    assert.match(html, /aria-describedby="car-license-plate-hint"/);
    assert.match(html, /id="car-license-plate-hint"/);
    assert.match(html, /maxLength="80"/i);
    assert.match(html, /ขต 1517 ภูเก็ต/);
    assert.ok(html.includes(language === 'en' ? 'Registration plate' : 'Госномер'));
    assert.doesNotMatch(html, /required=/);
  }
});

test('plate belongs to basic editing, not the characteristics editor or public spec summary', () => {
  assert.doesNotMatch(render(ui.VehicleSpecSummary, { specs: {} }), /Госномер|Plate:/);
  const details = readFileSync('src/components/platform/VehicleDetailsEditor.tsx', 'utf8');
  const editor = details.slice(details.indexOf('export function VehicleDetailsEditor('));
  assert.doesNotMatch(editor, /<VehicleLicensePlateField|license_plate/);
  const workspace = readFileSync('src/components/platform/PlatformTenantWorkspace.tsx', 'utf8');
  assert.match(workspace, /<VehicleBasicDraftFields initialData=\{form\}/);
  const basic = readFileSync('src/components/platform/VehicleBasicFields.tsx', 'utf8');
  assert.match(basic, /<VehicleLicensePlateField id=\{id\} value=\{data.license_plate/);
  assert.match(workspace, /license_plate: asset.license_plate \|\| ''/);
});

test('owner client sends and returns a structured plate without mixing it into public specs', async () => {
  globalThis.window = { Telegram: { WebApp: { initData: 'signed-test-data' } } };
  const data = ui.fleetBasicInput({ name: 'Toyota', asset_type: 'car', brand: 'Toyota', model: 'Veloz', year: 2024, color: 'Gray', license_plate: 'ขต 1517 ภูเก็ต' });
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/partners/fleet/save');
    assert.deepEqual(JSON.parse(options.body).data, data);
    return new Response(JSON.stringify({ asset: { id: 'asset-a', tenant_id: 'park-a', license_plate: data.license_plate } }));
  };
  const saved = await ui.saveOwnerAsset('park-a', data, 'asset-a');
  assert.equal(saved.license_plate, data.license_plate);
});

test('basic input preserves intentional clearing but omits plate on visibility-only updates', () => {
  const base = { name: 'Toyota', asset_type: 'car', brand: '', model: '', year: null, color: '', public: true };
  assert.ok(!Object.hasOwn(ui.fleetBasicInput(base), 'license_plate'));
  assert.equal(ui.fleetBasicInput({ ...base, license_plate: '' }).license_plate, '');
});

test('private fleet card shows one escaped plate with the vehicle type directly below its name', () => {
  for (const language of ['ru', 'en']) {
    const html = render(ui.FleetVehicleIdentity, { asset: { name: 'Toyota Veloz', asset_type: 'car', license_plate: 'กจ 2490 พังงา <script>' } }, language);
    assert.match(html, /<h3[^>]*>Toyota Veloz<\/h3>/);
    assert.match(html, /lucide-car-front/);
    assert.match(html, /flex-wrap/);
    assert.match(html, /break-words/);
    assert.ok(html.indexOf('</h3>') < html.indexOf('กจ 2490'));
    assert.equal((html.match(/กจ 2490/g) || []).length, 1);
    assert.ok(html.includes(language === 'ru' ? 'Госномер: ' : 'Plate: '));
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
    for (const license_plate of [undefined, null, '', '   ']) {
      const empty = render(ui.FleetVehicleIdentity, { asset: { name: 'Toyota', asset_type: 'car', license_plate } }, language);
      assert.doesNotMatch(empty, /Госномер:|Plate:|·/);
    }
  }
});

test('basic vehicle editor groups all fields with linked icon labels in RU and EN', () => {
  const data = { name: 'Toyota <script>', asset_type: 'car', brand: 'Toyota', model: 'Veloz', year: 2024, color: 'Gray', license_plate: 'กจ 2490 พังงา', public: true };
  for (const language of ['ru', 'en']) {
    const html = render(ui.VehicleBasicFields, { data, onChange() {} }, language);
    assert.equal((html.match(/<fieldset/g) || []).length, 3);
    assert.equal((html.match(/<legend/g) || []).length, 3);
    for (const text of language === 'ru' ? ['Название и модель', 'Данные автомобиля', 'Видимость на витрине'] : ['Name and model', 'Vehicle details', 'Storefront visibility']) assert.ok(html.includes(text));
    const ids = [...html.matchAll(/<(?:input|select)\b[^>]*\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, 7);
    for (const id of ids) assert.ok(html.includes(`for="${id}"`), id);
    assert.equal(new Set(ids).size, ids.length);
    for (const icon of ['lucide-type', 'lucide-factory', 'lucide-car-front', 'lucide-calendar-days', 'lucide-palette', 'lucide-id-card', 'lucide-eye']) assert.ok(html.includes(icon), icon);
    assert.match(html, /grid-cols-1 gap-5 sm:grid-cols-2/);
    assert.match(html, /Toyota &lt;script&gt;/);
    assert.match(html, /กจ 2490 พังงา/);
    assert.doesNotMatch(html, /<script>/);
  }
});

test('workspace navigation is mobile bottom / desktop inline with one current screen and safe area', () => {
  for (const language of ['ru', 'en']) for (const section of ['calendar', 'requests', 'fleet']) {
    const html = render(ui.ParkWorkspaceNavigation, { section, onSelect() {} }, language);
    const labels = language === 'ru' ? ['Календарь', 'Заявки', 'Автопарк'] : ['Calendar', 'Requests', 'Fleet'];
    assert.match(html, /<nav aria-label=/);
    assert.equal((html.match(/<button/g) || []).length, 3);
    assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
    const active = html.match(/<button[^>]+aria-current="page"[\s\S]*?<\/button>/)[0];
    assert.ok(active.includes(labels[['calendar', 'requests', 'fleet'].indexOf(section)]));
    assert.ok(html.indexOf(labels[0]) < html.indexOf(labels[1]));
    assert.ok(html.indexOf(labels[1]) < html.indexOf(labels[2]));
    assert.match(html, /fixed inset-x-0 bottom-0 z-40/);
    assert.match(html, /safe-area-inset-bottom/);
    assert.match(html, /md:static/);
    assert.doesNotMatch(html, /role="tab/);
  }
});
