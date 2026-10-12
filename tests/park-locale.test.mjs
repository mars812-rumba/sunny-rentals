import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: `export * from './src/lib/park-locale';
 export { parkEnglish } from './src/locales/park-en';
 export { ParkLocaleProvider, ParkLanguageSwitcher } from './src/contexts/ParkLocaleContext';
 export { ParkPickupFields, ParkPickupSummary } from './src/components/platform/ParkPickupFields';
 export { ParkQuoteSummary, ParkContactFields } from './src/components/platform/ParkBookingForm';
 export { ParkRequestItem } from './src/components/platform/ParkRequestsPanel';
 export { VehiclePricingFields, VehicleTariffTable, VehicleSpecSummary } from './src/components/platform/VehicleDetailsEditor';
 export { PlatformTenantWorkspace } from './src/components/platform/PlatformTenantWorkspace';
 export { SchedulerCalendar } from './src/components/admin/SchedulerCalendar';
 export { MonthCalendarView } from './src/components/admin/MonthCalendarView';
 export { quoteParkBooking, submitParkBooking } from './src/api/park-telegram';
 export { ownerWebRequest } from './src/api/park-owner-web';
 export { dateLabel, rentalMoney, paidRentalDays } from './src/lib/park-rental';`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react/jsx-runtime', 'react-dom'], define: { 'import.meta.env.VITE_API_URL': '""' } });
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
 assert.match(page, /items-center justify-end gap-2/);
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
