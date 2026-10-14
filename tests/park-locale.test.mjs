import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: `export * from './src/lib/park-locale';
 export { ParkCalendarActions } from './src/components/platform/ParkBookingCalendar';
 export * from './src/lib/vehicle-spec-options';
 export { VehicleSpecsFields } from './src/components/platform/VehicleSpecsFields';
 export { ParkCatalogPrice } from './src/components/platform/ParkCatalogPrice';
 export { catalogRentalPrice } from './src/lib/catalog-rental-price';
 export * from './src/lib/season-date-input';
 export { parkEnglish } from './src/locales/park-en';
 export { ParkLocaleProvider, ParkLanguageSwitcher } from './src/contexts/ParkLocaleContext';
 export { ParkPickupFields, ParkPickupSummary } from './src/components/platform/ParkPickupFields';
 export { ParkQuoteSummary, ParkContactFields } from './src/components/platform/ParkBookingForm';
 export { ParkBookingReceipt } from './src/components/platform/ParkBookingReceipt';
 export { ParkStorefrontHeader } from './src/components/platform/ParkStorefrontHeader';
 export { ParkStorefrontHero } from './src/components/platform/ParkStorefrontHero';
 export { ParkTelegramEntry } from './src/components/platform/ParkTelegramEntry';
 export { ParkRequestItem, ParkRequestsPanel } from './src/components/platform/ParkRequestsPanel';
 export { ParkCalendarMonthSelect } from './src/components/platform/ParkBookingCalendar';
 export { ParkDateField } from './src/components/platform/ParkDateField';
 export { ParkManualBookingFields as ParkManualBookingForm } from './src/components/platform/ParkManualBookingForm';
 export { openParkDatePicker } from './src/lib/park-date-picker';
 export { filterParkRequests } from './src/lib/park-request-filters';
 export { VehiclePricingFields, VehicleTariffTable, VehicleSpecSummary } from './src/components/platform/VehicleDetailsEditor';
 export { PlatformTenantWorkspace } from './src/components/platform/PlatformTenantWorkspace';
 export { SchedulerCalendar } from './src/components/admin/SchedulerCalendar';
 export { MonthCalendarView } from './src/components/admin/MonthCalendarView';
 export { quoteParkBooking, submitParkBooking } from './src/api/park-telegram';
 export { ownerWebRequest } from './src/api/park-owner-web';
 export { dateLabel, parkDateDisplay, seasonDateLabel, rentalMoney, paidRentalDays } from './src/lib/park-rental';`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react/jsx-runtime', 'react-dom'], define: { 'import.meta.env.VITE_API_URL': '""' } });
const compiled = new Module(resolve('tests/park-locale-fixture.cjs'));
compiled.filename = resolve('tests/park-locale-fixture.cjs');
compiled.paths = Module._nodeModulePaths(process.cwd());
compiled._compile(bundle.outputFiles[0].text, compiled.filename);
const ui = compiled.exports;
const e = React.createElement;
const originalWindow = globalThis.window;
const originalFetch = globalThis.fetch;
afterEach(() => { ui.saveParkLanguage('ru'); globalThis.window = originalWindow; globalThis.fetch = originalFetch; });
const render = (component, props, language = 'en') => {
 ui.saveParkLanguage(language);
 return renderToStaticMarkup(e(ui.ParkLocaleProvider, { initialLanguage: language }, e(component, props)));
};
const visible = html => html.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ');

test('catalog uses server totals for all pricing modes and rejects stale date/time prices', () => {
 const period = { start: '2026-11-18', end: '2026-11-29', pickup: { time: '08:02', return_time: '08:02' } };
 const rental = { days: 11, total_rental: '13200', daily_rate: '1200', deposit: '8000', currency: 'THB' };
 const availability = { start_date: period.start, end_date: period.end, pickup_time: '08:02', return_time: '08:02', available_asset_ids: ['zs'], prices: { zs: rental } };
 assert.equal(ui.catalogRentalPrice(availability, period, 'zs'), rental);
 assert.equal(ui.catalogRentalPrice(availability, { ...period, end: '2026-11-30' }, 'zs'), undefined);
 assert.equal(ui.catalogRentalPrice(availability, { ...period, pickup: { ...period.pickup, return_time: '09:00' } }, 'zs'), undefined);
 assert.equal(ui.catalogRentalPrice(availability, period, 'private'), undefined);
 assert.equal(ui.catalogRentalPrice({ ...availability, prices: undefined }, period, 'zs'), undefined);
 for (const language of ['ru', 'en']) {
  for (const tariff_grid of [null, { mode: 'duration' }, { mode: 'seasonal' }]) {
   const asset = { daily_rate: 900, deposit: 8000, tariff_grid };
   const html = render(ui.ParkCatalogPrice, { asset, currency: 'THB', selected: true, rental }, language);
   assert.ok(html.includes(ui.rentalMoney('13200', 'THB'))); assert.ok(html.includes(ui.rentalMoney('1200', 'THB')));
   assert.doesNotMatch(visible(html), /from |от /);
   const noPrice = render(ui.ParkCatalogPrice, { asset, currency: 'THB', selected: true }, language);
   assert.ok(!noPrice.includes(ui.rentalMoney('900', 'THB')));
  }
 }
 const mixed = render(ui.ParkCatalogPrice, { asset: { daily_rate: 900, deposit: 8000 }, currency: 'THB', selected: true, rental: { ...rental, tariff_breakdown: [{ season: 'low_season' }, { season: 'high_season' }] } });
 assert.match(mixed, /mixed seasons/); assert.doesNotMatch(mixed, /\/ day/);
});

test('season editor shows day-first dates and shorter hints while keeping MM-DD wire values', () => {
 for (const [wire, display] of [['11-01', '01.11'], ['03-31', '31.03'], ['02-29', '29.02']]) {
  assert.equal(ui.seasonDateInputValue(wire), display);
  assert.equal(ui.seasonDateWireValue(display), wire);
 }
 for (const partial of ['', '0', '01', '01.', '01.1', '01.11']) assert.equal(ui.seasonDateInputValue(ui.seasonDateWireValue(partial)), partial);
 const rates = { price_1_6: 800, price_7_14: 700, price_15_29: 600, price_30: 500 };
 const props = { id: 'season', currency: 'THB', mode: 'seasonal', dailyRate: '800', grid: { low_season: rates, high_season: rates, high_start: '11-01', high_end: '03-31' }, onModeChange() {}, onDailyRateChange() {}, onGridChange() {} };
 for (const language of ['ru', 'en']) {
  const html = render(ui.VehiclePricingFields, props, language);
  assert.match(html, /id="season-high_start"[^>]*value="01\.11"/);
  assert.match(html, /id="season-high_end"[^>]*value="31\.03"/);
  assert.doesNotMatch(html, /value="11-01"|value="03-31"|MM-DD|ММ-ДД/);
  assert.match(html, /aria-describedby="season-season-hint"/);
  const input = html.match(/<input[^>]*id="season-high_start"[^>]*>/)[0];
  const pattern = new RegExp(`^(?:${input.match(/pattern="([^"]+)"/)[1]})$`);
  assert.ok(pattern.test('01.11')); assert.ok(pattern.test('31.03'));
  for (const bad of ['11-01', '31.13', '00.11']) assert.equal(pattern.test(bad), false);
  if (language === 'en') assert.doesNotMatch(visible(html), /[А-Яа-яЁё]/);
 }
});

test('storefront receipt preserves the actual booking number and pending meaning in RU/EN', () => {
 const booking = { id: 'internal-id', booking_number: '100017', currency: 'THB', pricing: { asset_name: 'MG 5', start_date: '2026-10-14', end_date: '2026-10-22', days: 8, total_rental: '7700', total_payable: '8700' }, deposit: { amount: '8000' } };
 for (const language of ['ru', 'en']) {
  const html = render(ui.ParkBookingReceipt, { booking }, language);
  for (const tone of ['bg-slate-100', 'bg-emerald-50', 'bg-amber-50', 'bg-purple-50']) assert.ok(html.includes(tone));
  assert.doesNotMatch(html, /bg-blue-50/);
  assert.match(html, /bg-slate-100[^>]*>.*?Номер:|bg-slate-100[^>]*>.*?Number:/);
  assert.match(html, /100017/); assert.doesNotMatch(html, /internal-id/);
  assert.match(html, /MG 5/); assert.ok(html.includes(ui.rentalMoney('8700', 'THB')));
  assert.match(html, language === 'ru' ? /14 октября 2026/ : /14 October 2026/);
  assert.match(html, language === 'ru' ? /ещё не подтверждённая бронь/ : /not a confirmed booking/);
 }
 const source = readFileSync('src/pages/ParkStorefrontPage.tsx', 'utf8');
 assert.match(source, /created \? <>/);
 assert.match(source, /querySelector\('\[data-park-sheet-body\]'\)/);
 assert.match(source, /body\.scrollTop = 0/);
 assert.match(source, /receiptTitle\.current\?\.focus\(\{ preventScroll: true \}\)/);
 assert.match(source, /onCreated=\{setCreated\}/);
 assert.match(readFileSync('src/components/platform/ParkBookingForm.tsx', 'utf8'), /onCreated\?\.\(result\)/);
});

test('storefront header contains only logo and language, with the park name in the clean hero', () => {
 const name = 'Rental company with a very long name';
 for (const logo of [undefined, e('img', { src: 'blob:logo', alt: 'Rental logo' })]) {
  const html = render(ui.ParkStorefrontHeader, { name, logo });
  assert.match(html, /sticky top-0 z-30/); assert.match(html, /text-left/);
  assert.match(html, /aria-label="Interface language"/); assert.doesNotMatch(visible(html), /Rental company with a very long name/);
  assert.equal(html.includes('blob:logo'), Boolean(logo));
 }
 const hero = render(ui.ParkStorefrontHero, { name });
 assert.match(hero, /<h1[^>]*>Rental company with a very long name<\/h1>/);
 assert.match(hero, /from-cyan-800 via-blue-800 to-blue-950/);
 assert.doesNotMatch(hero, /Telegram|<img|<p|Deposit|Daily price/);
 for (const initData of ['', 'telegram-signed-data']) {
  globalThis.window = { Telegram: { WebApp: { initData } } };
  const html = renderToStaticMarkup(e(ui.ParkLocaleProvider, { initialLanguage: 'en', showSwitcher: false }, e(ui.ParkTelegramEntry, { tenantId: 'park-a', view: 'client' })));
  assert.equal(visible(html), '');
 }
 const owner = readFileSync('src/pages/ParkOwnerWebPage.tsx', 'utf8');
 assert.match(owner, /<header className="sticky top-0 z-30/);
 assert.match(owner, /<PrivateImage owner tenantId=/);
 assert.match(owner, /<PlatformTenantWorkspace tenant=\{tenant\} owner hideHeaderLogo/);
});

test('park dates are always day-first with localized words, never American order', () => {
 for (const [language, full, short] of [['ru', '18 ноября 2026', '18 нояб. 2026'], ['en', '18 November 2026', '18 Nov 2026']]) {
  ui.saveParkLanguage(language);
  assert.equal(ui.dateLabel('2026-11-18'), full);
  assert.equal(ui.dateLabel('2026-11-18', 'short'), short);
 }
 assert.equal(ui.dateLabel('2026-11-18', 'long', 'en-US'), '18 November 2026');
 assert.equal(ui.parkDateDisplay(new Date('2026-11-17T20:00:00Z'), 'en-GB', 'long', 'Asia/Bangkok'), '18 November 2026');
 assert.equal(ui.parkDateDisplay(new Date('invalid')), '—');
});

test('season boundaries use words without an invented year in both languages', () => {
 assert.equal(ui.seasonDateLabel('11-01', 'ru-RU'), '1 ноября');
 assert.equal(ui.seasonDateLabel('03-31', 'en-GB'), '31 March');
 assert.equal(ui.seasonDateLabel('02-29', 'en-GB'), '29 February');
 for (const bad of ['02-30', '13-01', '11/01', '']) assert.equal(ui.seasonDateLabel(bad), '—');
 const rates = { price_1_6: 800, price_7_14: 700, price_15_29: 600, price_30: 500 };
 const html = render(ui.VehicleTariffTable, { grid: { low_season: rates, high_season: rates, high_start: '11-01', high_end: '03-31' }, currency: 'THB' });
 assert.match(html, /1 November — 31 March/);
 assert.doesNotMatch(visible(html), /[А-Яа-яЁё]|11-01|03-31/);
});

test('storefront quote groups dates, deposit, seasonal cost and long addresses without changing totals', () => {
 const quote = { asset_name: 'MG ZS', start_date: '2026-10-15', end_date: '2026-10-22', days: 7, daily_rate: '1100', total_rental: '7700', deposit: '8000', currency: 'THB', timezone: 'Asia/Bangkok', tariff_breakdown: [{ season: 'low_season', days: 7, daily_rate: '1100', subtotal: '7700' }], pickup: { time: '08:00', location: 'city', address: 'Long pickup address <script>', return_time: '08:00', return_location: 'city', return_address: 'Long return address' }, delivery_fee: '500', return_fee: '500', total_payable: '8700' };
 for (const language of ['ru', 'en']) {
  const html = render(ui.ParkQuoteSummary, { quote }, language);
  for (const tone of ['bg-slate-100', 'bg-emerald-50', 'bg-amber-50']) assert.ok(html.includes(tone));
  assert.doesNotMatch(html, /bg-blue-50|bg-violet-50/);
  assert.equal((html.match(/bg-amber-50/g) || []).length, 1); // Deposit, not seasonal details.
  assert.match(html, /text-3xl font-bold text-emerald-800/);
  assert.match(html, /bg-slate-100 p-3 text-slate-900[^>]*><h4[^>]*>.*?Rental period|bg-slate-100 p-3 text-slate-900/);
  assert.match(html, /Long pickup address &lt;script&gt;/); assert.match(html, /Long return address/);
  assert.ok(html.includes(ui.rentalMoney('8700', 'THB'))); assert.ok(html.includes(ui.rentalMoney('8000', 'THB')));
  assert.match(html, language === 'ru' ? /15 октября 2026/ : /15 October 2026/);
  assert.doesNotMatch(html, /2026-10-15|10\/15\/2026|<script>/);
 }
});

test('owner toolbar has one inline language selector with flags and a named compact sign-out', () => {
 for (const language of ['ru', 'en']) {
  const html = renderToStaticMarkup(e(ui.ParkLocaleProvider, { initialLanguage: language, showSwitcher: false }, e(ui.ParkLanguageSwitcher, { compact: true })));
  assert.equal((html.match(/<select /g) || []).length, 1);
  assert.doesNotMatch(html, /<button/);
  assert.match(html, /🇷🇺 RU/);
  assert.match(html, /🇬🇧 EN/);
  assert.match(html, new RegExp(`value="${language}"[^>]*selected=""`));
  assert.match(html, language === 'ru' ? /aria-label="Язык интерфейса"/ : /aria-label="Interface language"/);
 }
 const page = readFileSync('src/pages/ParkOwnerWebPage.tsx', 'utf8');
 assert.match(page, /items-center gap-2/);
 assert.match(page, /<ParkLanguageSwitcher compact/);
 assert.match(page, /sr-only sm:not-sr-only/);
 assert.match(readFileSync('src/App.tsx', 'utf8'), /<ParkLocaleProvider showSwitcher=\{false\}><ParkOwnerWebPage/);
});

test('pickup/return English copy and labels do not translate customer addresses or change option codes', () => {
 const pickup = { time: '10:00', location: 'city', address: 'Отель клиента', return_time: '18:00', return_location: 'city', return_address: 'Адрес возврата клиента' };
 const html = render(ui.ParkPickupFields, { id: 'journey', pickup, onChange() {} });
 assert.match(html, /Pickup time/); assert.match(html, /Return location/); assert.match(html, /Hotel name or address \(optional\)/);
 assert.match(html, /value="city"/); assert.match(html, /value="Отель клиента"/); assert.match(html, /value="Адрес возврата клиента"/);
 const summary = render(ui.ParkPickupSummary, { pickup, deliveryFee: '500', returnFee: '500', extraDay: true, total: '4200', currency: 'THB' });
 assert.match(summary, /One extra rental day/); assert.match(summary, /Отель клиента/); assert.match(summary, /City/);
 const ru = render(ui.ParkPickupFields, { id: 'journey', pickup, onChange() {} }, 'ru');
 assert.match(ru, /Время получения/); assert.match(ru, /Время возврата/);
});

test('compact calendar create and icon refresh actions are localized in RU/EN', () => {
 for (const language of ['ru', 'en']) {
  const html = render(ui.ParkCalendarActions, { createDisabled: false, refreshDisabled: false, onCreate() {}, onRefresh() {} }, language);
  assert.match(html, language === 'ru' ? /Создать бронь/ : /Create booking/);
  assert.match(html, language === 'ru' ? /aria-label="Обновить календарь"/ : /aria-label="Refresh calendar"/);
 }
});

test('vehicle specs editor groups native dropdowns and preserves exact and custom values in RU/EN', () => {
 const props = { id: 'specs', specs: { fuel: 'Бензин', transmission: 'CVT', drive: 'Custom drive', body_type: 'Custom body', power: '109 л.с.', engine: '1.5L', seats: 12, doors: 6, mileage: 0, air_conditioning: false }, features: 'USB\nPrivate custom option', onChange() {}, onFeaturesChange() {} };
 for (const language of ['ru', 'en']) {
  const html = render(ui.VehicleSpecsFields, props, language);
  assert.equal((html.match(/<select /g) || []).length, 7);
  assert.doesNotMatch(html, /type="radio"|<textarea/);
  for (const key of ['fuel', 'transmission', 'drive', 'body_type', 'seats', 'doors', 'ac']) assert.match(html, new RegExp(`for="specs-${key}"`));
  assert.match(html, /value="12" selected=""/); assert.match(html, /value="6" selected=""/);
  assert.match(html, /value="false" selected=""/);
  assert.match(html, /value="Custom drive" selected=""/); assert.match(html, /value="Custom body" selected=""/);
  assert.match(html, /type="number"[^>]*value="109"/); assert.match(html, /type="number"[^>]*value="1.5"/);
  assert.match(html, /Private custom option/); assert.match(html, /type="checkbox"[^>]*checked=""/);
  for (const icon of ['lucide-wrench', 'lucide-car-front', 'lucide-gauge', 'lucide-settings-2']) assert.ok(html.includes(icon));
  if (language === 'en') assert.doesNotMatch(visible(html), /[А-Яа-яЁё]/);
 }
 assert.deepEqual(ui.vehicleSeatOptions, Array.from({ length: 20 }, (_, i) => i + 1));
 assert.deepEqual(ui.vehicleDoorOptions, [1, 2, 3, 4, 5, 6, 7, 8]);
 assert.deepEqual(ui.splitVehicleFeatures(' USB\nUSB\n custom \n'), ['USB', 'custom']);
 assert.equal(ui.toggleVehicleFeature('USB\ncustom', 'USB', false), 'custom');
 assert.equal(ui.toggleVehicleFeature('USB\ncustom', 'USB', true), 'USB\ncustom');
 for (const [value, field, expected] of [['91 л.с.', 'power', '91'], ['1,5 л', 'engine', '1.5'], ['1496CC', 'engine', null], ['Custom power', 'power', null]]) assert.equal(ui.vehicleNumericSpec(value, field), expected);
 assert.match(readFileSync('src/components/platform/VehicleDetailsEditor.tsx', 'utf8'), /<VehicleSpecsFields/);
});

test('rates and booking summary are English, calculations and private customer text remain unchanged', () => {
 const rates = { price_1_6: 800, price_7_14: 700, price_15_29: 600, price_30: 500 };
 const grid = { mode: 'duration', low_season: rates, high_season: rates, high_start: '11-01', high_end: '03-31' };
 const table = render(ui.VehicleTariffTable, { grid, currency: 'THB' });
 assert.match(table, /Rental duration/); assert.match(table, /30 days or more/); assert.doesNotMatch(visible(table), /[А-Яа-яЁё]/);
 const fields = render(ui.VehiclePricingFields, { id: 'pricing', currency: 'THB', mode: 'seasonal', grid, dailyRate: '800', onModeChange() {}, onDailyRateChange() {}, onGridChange() {} });
 assert.match(fields, /High season/); assert.match(fields, /value="seasonal"/); assert.doesNotMatch(visible(fields), /[А-Яа-яЁё]/);
 const booking = { id: 'a', booking_number: '100001', status: 'requested', source: 'web_storefront', currency: 'THB', pricing: { asset_name: 'Машина клиента', start_date: '2026-10-15', end_date: '2026-10-18', days: 4, daily_rate: '800', total_rental: '3200', timezone: 'Asia/Bangkok' }, deposit: { amount: '5000' }, operator_details: { customer_name: 'Имя клиента', note: 'Личная пометка' } };
 const request = render(ui.ParkRequestItem, { booking, tenantId: 'park-a', busy: false, onAction() {} });
 assert.match(request, /Awaiting confirmation/); assert.match(request, /Edit request/); assert.match(request, /Машина клиента/); assert.match(request, /Имя клиента/); assert.match(request, /Личная пометка/);
 assert.equal(ui.paidRentalDays({ start: '2026-10-15', end: '2026-10-18', pickup: { time: '10:00', return_time: '18:00' } }), 4);
});

test('request details group pickup and return before prices, with a separate deposit in RU and EN', () => {
 const booking = { id: 'journey', status: 'requested', currency: 'THB', pricing: { asset_name: 'MG ZS', start_date: '2026-11-02', end_date: '2026-11-14', days: 12, total_rental: '14400', timezone: 'Asia/Bangkok', pickup: { time: '09:45', location: 'city', address: 'Pickup hotel', return_time: '10:15', return_location: 'city', return_address: 'Return hotel' }, delivery_fee: '500', return_fee: '500', total_payable: '15400', extra_day: true }, deposit: { amount: '8000' }, customer: { name: 'Somchai' } };
 for (const language of ['ru', 'en']) for (const detailed of [false, true]) {
  const html = render(ui.ParkRequestItem, { booking, detailed, busy: false, onAction() {} }, language);
  const text = visible(html);
  assert.ok(text.indexOf('09:45') < text.indexOf('Pickup hotel'));
  assert.ok(text.indexOf('Pickup hotel') < text.indexOf('10:15'));
  assert.ok(text.indexOf('10:15') < text.indexOf('Return hotel'));
  const cost = language === 'en' ? 'Cost' : 'Стоимость';
  const deposit = language === 'en' ? 'Deposit, separate' : 'Депозит отдельно';
  assert.ok(text.indexOf('Return hotel') < text.indexOf(cost));
  assert.ok(text.indexOf(cost) < text.indexOf(deposit));
  assert.ok(text.indexOf(deposit) < text.indexOf('Somchai'));
  for (const amount of ['14400', '15400', '8000']) {
   const formatted = ui.rentalMoney(amount, 'THB');
   assert.equal(html.split(formatted).length - 1, 1, `${language}, detailed=${detailed}, ${amount} must appear once`);
  }
  assert.match(html, /bg-slate-100 text-slate-900/);
  assert.match(html, /border-t border-slate-200/);
  assert.match(html, /09:45[^]*City<\/span> · Pickup hotel<\/dd>|09:45[^]*Город<\/span> · Pickup hotel<\/dd>/);
  assert.doesNotMatch(html, /NaN|undefined/);
 }
 const emptyAddress = { ...booking, pricing: { ...booking.pricing, pickup: { time: '09:45', location: 'city', address: '', return_location: 'city', return_address: '' } } };
 const empty = render(ui.ParkRequestItem, { booking: emptyAddress, busy: false, onAction() {} });
 assert.match(empty, /No address provided/);
 const legacy = { ...booking, pricing: { asset_name: 'Legacy car', start_date: '2026-11-02', end_date: '2026-11-14', days: 12, total_rental: '14400', timezone: 'Asia/Bangkok' } };
 const legacyHtml = render(ui.ParkRequestItem, { booking: legacy, busy: false, onAction() {} });
 assert.doesNotMatch(legacyHtml, /NaN|undefined|Total rental and delivery|09:45/);
 assert.match(legacyHtml, /Deposit, separate/);
 const withContact = { ...booking, customer: { name: 'Somchai', contact: { channel: 'whatsapp', value: '+66812345678' } } };
 for (const language of ['ru', 'en']) {
  const html = render(ui.ParkRequestItem, { booking: withContact, tenantId: 'park-a', busy: false, onAction() {} }, language);
  const toolbar = html.match(/<div class="flex shrink-0 items-center gap-1">(.*?)<\/div>/s)?.[1];
  assert.ok(toolbar);
  assert.equal((toolbar.match(/<button/g) || []).length, 2);
  assert.match(toolbar, /size-11 shrink-0 p-0/);
  assert.match(toolbar, language === 'ru' ? /aria-label="Скопировать контакт"/ : /aria-label="Copy contact"/);
  assert.match(toolbar, language === 'ru' ? /aria-label="Изменить заявку"/ : /aria-label="Edit request"/);
  assert.match(toolbar, /lucide-copy/); assert.match(toolbar, /lucide-pencil/);
  assert.match(toolbar, /aria-expanded="false"/);
  assert.equal(visible(toolbar).trim(), '', 'Contact actions are icon-only');
  assert.doesNotMatch(html, /mt-4 flex min-w-0 items-stretch/);
  const withoutContact = render(ui.ParkRequestItem, { booking, tenantId: 'park-a', busy: true, onAction() {} }, language);
  assert.doesNotMatch(withoutContact, /aria-label="(?:Скопировать контакт|Copy contact)"/);
  assert.match(withoutContact, /aria-expanded="false" disabled=""/);
 }
});

test('request period intersects park civil dates, combines status and excludes blocks without mutating input', () => {
 const make = (id, start, end, status = 'requested', entry_type = 'rental') => ({ id, status, entry_type, start_at: start, pricing: { start_date: start, end_date: end } });
 const bookings = [make('later', '2026-11-16', '2026-11-20'), make('overlap', '2026-11-08', '2026-11-12'), make('return', '2026-11-05', '2026-11-10'), make('ends-before', '2026-11-01', '2026-11-09'), make('starts-at-end', '2026-11-15', '2026-11-17'), make('confirmed', '2026-11-11', '2026-11-20', 'confirmed'), make('block', '2026-11-10', '2026-11-15', 'requested', 'block')];
 const snapshot = JSON.stringify(bookings);
 assert.deepEqual(ui.filterParkRequests(bookings, 'requested', '2026-11-10', '2026-11-15').map(item => item.id), ['return', 'overlap', 'starts-at-end']);
 assert.deepEqual(ui.filterParkRequests(bookings, 'confirmed', '2026-11-10', '2026-11-15').map(item => item.id), ['confirmed']);
 assert.equal(ui.filterParkRequests(bookings, 'all', '2026-11-10', '2026-11-15').length, 4);
 assert.equal(ui.filterParkRequests(bookings, 'all').length, 6);
 assert.deepEqual(ui.filterParkRequests(bookings, 'all', '2026-11-20', '2026-11-10'), []);
 assert.deepEqual(ui.filterParkRequests(bookings, 'requested', '2026-11-18').map(item => item.id), ['later']);
 assert.deepEqual(ui.filterParkRequests(bookings, 'confirmed', '', '2026-11-10'), []);
 assert.equal(JSON.stringify(bookings), snapshot);
 for (const language of ['ru', 'en']) {
  const html = render(ui.ParkRequestsPanel, { tenantId: 'park-a', admin: false }, language);
  assert.equal((html.match(/type="date"/g) || []).length, 2);
  assert.doesNotMatch(html, /Все даты, независимо|All dates, regardless|automatically sent|автоматически не отправляются/);
  assert.match(html, language === 'ru' ? /Дата начала/ : /Start date/);
  assert.match(html, language === 'ru' ? /Сбросить даты/ : /Clear dates/);
 }
 const source = readFileSync('src/components/platform/ParkRequestsPanel.tsx', 'utf8');
 assert.match(source, /aria-invalid=\{invalidPeriod/);
 assert.match(source, /onClick=\{\(\) => \{ setStartDate\(''\); setEndDate\(''\); \}\}/);
});

test('cancelled requests are visible only in archive, with dates and historical details preserved', () => {
 const make = (id, status, start = '2026-11-10', end = '2026-11-15') => ({ id, status, entry_type: 'rental', start_at: start, pricing: { start_date: start, end_date: end }, customer: { name: 'Saved customer' } });
 const bookings = [make('pending', 'requested'), make('confirmed', 'confirmed'), make('cancelled', 'cancelled'), make('completed', 'completed'), make('old-cancelled', 'cancelled', '2026-10-01', '2026-10-05')];
 const before = JSON.stringify(bookings);
 assert.deepEqual(ui.filterParkRequests(bookings, 'all').map(item => item.id), ['pending', 'confirmed', 'completed']);
 assert.deepEqual(ui.filterParkRequests(bookings, 'archive').map(item => item.id), ['old-cancelled', 'cancelled']);
 assert.deepEqual(ui.filterParkRequests(bookings, 'archive', '2026-11-15', '2026-11-20').map(item => item.id), ['cancelled']);
 assert.deepEqual(ui.filterParkRequests(bookings, 'cancelled').map(item => item.id), ['old-cancelled', 'cancelled']);
 assert.equal(ui.filterParkRequests(bookings, 'archive')[0].customer.name, 'Saved customer');
 assert.equal(JSON.stringify(bookings), before);
 for (const language of ['ru', 'en']) {
  const html = render(ui.ParkRequestsPanel, { tenantId: 'park-a', admin: false }, language);
  assert.match(html, /value="archive"/);
  assert.match(html, language === 'en' ? /Archive \(cancelled\)/ : /Архив \(отменённые\)/);
  assert.doesNotMatch(html, /value="cancelled"/);
 }
});

test('month selector follows app language rather than browser month-input locale, and reset stays beside dates', () => {
 const en = render(ui.ParkCalendarMonthSelect, { id: 'month', month: '2026-10', onChange() {} });
 assert.match(en, /value="2026-10" selected="">October 2026/);
 assert.doesNotMatch(visible(en), /[А-Яа-яЁё]/);
 const ru = render(ui.ParkCalendarMonthSelect, { id: 'month', month: '2026-10', onChange() {} }, 'ru');
 assert.match(ru, /value="2026-10" selected="">октябрь 2026/);
 assert.match(en, /value="2027-01"/); assert.match(en, /value="2025-10"/);
 const panel = render(ui.ParkRequestsPanel, { tenantId: 'park-a', admin: false });
 assert.match(panel, /aria-label="Clear dates"/);
 assert.match(panel, /grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)_auto\]/);
 assert.match(panel, /size-11 gap-2 p-0/);
});

test('fleet specs use a compact neutral two-column grid, retain data and do not invent missing values', () => {
 const specs = { fuel: 'Бензин', transmission: 'CVT', power: '120', engine: '1.5', seats: 5 };
 const snapshot = JSON.stringify(specs);
 for (const language of ['ru', 'en']) {
  const html = render(ui.VehicleSpecSummary, { specs, photoCount: 4 }, language);
  assert.match(html, /grid-cols-2 gap-2/);
  assert.equal((html.match(/<li /g) || []).length, 6);
  assert.match(html, /bg-slate-100 text-slate-900/);
  assert.doesNotMatch(html, /bg-(emerald|violet|amber|blue|cyan)-50/);
  assert.match(html, /bg-slate-100 text-slate-900/);
  assert.match(html, language === 'ru' ? /Мощность: 120/ : /Power: 120/);
  assert.match(html, language === 'ru' ? /Фото: 4/ : /Photos: 4/);
  assert.doesNotMatch(html, /120 hp|1\.5 L/);
 }
 assert.equal(JSON.stringify(specs), snapshot);
 const sparse = render(ui.VehicleSpecSummary, { specs: { transmission: '<CVT long custom text>' }, photoCount: 0 });
 assert.equal((sparse.match(/<li /g) || []).length, 2);
 assert.match(sparse, /Photos: 0/);
 assert.match(sparse, /&lt;CVT long custom text&gt;/);
 assert.doesNotMatch(sparse, /Power:|Engine:|seats|<CVT/);
 const workspace = readFileSync('src/components/platform/PlatformTenantWorkspace.tsx', 'utf8');
 assert.match(workspace, /<VehicleSpecSummary specs=\{asset.specs\} photoCount=/);
});

test('date fields show Lucide/calendar hints and localized dates while retaining native min/error/disabled state', () => {
 for (const language of ['ru', 'en']) {
  const empty = render(ui.ParkDateField, { id: 'start', value: '', onChange() {} }, language);
  assert.match(empty, /lucide-calendar-days/);
  assert.match(empty, language === 'ru' ? /Выберите дату/ : /Choose a date/);
  assert.match(empty, /type="date"/);
  assert.match(empty, /focus-within:ring-2/);
  const chosen = render(ui.ParkDateField, { id: 'end', value: '2026-11-18', min: '2026-11-17', disabled: true, 'aria-invalid': true, 'aria-describedby': 'period-error', onChange() {} }, language);
  assert.match(chosen, language === 'ru' ? /18 нояб\. 2026/ : /18 Nov 2026/);
  assert.match(chosen, /value="2026-11-18"/); assert.match(chosen, /min="2026-11-17"/);
  assert.match(chosen, /aria-invalid="true"/); assert.match(chosen, /aria-describedby="period-error"/);
  assert.match(chosen, /disabled=""/);
 }
 let calls = 0;
 assert.equal(ui.openParkDatePicker({ showPicker() { calls++; } }), true);
 assert.equal(calls, 1);
 assert.equal(ui.openParkDatePicker({}), false);
 assert.equal(ui.openParkDatePicker({ showPicker() { throw new Error('Unavailable in this WebView'); } }), false);
});

test('shared manual form has compact grouped dates/prices, contact and return logistics in RU/EN', () => {
 const asset = { id: 'asset-a', name: 'Toyota', specs: {}, pricing: { daily_rate: 800, currency: 'THB' }, deposit_policy: { amount: 5000 } };
 for (const language of ['ru', 'en']) {
  const html = render(ui.ParkManualBookingForm, { tenantId: 'park-a', assets: [asset], admin: false, onSaved() {}, onClose() {} }, language);
  for (const tone of ['bg-slate-100', 'bg-emerald-50', 'bg-amber-50']) assert.ok(html.includes(tone));
  assert.doesNotMatch(html, /bg-blue-50|bg-violet-50/);
  assert.match(html, /grid-cols-2 gap-2/);
  assert.equal((html.match(/type="date"/g) || []).length, 2);
  assert.equal((html.match(/type="time"/g) || []).length, 2);
  assert.match(html, /type="tel"/);
  assert.match(html, /bg-emerald-700[^"<>]*text-white[^"<>]*hover:bg-emerald-800/);
  assert.match(html, language === 'en' ? /Return location/ : /Место возврата/);
  assert.match(html, /value="whatsapp"/);
  if (language === 'en') assert.doesNotMatch(visible(html), /[А-Яа-яЁё]/);
 }
 const panel = render(ui.ParkRequestsPanel, { tenantId: 'park-a', admin: false, assets: [asset] });
 assert.match(panel, /Add booking/);
 assert.match(readFileSync('src/components/platform/ParkRequestsPanel.tsx', 'utf8'), /creating && <ParkManualBookingForm/);
 const form = readFileSync('src/components/platform/ParkManualBookingForm.tsx', 'utf8');
 assert.match(form, /deposit: deposit.trim\(\), pickup, contact_channel: channel, contact_value:/);
});

test('English fleet/navigation and month/day labels render without Russian interface text', () => {
 const tenant = { tenant_id: 'park-a', name: 'Thai Rentals', status: 'active', primary_asset_type: 'car', currency: 'THB', timezone: 'Asia/Bangkok' };
 const workspace = render(ui.PlatformTenantWorkspace, { tenant, owner: true, onBack() {}, onTenantChanged() {} });
 assert.match(workspace, /Requests/); assert.match(workspace, /Fleet/); assert.doesNotMatch(visible(workspace), /[А-Яа-яЁё]/);
 const month = render(ui.MonthCalendarView, { currentDate: new Date(2026, 9, 12), bookings: [], logisticsData: [], onDateChange() {}, onBookingClick() {}, onDayClick() {} });
 assert.match(month, /Mon/); assert.match(month, /Sat/); assert.match(month, /Sun/); assert.doesNotMatch(visible(month), /[А-Яа-яЁё]/);
 const timetable = render(ui.SchedulerCalendar, { cars: [], bookings: [], startDate: new Date(2026, 9, 12), daysToShow: 97, onDateChange() {}, onBookingClick() {}, onCreateBooking() {}, readOnly: true });
 assert.match(timetable, /Nov/); assert.doesNotMatch(visible(timetable), /[А-Яа-яЁё]/);
});

test('choice persists safely, dates and currency use English conventions, storage refusal is harmless', () => {
 const writes = [];
 globalThis.window = { localStorage: { setItem: (key, value) => writes.push([key, value]) } };
 ui.saveParkLanguage('en'); assert.equal(ui.getParkLanguage(), 'en');
 assert.deepEqual(writes, [[ui.PARK_LANGUAGE_KEY, 'en']]);
 assert.match(ui.dateLabel('2026-10-15'), /Oct/);
 assert.equal(ui.rentalMoney('4200', 'THB'), new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 }).format(4200));
 globalThis.window.localStorage.setItem = () => { throw new Error('blocked'); };
 assert.doesNotThrow(() => ui.saveParkLanguage('ru')); assert.equal(ui.getParkLanguage(), 'ru');
});

test('owner sign-in errors are English, guest payloads retain contact/date/price codes', async () => {
 ui.saveParkLanguage('en');
 globalThis.window = { dispatchEvent() {}, location: { pathname: '/owner/park-a' } };
 globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Неверный логин или пароль' }), { status: 401 });
 await assert.rejects(ui.ownerWebRequest('/login', {}), /Incorrect username or password/);
 const period = { tenant_id: 'park-a', init_data: '', asset_id: 'a', start_date: '2026-10-15', end_date: '2026-10-18', pickup: { time: '10:00', location: 'city', address: 'Адрес', return_time: '18:00', return_location: 'airport' } };
 globalThis.fetch = async (_url, options) => {
  const body = JSON.parse(options.body);
  assert.deepEqual(body.pickup, period.pickup); assert.equal(body.start_date, period.start_date);
  assert.equal('language' in body, false); assert.equal('locale' in body, false);
  return new Response(JSON.stringify({ quote_token: 'quote' }), { status: 200 });
 };
 await ui.quoteParkBooking(period);
});

test('catalogue has no Cyrillic English values or mismatched interpolation placeholders', () => {
 for (const [source, english] of Object.entries(ui.parkEnglish)) {
  assert.doesNotMatch(english, /[А-Яа-яЁё]/, source);
  assert.deepEqual([...source.matchAll(/\{\d+\}/g)].map(m => m[0]).sort(), [...english.matchAll(/\{\d+\}/g)].map(m => m[0]).sort(), source);
 }
 const page = readFileSync('src/pages/ParkOwnerWebPage.tsx', 'utf8');
 assert.match(page, /pt\("Вход в кабинет парка"\)/);
 assert.match(page, /pt\("Поменять пароль"\)/);
 assert.equal(ui.translatePark('Подтвердить', 'en'), 'Confirm');
 assert.equal(ui.translatePark('Неверный логин или пароль', 'en'), 'Incorrect username or password');
 assert.equal(ui.translatePark('{0} единиц', 'en', [1]), '1 vehicle');
 assert.equal(ui.translatePark('{0} единиц', 'en', [2]), '2 vehicles');
 assert.equal(ui.translatePark('{0} × {1} суток', 'en', [800, 1]), '800 × 1 day');
});
