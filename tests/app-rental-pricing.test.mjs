import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: `export * from './src/lib/app-rental-pricing';
export { default as CarList } from './src/components/CarList';
export { LanguageProvider } from './src/contexts/LanguageContext';
export { default as Index } from './src/pages/Index';
export { default as SendBookForm } from './src/components/SendBookForm';`, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react-dom'],
  loader: { '.webp': 'dataurl', '.jpg': 'dataurl', '.png': 'dataurl', '.css': 'empty' },
  define: { 'import.meta.env': '{}' },
});
const compiled = new Module(resolve('tests/app-rental-pricing-fixture.cjs'));
compiled.filename = resolve('tests/app-rental-pricing-fixture.cjs');
compiled.paths = Module._nodeModulePaths(process.cwd());
compiled._compile(bundle.outputFiles[0].text, compiled.filename);
const ui = compiled.exports;
const day = value => new Date(`${value}T00:00:00`);
const pricing = { deposit: 5000, low_season: { price_1_6: 1000, price_7_14: 855, price_15_29: 700, price_30: 600 },
  high_season: { price_1_6: 1200, price_7_14: 1026, price_15_29: 900, price_30: 800 } };

test('4–11 November is seven paid days, not eight; overnight and same-day boundaries work', () => {
  assert.equal(ui.appRentalDays(day('2026-11-04'), day('2026-11-11')), 7);
  assert.equal(ui.appRentalDays(day('2026-11-04'), day('2026-11-11'), '13:00', '12:00'), 7);
  assert.equal(ui.appRentalDays(day('2026-11-04'), day('2026-11-11'), '13:00', '14:00'), 8);
  assert.equal(ui.appRentalDays(day('2026-11-04'), day('2026-11-05')), 1);
  assert.equal(ui.appRentalDays(day('2026-11-04'), day('2026-11-04'), '09:00', '17:00'), 1);
  for (const [start, end, from, to] of [
    ['2026-11-04', '2026-11-04', '13:00', '13:00'], ['2026-11-05', '2026-11-04', '09:00', '17:00'],
    ['2026-11-04', '2026-11-11', '25:00', '13:00'],
  ]) assert.equal(ui.appRentalDays(day(start), day(end), from, to), 0);
  assert.equal(ui.appRentalDays(new Date('invalid'), day('2026-11-11')), 0);
  assert.equal(ui.appRentalDays(null, day('2026-11-11')), 0);
});

test('calendar days do not gain a day over DST, leap day, month or year boundaries', () => {
  for (const [start, end, expected] of [['2026-10-31', '2026-11-02', 2], ['2028-02-28', '2028-03-01', 2],
    ['2026-12-28', '2027-01-04', 7], ['2026-10-28', '2026-11-04', 7]]) {
    assert.equal(ui.appRentalDays(day(start), day(end)), expected);
  }
});

test('season and duration rates follow the selected pickup date and existing public Nov–Apr policy', () => {
  for (const [date, season] of [['2026-10-31', 'low_season'], ['2026-11-01', 'high_season'], ['2027-01-01', 'high_season'],
    ['2027-04-30', 'high_season'], ['2027-05-01', 'low_season']]) assert.equal(ui.appRentalSeason(day(date)), season);
  for (const days of [1, 6, 7, 14, 15, 29, 30, 90]) {
    const key = days >= 30 ? 'price_30' : days >= 15 ? 'price_15_29' : days >= 7 ? 'price_7_14' : 'price_1_6';
    assert.equal(ui.appRentalDailyPrice(pricing, days, day('2026-11-04')), pricing.high_season[key]);
    assert.equal(ui.appRentalDailyPrice(pricing, days, day('2026-10-04')), pricing.low_season[key]);
  }
  assert.equal(ui.appRentalDailyPrice({ low_season: pricing.low_season }, 7, day('2026-11-04')), 855);
});

test('real card/list display high-season weekly total for November even while today is October', () => {
  const RealDate = globalThis.Date;
  globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : ['2026-10-28T12:00:00Z'])); } };
  try {
    const car = { id: 'test-car', name: 'Toyota Yaris', brand: 'Toyota', model: 'Yaris', year: 2022,
      pricing, photos: { gallery: [] }, specs: {} };
    const render = date => renderToStaticMarkup(React.createElement(ui.LanguageProvider, null,
      React.createElement(ui.CarList, { cars: [car], filters: { startDate: day(date), days: 7 }, onBooking() {}, isSubmitting: false })));
    const november = render('2026-11-04');
    assert.ok(november.includes((1026 * 7).toLocaleString() + '฿'));
    assert.match(november, /1026/);
    const october = render('2026-10-04');
    assert.ok(october.includes((855 * 7).toLocaleString() + '฿'));
  } finally { globalThis.Date = RealDate; }
});

test('filter, deep-link handoff, confirmation and outgoing booking share the same calculation helpers', () => {
  const filter = readFileSync('src/components/FilterForm.tsx', 'utf8');
  assert.match(filter, /appRentalDays\(from, to, pickupTime, returnTime\)/);
  assert.doesNotMatch(filter, /Math.ceil\(\(to.getTime\(\) - from.getTime\(\)\)[^\n]+\+ 1/);
  const index = readFileSync('src/pages/Index.tsx', 'utf8');
  assert.match(index, /appRentalDays\(handoff.startDate, handoff.endDate, handoff.pickupTime, handoff.returnTime\)/);
  assert.match(index, /days: appRentalDays\(newFilters.startDate/);
  for (const name of ['src/pages/Index.tsx', 'src/components/SendBookForm.tsx']) {
    const source = readFileSync(name, 'utf8');
    assert.match(source, /appRentalSeason as determineSeason, appRentalDailyPrice as getPriceForPeriod/);
    assert.match(source, /days: filters.days/);
  }
});
