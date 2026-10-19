import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: `
  export { VehicleLicensePlateField, VehicleSpecSummary } from './src/components/platform/VehicleDetailsEditor';
  export { ParkLocaleProvider } from './src/contexts/ParkLocaleContext';
  export { saveOwnerAssetDetails } from './src/api/park-owner-fleet';
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
  ui.ParkLocaleProvider, { initialLanguage: language }, React.createElement(component, props)));

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

test('plate summary appears only when the private caller explicitly supplies it', () => {
  assert.match(render(ui.VehicleSpecSummary, { specs: {}, licensePlate: 'ขต 1517' }), /ขต 1517/);
  assert.doesNotMatch(render(ui.VehicleSpecSummary, { specs: {} }), /Госномер|Plate:/);
});

test('owner client sends and returns a structured plate without mixing it into public specs', async () => {
  globalThis.window = { Telegram: { WebApp: { initData: 'signed-test-data' } } };
  const data = { section: 'specs', specs: { seats: 7 }, license_plate: 'ขต 1517 ภูเก็ต' };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/partners/fleet/details');
    assert.deepEqual(JSON.parse(options.body).data, data);
    return new Response(JSON.stringify({ asset: { id: 'asset-a', tenant_id: 'park-a', license_plate: data.license_plate } }));
  };
  const saved = await ui.saveOwnerAssetDetails('park-a', 'asset-a', data);
  assert.equal(saved.license_plate, data.license_plate);
});
