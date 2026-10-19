import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const bundle = await build({
  stdin: { contents: `export { ImageCarousel } from './src/components/CarCard';
    export { default as HeroBanner } from './src/components/HeroBanner';
    export { VehicleCardFrame } from './src/components/VehicleCardFrame';
    export { PlatformTenantWorkspace } from './src/components/platform/PlatformTenantWorkspace';
    export { VehicleSpecSummary, VehicleTariffTable, VehiclePricingFields } from './src/components/platform/VehicleDetailsEditor';
    export { activeVehicleGrid, minimumVehicleRate, vehiclePricingMode } from './src/lib/vehicle-pricing';
    export { fleetPeriodError, isFleetAssetFree } from './src/lib/fleet-availability';
    export { fleetBasicInput } from './src/lib/fleet-asset';
    export { FleetCardActions, FleetPhotoActions } from './src/components/platform/FleetCardActions';
    export { resolveParkEntryView } from './src/lib/park-entry';
    export { LanguageProvider } from './src/contexts/LanguageContext';`, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, platform: 'node', format: 'cjs',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react-dom'],
  define: { 'import.meta.env.VITE_API_URL': '""' }, loader: { '.webp': 'dataurl' },
});
const compiled = new Module(resolve('tests/storefront-ui-fixture.cjs'));
compiled.filename = resolve('tests/storefront-ui-fixture.cjs');
compiled.paths = Module._nodeModulePaths(process.cwd());
compiled._compile(bundle.outputFiles[0].text, compiled.filename);
const ui = compiled.exports;
const e = React.createElement;

test('fleet occupancy uses half-open park-local dates and all active booking types', () => {
 const period = { start: '2026-10-12', end: '2026-10-19' };
 const booking = { asset_id: 'car', status: 'confirmed', pricing: { start_date: '2026-10-15', end_date: '2026-10-18' } };
 for (const status of ['requested', 'confirmed', 'in_progress']) assert.equal(ui.isFleetAssetFree('car', [{ ...booking, status }], period), false);
 for (const status of ['cancelled', 'completed']) assert.equal(ui.isFleetAssetFree('car', [{ ...booking, status }], period), true);
 assert.equal(ui.isFleetAssetFree('car', [{ ...booking, entry_type: 'block' }], period), false);
 assert.equal(ui.isFleetAssetFree('other', [booking], period), true);
 for (const [start_date, end_date] of [['2026-10-05', '2026-10-12'], ['2026-10-19', '2026-10-25']]) assert.equal(ui.isFleetAssetFree('car', [{ ...booking, pricing: { start_date, end_date } }], period), true);
 for (const [start_date, end_date] of [['2026-10-01', '2026-10-25'], ['2026-10-12', '2026-10-19'], ['2026-10-11', '2026-10-13'], ['2026-10-18', '2026-10-20']]) assert.equal(ui.isFleetAssetFree('car', [{ ...booking, pricing: { start_date, end_date } }], period), false);
 assert.equal(ui.fleetPeriodError(period), '');
 assert.equal(ui.fleetPeriodError({ start: period.start, end: '' }), '');
 for (const end of ['2026-10-11', '2026-10-12', '2026-02-30', '2027-10-20']) assert.ok(ui.fleetPeriodError({ start: period.start, end }));
});

test('fleet card has one actions trigger and two named photo controls', () => {
 const menu = renderToStaticMarkup(e(ui.FleetCardActions, { name: 'Toyota', busy: false, visible: true, onDetails() {}, onVisibility() {} }));
 assert.equal((menu.match(/<button/g) || []).length, 1);
 assert.match(menu, /aria-label="Действия: Toyota"/);
 assert.match(menu, /aria-haspopup="menu"/);
 const photo = renderToStaticMarkup(e(ui.FleetPhotoActions, { name: 'Toyota', busy: false, onEdit() {}, onArchive() {} }));
 assert.match(photo, /absolute right-2 top-2/);
 assert.equal((photo.match(/<button/g) || []).length, 2);
 assert.match(photo, /aria-label="Редактировать Toyota"/);
 assert.match(photo, /aria-label="В архив: Toyota"/);
 const basic = ui.fleetBasicInput({ name: 'Toyota', asset_type: 'car', brand: 'Toyota', model: 'Yaris', year: 2024, color: 'White', daily_rate: 1, deposit: 2, public: true });
 assert.equal(basic.name, 'Toyota'); assert.equal(basic.public, true);
 assert.ok(!('daily_rate' in basic)); assert.ok(!('deposit' in basic));
});

test('public vehicle specs keep icon labels and escape custom text', () => {
 const html = renderToStaticMarkup(e(ui.VehicleSpecSummary, { specs: { fuel: 'Гибрид', transmission: 'CVT', seats: 5, doors: 4, mileage: 12000, air_conditioning: false, features: ['<script>alert(1)</script>'] }, detailed: true }));
 assert.match(html, /lucide-fuel/); assert.match(html, /lucide-settings-2/);
 assert.match(html, /5 мест/); assert.match(html, /Двери: 4/); assert.match(html, /Кондиционер: нет/);
 assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>/);
});

test('seasonal tariff table names all four periods and both seasons', () => {
 const rates = { price_1_6: 800, price_7_14: 700, price_15_29: 600, price_30: 500 };
 const html = renderToStaticMarkup(e(ui.VehicleTariffTable, { grid: { low_season: rates, high_season: rates, high_start: '11-01', high_end: '03-31' }, currency: 'THB' }));
 for (const label of ['1–6 дней', '7–14 дней', '15–29 дней', '30 дней и больше', 'Низкий сезон', 'Высокий сезон']) assert.ok(html.includes(label));
 assert.match(html, /<caption class="sr-only">/); assert.match(html, /scope="row"/);
 assert.match(html, /1 ноября — 31 марта/);
 assert.doesNotMatch(html, /11-01|03-31|ММ-ДД/);
 assert.match(html, /bg-slate-100/); assert.doesNotMatch(html, /bg-emerald-50|bg-amber-50/);
});

test('pricing editor has three named modes and only active fields are required', () => {
 const rates = { price_1_6: 3000, price_7_14: 2700, price_15_29: 2500, price_30: 2200 };
 const props = { id: 'pricing', currency: 'THB', dailyRate: '3000', grid: { low_season: rates, high_season: rates, high_start: '11-01', high_end: '03-31' }, onModeChange() {}, onDailyRateChange() {}, onGridChange() {} };
 for (const mode of ['flat', 'duration', 'seasonal']) {
  const html = renderToStaticMarkup(e(ui.VehiclePricingFields, { ...props, mode }));
  assert.equal((html.match(/type="radio"/g) || []).length, 3);
  assert.match(html, new RegExp(`type="radio"[^>]*checked=""[^>]*value="${mode}"`));
  for (const label of ['Одна цена за сутки', 'Цена зависит от срока аренды', 'Сезонная цена и срок аренды', 'Неактивные тарифы не используются']) assert.ok(html.includes(label));
  assert.equal((html.match(/type="number"/g) || []).length, mode === 'flat' ? 1 : mode === 'duration' ? 4 : 8);
  assert.equal(html.includes('Начало высокого сезона'), mode === 'seasonal');
  assert.equal(html.includes('Например, аренда на 10 суток'), mode === 'duration');
 }
 const rising = renderToStaticMarkup(e(ui.VehiclePricingFields, { ...props, mode: 'duration', grid: { ...props.grid, low_season: { ...rates, price_7_14: 3200 } } }));
 assert.match(rising, /role="status"[^>]*>Проверьте тарифы/);
 const duration = renderToStaticMarkup(e(ui.VehicleTariffTable, { grid: { ...props.grid, mode: 'duration' }, currency: 'THB' }));
 assert.doesNotMatch(duration, /Высокий сезон|Низкий сезон|11-01/);
 assert.match(duration, /Цена за сутки в зависимости от срока аренды/);
 const asset = { pricing: { daily_rate: 3000, pricing_mode: 'flat', tariff_grid: props.grid } };
 assert.equal(ui.activeVehicleGrid(asset), null);
 assert.equal(ui.minimumVehicleRate(asset), 3000);
 assert.equal(ui.minimumVehicleRate({ pricing: { ...asset.pricing, pricing_mode: 'duration', tariff_grid: { ...props.grid, high_season: { ...rates, price_30: 1 } } } }), 2200);
});

test('public entry stays a storefront for every role, owner entry requires a verified owner', () => {
  for (const role of [undefined, 'customer', 'owner']) {
    assert.equal(ui.resolveParkEntryView(false, role), 'client');
  }
  assert.equal(ui.resolveParkEntryView(true, 'owner'), 'owner');
  assert.equal(ui.resolveParkEntryView(true, 'customer'), 'client');
  assert.equal(ui.resolveParkEntryView(true, undefined), 'client');
});

test('shared Sunny gallery accepts scoped media without a legacy image URL', () => {
  const html = renderToStaticMarkup(e(ui.ImageCarousel, {
    photos: ['first.jpg', 'second.jpg'], carName: 'Tenant Toyota', carId: 'park-a:toyota', t: () => 'Фото пока нет',
    renderPhoto: (photo, index) => e('img', { src: `/api/storefront/park-a/media/${photo}`, alt: `Toyota ${index + 1}` }),
  }));
  assert.match(html, /\/api\/storefront\/park-a\/media\/first.jpg/);
  assert.match(html, /Следующее фото: Tenant Toyota/);
  assert.doesNotMatch(html, /images_web|localhost|park-b/);
});

test('park hero has park identity and supplied price, not Sunny commercial claims', () => {
  const html = renderToStaticMarkup(e(ui.LanguageProvider, null,
    e(ui.HeroBanner, { park: { name: 'Phuket Drive', minimumPrice: '800 THB' } })));
  assert.match(html, /Phuket Drive/);
  assert.match(html, /800 THB/);
  assert.doesNotMatch(html, /Sunny Rentals|100\+ reviews|От 600|на месте|в 2 клика/);
});

test('legacy Sunny hero retains its original default copy', () => {
  const html = renderToStaticMarkup(e(ui.LanguageProvider, null, e(ui.HeroBanner)));
  assert.match(html, /Sunny Rentals/);
  assert.match(html, /Аренда на Пхукете/);
});

test('owner workspace does not render platform management controls', () => {
  const html = renderToStaticMarkup(e(ui.PlatformTenantWorkspace, { owner: true,
    tenant: { tenant_id: 'park-a', slug: 'park-a', name: 'Park A', status: 'active', currency: 'THB', timezone: 'Asia/Bangkok', primary_asset_type: 'car' },
    onBack: () => {}, onTenantChanged: () => {},
  }));
  assert.match(html, /Техника парка/);
  assert.match(html, /Свободная техника на даты/);
  assert.match(html, /Дата начала/);
  assert.match(html, /Дата окончания/);
  // Requests are lazy-mounted; only the fleet period filter exists initially.
  assert.equal((html.match(/type="date"/g) || []).length, 2);
  assert.match(html, /Сбросить/);
  assert.doesNotMatch(html, /id="asset-rate"|id="asset-deposit"/);
  assert.match(html, /role="tablist"[^>]+aria-label="Управление парком"/);
  assert.equal((html.match(/role="tab"/g) || []).length, 3);
  assert.match(html, /aria-selected="false"[^>]*>[\s\S]*?Автопарк<\/button>/);
  assert.match(html, /aria-selected="true"[^>]*>[\s\S]*?Календарь<\/button>/);
  assert.match(html, /data-\[state=active\]:bg-blue-700/);
  assert.match(html, /lucide-car-front/);
  assert.match(html, /lucide-calendar-days/);
  assert.match(html, /lucide-clipboard-list/);
  assert.match(html, /aria-selected="false"[^>]*>[\s\S]*?Заявки<\/button>/);
  const tablist = html.match(/role="tablist"[\s\S]*?<\/div>/)[0];
  assert.ok(tablist.indexOf('Календарь') < tablist.indexOf('Заявки'));
  assert.ok(tablist.indexOf('Заявки') < tablist.indexOf('Автопарк'));
  assert.match(tablist, /mx-auto/);
  assert.match(tablist, /max-w-xl/);
  assert.match(html, /Загружаем заявки/);
  assert.match(html, /role="tabpanel"/);
  assert.doesNotMatch(html, /Добавить бронь \/ блокировку/);
  assert.doesNotMatch(html, /Все прокаты|Подготовить превью|Логотип проката|Webhook|<h1/);
});

test('owner can open the separate client storefront from the park header', () => {
  const html = renderToStaticMarkup(e(ui.PlatformTenantWorkspace, { owner: true,
    tenant: { tenant_id: 'park-a', slug: 'park-a', name: 'Park A', branding: { logo: 'logo/test.webp' }, status: 'active', currency: 'THB', timezone: 'Asia/Bangkok', primary_asset_type: 'car' },
    onBack: () => {}, onTenantChanged: () => {}, onViewStorefront: () => {},
  }));
  assert.match(html, />Витрина<\/button>/);
  assert.match(html, /aria-label="Логотип Park A"/);
  assert.ok(html.indexOf('aria-label="Логотип Park A"') < html.indexOf('<h2'));
  assert.ok(html.indexOf('<h2') < html.indexOf('>Витрина</button>'));
  assert.ok(html.indexOf('>Витрина</button>') < html.indexOf('role="tablist"'));
  assert.doesNotMatch(html, /Подберите транспорт|Выберите транспорт|Клиентский каталог/);
});

test('superadmin uses the same three working tabs with separate collapsed park setup', () => {
  const html = renderToStaticMarkup(e(ui.PlatformTenantWorkspace, {
    tenant: { tenant_id: 'park-a', slug: 'park-a', name: 'Очень длинное название проката для проверки переноса', status: 'draft', currency: 'THB', timezone: 'Asia/Bangkok', primary_asset_type: 'car' },
    onBack() {}, onTenantChanged() {},
  }));
  assert.equal((html.match(/role="tab"/g) || []).length, 3);
  const tablist = html.match(/role="tablist"[\s\S]*?<\/div>/)[0];
  assert.ok(tablist.indexOf('Календарь') < tablist.indexOf('Заявки'));
  assert.ok(tablist.indexOf('Заявки') < tablist.indexOf('Автопарк'));
  assert.match(html, /aria-selected="true"[^>]*>[\s\S]*?Календарь<\/button>/);
  assert.match(html, /Настройки подключения и оформления<\/summary>/);
  assert.match(html, /<details class="mt-5">/);
  assert.match(html, /Подготовить превью витрины/);
  assert.match(html, /Логотип проката/);
  assert.match(html, /Все прокаты/);
  assert.doesNotMatch(html, /Загружаем календарь|Общая информация/);
});
