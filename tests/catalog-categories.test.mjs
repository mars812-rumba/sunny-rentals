import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const bundled = await build({ stdin: { contents: `
  export * from './src/lib/catalog-categories';
  export { default as FilterForm } from './src/components/FilterForm';
  export { LanguageProvider } from './src/contexts/LanguageContext';
`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'node', format: 'cjs',
  external: ['react', 'react/jsx-runtime', 'react-dom'],
  loader: { '.webp': 'dataurl', '.png': 'dataurl', '.jpg': 'dataurl' },
  plugins: [{ name: 'viewport-fixture', setup(builder) {
    builder.onLoad({ filter: /hooks\/use-mobile\.tsx?$/ }, () => ({
      contents: 'export const useIsMobile = () => Boolean(globalThis.__catalogTestMobile);', loader: 'ts',
    }));
  } }],
});
const compiled = new Module(resolve('tests/catalog-categories-fixture.cjs'));
compiled.filename = resolve('tests/catalog-categories-fixture.cjs');
compiled.paths = Module._nodeModulePaths(process.cwd());
compiled._compile(bundled.outputFiles[0].text, compiled.filename);
const ui = compiled.exports;

test('categories require at least one enabled vehicle and retain canonical order', () => {
  assert.deepEqual(ui.visibleCatalogCategories([
    { class: 'bikes', available: false }, { class: 'sedan', available: false },
    { class: 'compact', available: true }, { class: 'sedan', available: true },
    { class: 'unknown', available: true },
  ]), ['sedan', 'compact']);
  assert.deepEqual(ui.visibleCatalogCategories([{ class: 'bikes', available: false }]), []);
  assert.deepEqual(ui.visibleCatalogCategories([]), []);
});

test('legacy missing/null flags stay visible; bookings on dates do not remove category', () => {
  assert.deepEqual(ui.visibleCatalogCategories([
    { class: 'suv', available: null }, { class: 'sedan' },
    { class: '7s', available: true, bookings: [{ start_date: '2026-11-01', end_date: '2026-12-01' }] },
  ]), ['sedan', 'suv', '7s']);
});

test('lost selection falls back, valid selection stays, empty inventory clears selection', () => {
  assert.equal(ui.reconcileCatalogCategory('bikes', ['sedan', 'compact']), 'sedan');
  assert.equal(ui.reconcileCatalogCategory('compact', ['sedan', 'compact']), 'compact');
  assert.equal(ui.reconcileCatalogCategory('bikes', []), '');
  assert.equal(ui.reconcileCatalogCategory('', ['sedan']), '');
  assert.deepEqual(ui.visibleCatalogCategories([{ class: 'bikes', available: true }]), ['bikes']);
});

test('actual form omits empty buttons on mobile and desktop and marks selected category', () => {
  try {
    for (const mobile of [true, false]) {
      globalThis.__catalogTestMobile = mobile;
      for (const visible of [['sedan', 'compact'], ['bikes'], []]) {
        const html = renderToStaticMarkup(React.createElement(ui.LanguageProvider, null,
          React.createElement(ui.FilterForm, {
            visibleCategoryIds: visible, selectedCategory: visible[0] || '',
            onFiltersChange() {}, onCategoryChange() {},
          })));
        assert.equal((html.match(/aria-pressed=/g) || []).length, visible.length);
        assert.equal((html.match(/aria-pressed="true"/g) || []).length, visible.length ? 1 : 0);
        if (!visible.includes('bikes')) assert.doesNotMatch(html, /Скутеры и мотоциклы/);
        if (mobile && visible.includes('bikes')) assert.match(html, /Скутеры и мотоциклы/);
      }
    }
  } finally {
    delete globalThis.__catalogTestMobile;
  }
});

test('catalog reconciles deep links after loading and has a real empty state', () => {
  const index = readFileSync('src/pages/Index.tsx', 'utf8');
  assert.match(index, /\[carsLoading, visibleCategoryIds, selectedCategory\]/);
  assert.match(index, /visibleCategoryIds=\{visibleCategoryIds\}/);
  assert.match(index, /if \(visibleCategoryIds.length === 0\)/);
  assert.match(index, /role="status">\{t\('catalog_empty'\)\}/);
  assert.match(index, /car.available !== false && car.class === selectedCategory/);
});
