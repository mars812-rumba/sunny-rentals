import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: `export * from './src/utils/park-calendar';
 export * from './src/lib/calendar-booking-lanes';
 export * from './src/lib/calendar-model-label';
 export { SchedulerCalendar } from './src/components/admin/SchedulerCalendar';
 export { MonthCalendarView } from './src/components/admin/MonthCalendarView';
 export { ParkTrialStatus } from './src/components/platform/ParkTrialStatus';
 export { ParkManualBookingFields as ParkManualBookingForm } from './src/components/platform/ParkManualBookingForm';
 export { ParkQuoteSummary, ParkContactFields } from './src/components/platform/ParkBookingForm';
 export { ParkRequestItem } from './src/components/platform/ParkRequestsPanel';
 export { ParkCalendarPhoto } from './src/components/platform/ParkCalendarPhoto';
 export { ParkCalendarViewButtons, ParkCalendarActions, ParkCalendarLegend } from './src/components/platform/ParkBookingCalendar';
 export { Tabs, TabsContent } from './src/components/ui/tabs';
 export { schedulerInitialOffset, timetableFocusDay } from './src/lib/scheduler-scroll';
 export { parkToday } from './src/lib/park-rental';
 export { ParkPickupFields, ParkPickupSummary } from './src/components/platform/ParkPickupFields';
 export { validParkPickup, validParkReturn } from './src/lib/park-pickup';
 export { focusStorefrontFilters } from './src/lib/storefront-return';`, resolveDir: process.cwd(), loader: 'tsx' },
 bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
 external: ['react', 'react/jsx-runtime', 'react-dom'], define: { 'import.meta.env.VITE_API_URL': '""' } });
const compiled = new Module(resolve('tests/park-calendar-fixture.cjs'));
compiled.filename = resolve('tests/park-calendar-fixture.cjs');
compiled.paths = Module._nodeModulePaths(process.cwd());
compiled._compile(bundle.outputFiles[0].text, compiled.filename);
const ui = compiled.exports;
const booking = { id: 'booking-a', asset_id: 'asset-a', status: 'requested', start_at: '2026-08-01T17:00:00Z', end_at: '2026-08-03T17:00:00Z', currency: 'THB',
 pricing: { asset_name: 'Toyota', start_date: '2026-08-02', end_date: '2026-08-04', days: 2, daily_rate: '800', total_rental: '1600', timezone: 'Asia/Bangkok' }, deposit: { amount: '5000' } };
const e = React.createElement;

test('manual booking footer keeps submit and cancel together, wrapping only the submit label', () => {
 const source = readFileSync('src/components/platform/ParkManualBookingForm.tsx', 'utf8');
 assert.match(source, /park-sheet-actions flex items-stretch gap-2/);
 assert.match(source, /h-auto min-h-11 min-w-0 flex-1 gap-2 whitespace-normal/);
 assert.match(source, /<span className="min-w-0 break-words">\{busy/);
 assert.match(source, /h-auto min-h-11 shrink-0 gap-2 rounded-lg px-3 text-sm/);
 assert.doesNotMatch(source, /park-sheet-actions flex flex-wrap/);
});

test('calendar actions stay in one row with named icon-only refresh and no technical introduction', () => {
 const html = renderToStaticMarkup(e(ui.ParkCalendarActions, { createDisabled: false, refreshDisabled: false, onCreate() {}, onRefresh() {} }));
 assert.match(html, /class="flex w-full items-center gap-2"/);
 assert.equal((html.match(/<button/g) || []).length, 2);
 assert.match(html, /Создать бронь/);
 assert.match(html, /aria-label="Обновить календарь"/);
 assert.match(html, /title="Обновить календарь"/);
 assert.doesNotMatch(html, />Обновить</);
 const source = readFileSync('src/components/platform/ParkBookingCalendar.tsx', 'utf8');
 assert.doesNotMatch(source, /Заявки из бота и витрины — в одном календаре|Занятость по автомобилям: прокрутите/);
 assert.match(source, /className="sr-only">\{pt\('Таймтейбл'\)/);
 assert.match(source, /useState\('timetable'\)/);
});

test('calendar events and timetable bars omit shadows and clock icons, preserving fixed rows and clipped shapes', () => {
 const scheduler = readFileSync(resolve('src/components/admin/SchedulerCalendar.tsx'), 'utf8');
 const month = readFileSync(resolve('src/components/admin/MonthCalendarView.tsx'), 'utf8');
 assert.doesNotMatch(scheduler, /drop-shadow|boxShadow/);
 assert.match(scheduler, /className="relative h-full"/);
 assert.match(scheduler, /clipPath: "polygon\(6px/);
 assert.doesNotMatch(month, /boxShadow|Clock3/);
 assert.match(month, /'grid gap-0\.5 font-sans'/);
 assert.match(month, /flex h-5 min-h-5/);
});

test('park timetable starts a blocked bar with its reason, safely escaping custom text', () => {
 const item = { ...booking, entry_type: 'block', status: 'confirmed', operator_details: { customer_name: '', note: 'Repair <script>inspection</script>' } };
 const projected = ui.calendarBooking(item);
 assert.equal(projected.form_data.personalInfo.notes, item.operator_details.note);
 const props = { cars: ui.calendarCars([], [item]), bookings: [projected], startDate: new Date('2026-08-01T00:00:00'), daysToShow: 97, readOnly: true, onDateChange() {}, onCreateBooking() {}, onBookingClick() {} };
 const html = renderToStaticMarkup(e(ui.SchedulerCalendar, props));
 assert.match(html, /title="Repair &lt;script&gt;inspection&lt;\/script&gt; • /);
 assert.match(html, /Repair &lt;script&gt;inspection&lt;\/script&gt;/); assert.doesNotMatch(html, /<script>/);
 for (const note of ['', '   ']) {
  const blank = ui.calendarBooking({ ...item, operator_details: { customer_name: '', note } });
  assert.match(renderToStaticMarkup(e(ui.SchedulerCalendar, { ...props, bookings: [blank] })), /title="Блокировка • /);
 }
 assert.equal(ui.calendarBooking({ ...booking, operator_details: { customer_name: '', note: 'Private rental note' } }).form_data.personalInfo, undefined);
 const legacy = renderToStaticMarkup(e(ui.SchedulerCalendar, { ...props, readOnly: false }));
 assert.doesNotMatch(legacy, /Repair &lt;script/);
});

test('compact calendar labels prefer the model, preserve full names and remove Block from gray badges', () => {
 for (const [name, model, brand, short] of [
  ['Toyota Yaris', 'Yaris', 'Toyota', 'Yaris'],
  ['MG ZS 2020', 'ZS', 'MG', 'ZS'],
  ['MG 5', '5', 'MG', 'MG5'],
  ['Toyota Yaris', '', '', 'Yaris'],
  ['MG ZS 2020', '', '', 'ZS'],
  ['MG 5', '', '', 'MG5'],
  ['Custom vehicle', '', '', 'Custom vehicle'],
 ]) assert.equal(ui.calendarModelLabel(name, model, brand), short);
 const item = { ...booking, entry_type: 'block', status: 'confirmed', pricing: { ...booking.pricing, asset_name: 'Toyota Yaris' } };
 const projected = ui.calendarBookingWithAsset(item, { specs: { brand: 'Toyota', model: 'Yaris' } });
 assert.equal(projected.form_data.car.name, 'Toyota Yaris');
 assert.equal(projected.form_data.car.model, 'Yaris');
 const html = renderToStaticMarkup(e(ui.MonthCalendarView, { currentDate: new Date('2026-08-01T00:00:00'), bookings: [projected], logisticsData: [ui.calendarLogistics(item)], showOccupancy: true, onDateChange() {}, onBookingClick() {} }));
 assert.match(html, /aria-label="Блокировка: Toyota Yaris"/);
 assert.match(html, /bg-slate-200 text-slate-900/);
 assert.match(html, /text-\[9px\]/);
 const text = html.replace(/<[^>]+>/g, '');
 assert.match(text, /Yaris/); assert.doesNotMatch(text, /Toyota|Блок|Block/);
});

test('booking lanes remain fixed despite another pickup, across weeks and reversed API ordering', () => {
 const make = (id, start, end, name, status = 'confirmed') => ({ ...booking, id, asset_id: id, status, pricing: { ...booking.pricing, asset_name: name, start_date: start, end_date: end } });
 const items = [make('mg', '2026-10-14', '2026-10-22', 'MG 5'), make('pending', '2026-10-15', '2026-10-22', 'Other car', 'requested'), make('block', '2026-10-16', '2026-10-18', 'Blocked car')];
 const props = { currentDate: new Date('2026-10-01T00:00:00'), onDateChange() {}, onBookingClick() {}, onDayClick() {}, showOccupancy: true };
 const render = values => renderToStaticMarkup(e(ui.MonthCalendarView, { ...props, bookings: values.map(ui.calendarBooking), logisticsData: values.map(ui.calendarLogistics) }));
 for (const html of [render(items), render([...items].reverse())]) {
  for (let day = 14; day <= 22; day++) {
   const key = `2026-10-${day}`;
   const cells = html.split(`data-calendar-day="${key}"`).slice(1);
   assert.ok(cells.length);
   for (const cell of cells) {
    const contents = cell.split('data-calendar-day=')[0];
    assert.match(contents, /data-calendar-lane="0" data-calendar-booking="mg"/);
    if (day >= 15) assert.match(contents, /data-calendar-lane="1" data-calendar-booking="pending"/);
   }
  }
 }
});

test('lanes reserve empty slots, reuse only after return and keep every overflow event', () => {
 const events = new Map([
  ['2026-10-14', [{ booking_id: 'mg' }]],
  ['2026-10-15', [{ booking_id: 'p' }, { booking_id: 'mg' }]],
  ['2026-10-16', [{ booking_id: 'mg' }, { booking_id: 'p' }]],
  ['2026-10-17', [{ booking_id: 'after' }]],
 ]);
 const { lanes, laneCount } = ui.calendarBookingLanes(events, [...events.keys()]);
 assert.equal(laneCount, 2); assert.equal(lanes.get('mg'), 0); assert.equal(lanes.get('p'), 1); assert.equal(lanes.get('after'), 0);
 const start = ui.calendarDaySlots(events.get('2026-10-14'), lanes, 2);
 assert.equal(start.slots[0].booking_id, 'mg'); assert.equal(start.slots[1], undefined);
 const many = Array.from({ length: 7 }, (_, index) => ({ booking_id: `b${index}` }));
 const dense = ui.calendarBookingLanes(new Map([['2026-10-14', many]]), ['2026-10-14']);
 const slots = ui.calendarDaySlots([...many].reverse(), dense.lanes, 4);
 assert.equal(slots.slots.length, 4); assert.equal(slots.overflow.length, 3);
 assert.equal(new Set([...slots.slots, ...slots.overflow].map(event => event.booking_id)).size, 7);
 const sameDay = [{ booking_id: 'same' }, { booking_id: 'same' }];
 const twin = ui.calendarBookingLanes(new Map([['2026-10-14', sameDay]]), ['2026-10-14']);
 assert.equal(twin.laneCount, 2); assert.equal(ui.calendarDaySlots(sameDay, twin.lanes, 2).overflow.length, 0);
});

test('empty, plain, pending and colored calendar lanes have the same fixed box height', () => {
 const item = { ...booking, id: 'toyota', status: 'confirmed', pricing: { ...booking.pricing, start_date: '2026-10-20', end_date: '2026-10-25' } };
 const pending = { ...item, id: 'pending', status: 'requested', pricing: { ...item.pricing, asset_name: 'MG 5', start_date: '2026-10-19', end_date: '2026-10-22' } };
 const html = renderToStaticMarkup(e(ui.MonthCalendarView, { currentDate: new Date('2026-10-01T00:00:00'), bookings: [item, pending].map(ui.calendarBooking), logisticsData: [item, pending].map(ui.calendarLogistics), onDateChange() {}, onBookingClick() {}, showOccupancy: true }));
 assert.match(html, /class="grid gap-0\.5 font-sans"/);
 const rows = [...html.matchAll(/<button[^>]*data-calendar-booking="([^"]+)"[^>]*class="([^"]+)"/g)];
 assert.ok(rows.length > 0);
 for (const [, , classes] of rows) assert.match(classes, /flex h-5 min-h-5 w-full items-center justify-center/);
 assert.match(html, /data-calendar-lane="1" aria-hidden="true" class="h-5"/);
 assert.match(html, /data-plain-occupancy="true"/);
 assert.match(html, /bg-green-400/); assert.match(html, /bg-purple-300/);
});

test('return fields, price explanation and calendar carry the real clock and both fees', () => {
 const pickup = { time: '10:00', location: 'city', address: 'Pickup Hotel', return_time: '18:00', return_location: 'city', return_address: 'Return Hotel' };
 const fields = renderToStaticMarkup(e(ui.ParkPickupFields, { id: 'journey', pickup, onChange() {} }));
 assert.match(fields, /<input(?=[^>]*id="journey-return-time")(?=[^>]*type="time")[^>]*>/);
 assert.match(fields, /id="journey-return-location"/);
 assert.match(fields, /id="journey-return-address"/);
 assert.doesNotMatch(fields, /id="journey-return-address"[^>]*required/);
 assert.equal(ui.validParkReturn(pickup), true);
 assert.equal(ui.validParkReturn({ ...pickup, return_time: '24:00' }), false);
 const summary = renderToStaticMarkup(e(ui.ParkPickupSummary, { pickup, deliveryFee: '500', returnFee: '500', extraDay: true, total: '4200', currency: 'THB' }));
 assert.match(summary, /18:00/); assert.match(summary, /Return Hotel/); assert.match(summary, /Дополнительные сутки/);
 const adapted = ui.calendarBooking({ ...booking, pricing: { ...booking.pricing, pickup, return_fee: '500', delivery_fee: '500', total_payable: '4200' } });
 assert.equal(adapted.form_data.dates.returnTime, '18:00');
 assert.equal(adapted.form_data.locations.returnLocation, 'Return Hotel');
 assert.equal(adapted.form_data.pricing.deliveryReturn, 500);
 assert.equal(adapted.form_data.pricing.totalDelivery, 1000);
 assert.match(ui.calendarLogistics({ ...booking, pricing: { ...booking.pricing, pickup } }).return_date, /T18:00:00$/);
});

test('dates and pickup are edited inline without closing the vehicle dialog', () => {
 const calls = [];
 ui.focusStorefrontFilters({ focus: options => calls.push(['focus', options]), scrollIntoView: options => calls.push(['scroll', options]) });
 assert.deepEqual(calls, [['focus', { preventScroll: true }], ['scroll', { block: 'start', behavior: 'instant' }]]);
 ui.focusStorefrontFilters(null);
 const form = readFileSync('src/components/platform/ParkBookingForm.tsx', 'utf8');
 assert.match(form, /<fieldset disabled=\{busy\} className="grid gap-3 sm:grid-cols-2">/);
 assert.match(form, /<ParkPickupFields/);
 assert.doesNotMatch(form, /onEditPickup\?\./);
 const page = readFileSync('src/pages/ParkStorefrontPage.tsx', 'utf8');
 assert.match(page, /<Dialog open=\{open\}/);
 assert.match(page, /initialRental=\{rental\}/);
 const filters = readFileSync('src/components/platform/ParkRentalFilters.tsx', 'utf8');
 assert.match(filters, /id="park-rental-filters" tabIndex=\{-1\}/);
});

test('pickup fields require time but allow an optional city address, and summary preserves details', () => {
 const pickup = { time: '14:30', location: 'city', address: '<Hotel>' };
 const html = renderToStaticMarkup(e(ui.ParkPickupFields, { id: 'pickup', pickup, currency: 'THB', onChange() {} }));
 assert.match(html, /for="pickup-time"/); assert.match(html, /type="time"[^>]*required=""/);
 for (const label of ['Аэропорт — 0 THB', 'Город — 500 THB', 'Самовывоз — 0 THB', 'Название отеля или адрес (необязательно)']) assert.ok(html.includes(label));
 assert.match(html, /id="pickup-address"/);
 assert.doesNotMatch(html, /id="pickup-address"[^>]*(?:required|pattern)=/);
 const airport = renderToStaticMarkup(e(ui.ParkPickupFields, { id: 'pickup', pickup: { ...pickup, location: 'airport' }, onChange() {} }));
 assert.doesNotMatch(airport, /id="pickup-address"/);
 assert.equal(ui.validParkPickup(pickup), true);
 assert.equal(ui.validParkPickup({ ...pickup, time: '24:00' }), false);
 assert.equal(ui.validParkPickup({ ...pickup, address: '  ' }), true);
 assert.equal(ui.validParkPickup({ ...pickup, address: '' }), true);
 const summary = renderToStaticMarkup(e(ui.ParkPickupSummary, { pickup, deliveryFee: '500.00', total: '2900.00', currency: 'THB' }));
 assert.match(summary, /Получение<\/h4>/); assert.match(summary, />14:30<\/span>/); assert.match(summary, /Доставка:/); assert.match(summary, /Итого аренда и доставка:/);
 assert.match(summary, /&lt;Hotel&gt;/); assert.doesNotMatch(summary, /<Hotel>/);
 const item = { ...booking, pricing: { ...booking.pricing, pickup, delivery_fee: '500.00', total_payable: '2100.00' } };
 assert.equal(ui.calendarBooking(item).form_data.dates.pickupTime, '14:30');
 assert.equal(ui.calendarLogistics(item).pickup_date, '2026-08-02T14:30:00');
 const request = renderToStaticMarkup(e(ui.ParkRequestItem, { booking: item, detailed: true, busy: false, onAction() {} }));
 assert.match(request, /Получение<\/dt>/); assert.match(request, /14:30/); assert.match(request, /&lt;Hotel&gt;/); assert.doesNotMatch(request, /<Hotel>/);
 const filters = readFileSync('src/components/platform/ParkRentalFilters.tsx', 'utf8');
 assert.doesNotMatch(filters, /Марка или модель|park-search|onSearchChange/);
});

test('timetable focuses today in park timezone, other months retain their first day', () => {
 const today = ui.parkToday('Asia/Bangkok', new Date('2026-10-31T19:00:00Z'));
 assert.equal(today, '2026-11-01');
 assert.equal(ui.timetableFocusDay('2026-11', today), '2026-11-01');
 assert.equal(ui.timetableFocusDay('2026-10', today), '2026-10-01');
 assert.equal(ui.timetableFocusDay('2026-12', today), '2026-12-01');
 assert.equal(ui.timetableFocusDay('2026-10', '2026-10-12'), '2026-10-12');
 const dates = Array.from({ length: 97 }, (_, index) => new Date(2026, 8, 24 + index));
 assert.equal(ui.schedulerInitialOffset(dates, new Date(2026, 9, 12), 24), 18 * 24);
 assert.equal(ui.schedulerInitialOffset(dates, new Date(2026, 9, 1), 24), 7 * 24);
 assert.equal(ui.schedulerInitialOffset(dates, undefined, 24), 7 * 24);
 assert.equal(ui.schedulerInitialOffset(dates, new Date(2025, 9, 1), 24), 7 * 24);
});

test('calendar view buttons separate timetable from delivery calendar and remove list', () => {
 for (const view of ['timetable', 'deliveries']) {
  const html = renderToStaticMarkup(e(ui.Tabs, { value: view }, e(ui.ParkCalendarViewButtons), e(ui.TabsContent, { value: 'timetable' }, 'TIMETABLE_ONLY'), e(ui.TabsContent, { value: 'deliveries' }, 'DELIVERIES_ONLY')));
  assert.equal((html.match(/role="tab"/g) || []).length, 2);
  assert.match(html, /Таймтейбл/); assert.match(html, /Календарь доставок/);
  assert.doesNotMatch(html, />Список</);
  assert.ok(html.includes(view === 'timetable' ? 'TIMETABLE_ONLY' : 'DELIVERIES_ONLY'));
  assert.ok(!html.includes(view === 'timetable' ? 'DELIVERIES_ONLY' : 'TIMETABLE_ONLY'));
 }
 const source = readFileSync(resolve('src/components/platform/ParkBookingCalendar.tsx'), 'utf8');
 assert.match(source, /useState\('timetable'\)/);
 assert.match(source, /<TabsContent value="timetable"[\s\S]*<SchedulerCalendar[\s\S]*initialScrollDate=\{initialScrollDate\}/);
 assert.match(source, /<TabsContent value="deliveries"[\s\S]*<MonthCalendarView/);
 assert.doesNotMatch(source, /<TabsContent value="list"/);
});

test('Gantt uses thumbnail references for new and previously uploaded photos', () => {
 const main = `assets/${'a'.repeat(32)}/${'b'.repeat(32)}.webp`;
 const thumbnail = main.replace(/\/([^/]+)$/, '/thumb/$1');
 assert.equal(ui.calendarThumbnail({ photos: { main, thumbnail } }), thumbnail);
 assert.equal(ui.calendarThumbnail({ photos: { main } }), thumbnail);
 assert.equal(ui.calendarThumbnail({ photos: {} }), undefined);
});

test('fallback contact form labels all channels and requires a number and consent', () => {
 for (const channel of ['whatsapp', 'max', 'phone']) {
  const html = renderToStaticMarkup(e(ui.ParkContactFields, { id: 'client', contact: { channel, value: '' }, busy: false, onChange() {} }));
  const pattern = html.match(/pattern="([^"]+)"/)?.[1];
  assert.ok(pattern);
  assert.equal(new RegExp(`^(?:${pattern})$`, 'v').test('+66123456789'), true);
  assert.match(html, /WhatsApp/); assert.match(html, /MAX/); assert.match(html, /Телефон/);
  assert.match(html, /for="client-contact"/);
  assert.match(html, /type="tel"[^>]*required=""/);
  assert.match(html, /type="checkbox" required=""/);
  assert.match(html, /Разрешаю передать этот контакт парку/);
  assert.match(html, /aria-describedby="client-contact-hint client-contact-format"/);
 }
 const html = renderToStaticMarkup(e(ui.ParkRequestItem, { booking: { ...booking, customer: { name: 'Test', username: null, contact: { channel: 'max', value: '+66123456789' } } }, busy: false, onAction() {} }));
 assert.match(html, /MAX: \+66123456789/);
 assert.match(html, /Скопировать контакт/);
 assert.match(html, /<li class="min-w-0 rounded-xl border border-slate-300 bg-white p-4 sm:p-5"/);
 assert.doesNotMatch(html, /Контакт для прямой связи не указан/);
 const invalid = renderToStaticMarkup(e(ui.ParkContactFields, { id: 'client', contact: { channel: 'phone', value: '+1' }, error: 'Укажите номер с кодом страны.', busy: false, onChange() {} }));
 assert.match(invalid, /aria-invalid="true"/);
 assert.match(invalid, /aria-describedby="client-contact-hint client-contact-format client-contact-error"/);
 assert.match(invalid, /id="client-contact-error" role="alert"/);
});

test('adapter uses park civil dates, retains ID and does not invent customer contacts or photos', () => {
 const item = ui.calendarBooking(booking);
 assert.equal(item.booking_id, booking.id);
 assert.equal(item.status, 'pre_booking');
 assert.equal(item.form_data.dates.start, '2026-08-02T00:00:00');
 assert.equal(item.form_data.dates.end, '2026-08-04T00:00:00');
 assert.equal(item.form_data.contact.value, '');
 const cars = ui.calendarCars([{ id: 'asset-b', name: 'Honda' }], [booking]);
 assert.deepEqual(cars.map(car => car.id), ['asset-b', 'asset-a']);
 assert.equal(cars[1].name, 'Toyota');
 assert.equal(cars[1].photos.main, '');
});

test('day details include pickup, ongoing occupancy and return, but not cancelled bookings', () => {
 for (const day of ['2026-08-02', '2026-08-03', '2026-08-04']) assert.equal(ui.bookingsOnDay([booking], day).length, 1);
 assert.equal(ui.bookingsOnDay([booking], '2026-08-05').length, 0);
 assert.equal(ui.bookingsOnDay([{ ...booking, status: 'cancelled' }], '2026-08-03').length, 0);
});

test('park timetable includes return day and preserves the optional exclusive range for other callers', () => {
 const props = { cars: ui.calendarCars([], [booking]), bookings: [ui.calendarBooking(booking)], startDate: new Date('2026-08-01T00:00:00'), daysToShow: 97, onDateChange() {}, onCreateBooking() {}, onBookingClick() {} };
 const html = renderToStaticMarkup(e(ui.SchedulerCalendar, { ...props, readOnly: true }));
 assert.match(html, /role="button" tabindex="0"[^>]*aria-label="Toyota/);
 assert.match(html, /width:66px/);
 const exclusive = renderToStaticMarkup(e(ui.SchedulerCalendar, { ...props, readOnly: true, exclusiveEnd: true }));
 assert.match(exclusive, /width:42px/);
 assert.doesNotMatch(readFileSync('src/components/platform/ParkBookingCalendar.tsx', 'utf8'), /readOnly exclusiveEnd/);
 assert.doesNotMatch(html, /images_web|park-b/);
 const legacy = renderToStaticMarkup(e(ui.SchedulerCalendar, props));
 assert.match(legacy, /width:66px/);
 assert.match(html, /height:96px;max-height:min\(65vh, 520px\)/);
 assert.match(legacy, /height:calc\(100vh - 60px\)/);
});

test('11–16 October covers six timetable cells without changing the five paid days or real return time', () => {
 const item = { ...booking, pricing: { ...booking.pricing, start_date: '2026-10-11', end_date: '2026-10-16', days: 5, pickup: { time: '09:45', location: 'airport', address: '', return_time: '09:45', return_location: 'airport' } } };
 const projected = ui.calendarBooking(item);
 const html = renderToStaticMarkup(e(ui.SchedulerCalendar, { cars: ui.calendarCars([], [item]), bookings: [projected], startDate: new Date('2026-10-01T00:00:00'), daysToShow: 97, readOnly: true, onDateChange() {}, onCreateBooking() {}, onBookingClick() {} }));
 assert.match(html, /11 окт\. 2026-16 окт\. 2026/);
 assert.match(html, /width:138px/); // Six 24px cells, minus the existing 6px visual inset.
 assert.equal(projected.form_data.dates.days, 5);
 assert.equal(projected.form_data.dates.end, '2026-10-16T09:45:00');
 const crossing = { ...item, pricing: { ...item.pricing, start_date: '2026-10-30', end_date: '2026-11-02' } };
 const crossHtml = renderToStaticMarkup(e(ui.SchedulerCalendar, { cars: ui.calendarCars([], [crossing]), bookings: [ui.calendarBooking(crossing)], startDate: new Date('2026-10-01T00:00:00'), daysToShow: 97, readOnly: true, onDateChange() {}, onCreateBooking() {}, onBookingClick() {} }));
 assert.match(crossHtml, /width:90px/); // Four date cells across the month boundary.
});

test('park Gantt renders a private thumbnail above the truncated name in the sticky column', () => {
 const name = 'Toyota Yaris с очень длинным названием';
 const cars = ui.calendarCars([{ id: 'asset-a', name }], [booking]);
 const props = { cars, bookings: [], startDate: new Date('2026-08-01T00:00:00'), daysToShow: 97, onDateChange() {}, onCreateBooking() {}, onBookingClick() {},
  renderCarPhoto: car => e('img', { src: 'blob:private-park-photo', alt: '', 'data-asset': car.id }) };
 const html = renderToStaticMarkup(e(ui.SchedulerCalendar, { ...props, readOnly: true }));
 assert.match(html, /sticky left-0/);
 assert.match(html, /h-7 w-20 shrink-0 overflow-hidden rounded/);
 assert.ok(html.indexOf('blob:private-park-photo') < html.indexOf(`title="${name}"`));
 assert.match(html, /truncate/);
 assert.match(html, /height:96px/);
 assert.doesNotMatch(html, /images_web/);
 const missing = renderToStaticMarkup(e(ui.ParkCalendarPhoto, { tenantId: 'park-a', admin: true }));
 assert.match(missing, /Фото пока нет/);
 assert.match(missing, /lucide-car-front/);
 assert.doesNotMatch(missing, /<img/);
 const legacy = renderToStaticMarkup(e(ui.SchedulerCalendar, props));
 assert.doesNotMatch(legacy, /blob:private-park-photo/);
});

test('request item displays private contacts with safe links and actionable statuses', () => {
 const props = { booking: { ...booking, customer: { name: 'Иван', username: 'ivan_test', phone: '+66 123-456-789', telegram_user_id: '42' } }, busy: false, onAction() {} };
 const html = renderToStaticMarkup(e(ui.ParkRequestItem, props));
 assert.match(html, /Иван/);
 assert.match(html, /@ivan_test/);
 assert.doesNotMatch(html, /a{64}/);
 assert.match(html, /href="https:\/\/t.me\/ivan_test"/);
 assert.match(html, /href="tel:\+66123456789"/);
 assert.match(html, /Telegram ID: 42/);
 assert.match(html, /Подтвердить/);
 assert.match(html, /bg-purple-300 text-purple-950[^>]*>Ожидает подтверждения/);
 assert.match(html, /Отменить/);
 const missing = renderToStaticMarkup(e(ui.ParkRequestItem, { ...props, booking: { ...booking } }));
 assert.match(missing, /Контакт для прямой связи не указан/);
 assert.doesNotMatch(missing, /href="(?:https:\/\/t.me|tel:)/);
 const unsafe = renderToStaticMarkup(e(ui.ParkRequestItem, { ...props, booking: { ...booking, customer: { username: 'evil?start=secret', phone: 'javascript:alert(1)' } } }));
 assert.doesNotMatch(unsafe, /href="(?:https:\/\/t.me|tel:|javascript:)/);
 const confirmed = renderToStaticMarkup(e(ui.ParkRequestItem, { ...props, booking: { ...booking, status: 'confirmed' } }));
 assert.match(confirmed, /bg-green-400 text-green-950[^>]*>Подтверждена/);
 assert.doesNotMatch(confirmed, />Подтвердить<\/button>/);
 assert.match(confirmed, />Отменить<\/button>/);
 const cancelled = renderToStaticMarkup(e(ui.ParkRequestItem, { ...props, booking: { ...booking, status: 'cancelled' } }));
 assert.match(cancelled, /bg-red-300 text-red-950[^>]*>Отменена/);
 assert.doesNotMatch(cancelled, />Отменить<\/button>|>Подтвердить<\/button>/);
});

test('opened request has readable amounts, private contacts and a plain-text copyable number', () => {
 const html = renderToStaticMarkup(e(ui.ParkRequestItem, { booking: { ...booking, id: 'a'.repeat(64), booking_number: '100001', customer: { name: 'Иван', username: 'ivan_test' } }, detailed: true, busy: false, onAction() {} }));
 assert.match(html, /lucide-car-front/);
 assert.match(html, /lucide-calendar-days/);
 assert.match(html, /<dl/);
 assert.match(html, /Депозит отдельно/);
 assert.match(html, /1(?:\s|&#x27;|&#160;|&nbsp;)+600/);
 assert.match(html, /<span class="min-w-0 select-text break-all text-sm font-medium tabular-nums">100001<\/span>/);
 assert.doesNotMatch(html, /<input|<label/);
 assert.match(html, /aria-label="Скопировать номер заявки"/);
 assert.match(html, /size-11 shrink-0 p-0/);
 assert.match(html, /@ivan_test/);
 assert.doesNotMatch(html, /a{64}/);
 assert.match(html, /bg-purple-300 text-purple-950/);
 assert.doesNotMatch(html, /2026-08-02 — 2026-08-04/);
 const legacy = renderToStaticMarkup(e(ui.ParkRequestItem, { booking: { ...booking, id: 'a'.repeat(64) }, detailed: true, busy: false, onAction() {} }));
 assert.match(legacy, new RegExp(`tabular-nums">${'a'.repeat(64)}<\\/span>`));
 assert.doesNotMatch(legacy, /<input/);
});

test('opened request reserves a compact private photo beside its name, with a safe fallback', () => {
 const props = { booking, tenantId: 'park-a', admin: true, detailed: true, busy: false, onAction() {} };
 const withPhoto = renderToStaticMarkup(e(ui.ParkRequestItem, { ...props, photoReference: '/private/asset/thumb.webp' }));
 assert.match(withPhoto, /h-14 w-20 shrink-0 overflow-hidden rounded-lg/);
 assert.match(withPhoto, /data-request-photo/);
 assert.match(withPhoto, /Загружаем фото/);
 assert.doesNotMatch(withPhoto, /src="\/private|images_web/);
 const missing = renderToStaticMarkup(e(ui.ParkRequestItem, props));
 assert.match(missing, /Фото пока нет/); assert.match(missing, /lucide-car-front/);
 const list = renderToStaticMarkup(e(ui.ParkRequestItem, { ...props, detailed: false }));
 assert.doesNotMatch(list, /data-request-photo/);
 const calendar = readFileSync('src/components/platform/ParkBookingCalendar.tsx', 'utf8');
 assert.match(calendar, /photoReference=\{photos.get\(booking.asset_id\)\}/);
 const source = readFileSync('src/components/platform/ParkCalendarPhoto.tsx', 'utf8');
 assert.match(source, /loadPlatformMedia : loadOwnerMedia/);
 assert.match(source, /URL.revokeObjectURL/); assert.match(source, /onError=\{\(\) => setFailed\(true\)\}/);
});

test('shared month has occupied-day and return badges, with named keyboard controls', () => {
 const html = renderToStaticMarkup(e(ui.MonthCalendarView, { currentDate: new Date('2026-08-01T00:00:00'), bookings: [ui.calendarBooking(booking)], logisticsData: [ui.calendarLogistics(booking)], onDateChange() {}, onBookingClick() {}, onDayClick() {}, showOccupancy: true }));
 assert.match(html, /aria-label="Выдача: Toyota, Ожидает подтверждения"/);
 assert.match(html, /aria-label="Занято: Toyota, Ожидает подтверждения"/);
 assert.match(html, /aria-label="Возврат: Toyota, Ожидает подтверждения"/);
 assert.match(html, /<button[^>]+aria-label="3 августа 2026, событий: 1"/);
 assert.match(html, /min-h-5/);
 assert.match(html, /py-0.5/);
 assert.match(html, /text-purple-700/);
 assert.doesNotMatch(html, /class="[^"]*opacity-[^\"]*"[^>]*aria-label="Занято/);
});

test('park month shades Saturday and Sunday, including adjacent-month days, without shading weekdays', () => {
 const props = { currentDate: new Date('2026-10-01T00:00:00'), bookings: [], logisticsData: [], onDateChange() {}, onBookingClick() {} };
 const html = renderToStaticMarkup(e(ui.MonthCalendarView, { ...props, showOccupancy: true }));
 const cells = [...html.matchAll(/data-calendar-day="([^"]+)" class="([^"]+)"/g)];
 assert.ok(cells.length > 0);
 for (const [, day, classes] of cells) {
  const weekday = new Date(`${day}T00:00:00`).getDay();
  assert.equal(classes.split(' ').includes('bg-slate-100/40'), weekday === 0 || weekday === 6, day);
 }
 assert.ok(cells.some(([ , day, classes]) => day === '2026-11-01' && classes.includes('bg-slate-100/40')));
 assert.match(html, /divide-y border-t divide-dotted divide-slate-200\/60 border-dotted/);
 assert.match(html, /grid-cols-7 divide-x divide-dotted divide-slate-200\/60/);
 assert.match(html, /text-red-700">Сб<\/div>/);
 assert.match(html, /text-red-700">Вс<\/div>/);
 assert.match(html, /pointer-events-none select-none flex flex-col/);
 const legacy = renderToStaticMarkup(e(ui.MonthCalendarView, props));
 assert.doesNotMatch(legacy, /data-calendar-day="[^"]+" class="[^"]*bg-slate-100/);
 assert.doesNotMatch(legacy, /divide-dotted|text-red-700/);
});

test('today fills the entire park calendar cell with opaque soft blue instead of a bright date badge', () => {
 const today = new Date();
 const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
 const props = { currentDate: today, bookings: [], logisticsData: [], onDateChange() {}, onBookingClick() {} };
 const html = renderToStaticMarkup(e(ui.MonthCalendarView, { ...props, showOccupancy: true }));
 const cell = html.match(new RegExp(`data-calendar-day="${key}"[^]*?(?=data-calendar-day=|$)`))[0];
 assert.match(cell, /class="[^"]*\bbg-blue-50\b/);
 assert.doesNotMatch(cell, /bg-blue-50\/|bg-blue-600|bg-slate-100\/40/);
 assert.match(cell, /aria-current="date"/);
 assert.match(cell, /font-bold text-blue-800/);
 const legacy = renderToStaticMarkup(e(ui.MonthCalendarView, props));
 assert.match(legacy, /bg-blue-600 text-white shadow-md/);
});

test('confirmed occupancy has green text while pickup and return retain their distinct colors', () => {
 const confirmed = { ...booking, status: 'confirmed' };
 const html = renderToStaticMarkup(e(ui.MonthCalendarView, { currentDate: new Date('2026-08-01T00:00:00'), bookings: [ui.calendarBooking(confirmed)], logisticsData: [ui.calendarLogistics(confirmed)], onDateChange() {}, onBookingClick() {}, showOccupancy: true }));
 assert.match(html, /text-green-700/);
 assert.match(html, /bg-green-400 text-green-950/);
 assert.match(html, /bg-yellow-400 text-yellow-950/);
});

test('park month hides confirmed middle-day badges but retains handovers, prebookings, blocks and day details', () => {
 const confirmed = { ...booking, status: 'confirmed' };
 const props = { currentDate: new Date('2026-08-01T00:00:00'), onDateChange() {}, onBookingClick() {}, showOccupancy: true, hideConfirmedOccupancy: true };
 const html = renderToStaticMarkup(e(ui.MonthCalendarView, { ...props, bookings: [ui.calendarBooking(confirmed)], logisticsData: [ui.calendarLogistics(confirmed)] }));
 assert.match(html, /aria-label="Выдача: Toyota"/);
 assert.match(html, /aria-label="Возврат: Toyota"/);
 assert.doesNotMatch(html, /aria-label="Занято: Toyota"/);
 assert.match(html, /aria-label="3 августа 2026, событий: 1"/);
 assert.equal(ui.bookingsOnDay([confirmed], '2026-08-03')[0].id, confirmed.id);
 const items = [booking, { ...booking, id: 'block-a', entry_type: 'block', status: 'confirmed', pricing: { ...booking.pricing, asset_name: 'Blocked car' } }];
 const retained = renderToStaticMarkup(e(ui.MonthCalendarView, { ...props, bookings: items.map(ui.calendarBooking), logisticsData: items.map(ui.calendarLogistics) }));
 assert.match(retained, /aria-label="Занято: Toyota, Ожидает подтверждения"/);
 assert.match(retained, /aria-label="Блокировка: Blocked car"/);
 assert.match(retained, /text-purple-700/);
 assert.match(retained, /bg-slate-200 text-slate-900/);
 const many = Array.from({ length: 6 }, (_, index) => ({ ...confirmed, id: `confirmed-${index}` }));
 const overflow = renderToStaticMarkup(e(ui.MonthCalendarView, { ...props, bookings: many.map(ui.calendarBooking), logisticsData: many.map(ui.calendarLogistics) }));
 const middleCell = overflow.match(/data-calendar-day="2026-08-03"[\s\S]*?(?=data-calendar-day="2026-08-04")/)[0];
 assert.doesNotMatch(middleCell, /data-compact-event|\+ ещё/);
 assert.match(middleCell, /событий: 6/);
});

test('park periods use plain middle-day text for all sources and consistent purple/gray timetable bars', () => {
 const props = { currentDate: new Date('2026-08-01T00:00:00'), onDateChange() {}, onBookingClick() {}, onDayClick() {}, showOccupancy: true };
 for (const status of ['requested', 'confirmed']) {
  const variants = ['owner_manual', 'web_storefront', 'telegram_storefront'].map(source => {
   const item = { ...booking, status, source };
   return renderToStaticMarkup(e(ui.MonthCalendarView, { ...props, bookings: [ui.calendarBooking(item)], logisticsData: [ui.calendarLogistics(item)] }));
  });
  assert.equal(variants[0], variants[1]); assert.equal(variants[1], variants[2]);
  const middle = variants[0].match(/data-calendar-day="2026-08-03"[\s\S]*?(?=data-calendar-day="2026-08-04")/)[0];
  const classes = [...middle.matchAll(/data-plain-occupancy="true"[^>]*class="([^"]+)"/g)].map(match => match[1]);
  assert.equal(classes.length, 1); assert.doesNotMatch(classes[0], /\bbg-/);
  assert.match(middle, /Toyota/);
  if (status === 'requested') { assert.match(middle, /text-purple-700/); assert.doesNotMatch(middle, /lucide-clock/); }
  else { assert.match(classes[0], /text-green-700/); assert.doesNotMatch(middle, /box-shadow|lucide-clock/); }
 }
 for (const [entry_type, status, color] of [['rental', 'requested', '#d8b4fe'], ['block', 'confirmed', '#e2e8f0'], ['rental', 'confirmed', '#86efac']]) {
  const item = { ...booking, entry_type, status };
  const html = renderToStaticMarkup(e(ui.SchedulerCalendar, { cars: ui.calendarCars([], [item]), bookings: [ui.calendarBooking(item)], startDate: new Date('2026-08-01T00:00:00'), daysToShow: 97, readOnly: true, onDateChange() {}, onCreateBooking() {}, onBookingClick() {} }));
  assert.ok(html.includes(`background-color:${color}`));
 }
 const source = readFileSync('src/components/platform/ParkBookingCalendar.tsx', 'utf8');
 assert.doesNotMatch(source, /showOccupancy hideConfirmedOccupancy/);
 assert.match(source, /parkBookingColors.pending.dot/); assert.match(source, /parkBookingColors.blocked.dot/);
});

test('client quote has semantic icons and clearly separates rent from refundable deposit', () => {
 const html = renderToStaticMarkup(e(ui.ParkQuoteSummary, { quote: { asset_name: 'MG 5', start_date: '2026-10-11', end_date: '2026-10-23', days: 12,
   daily_rate: '900', total_rental: '10800', deposit: '5000', currency: 'THB', timezone: 'Asia/Bangkok' } }));
 for (const icon of ['car-front', 'calendar-days', 'banknote', 'wallet-cards', 'clock-3', 'info']) assert.match(html, new RegExp(`lucide-${icon}`));
 assert.match(html, /Возвратный депозит отдельно/);
 assert.match(html, /12 суток/);
 assert.match(html, /<dl/);
 assert.doesNotMatch(html, /Передачи|Бензин|5 мест|Bearer|quote_token/);
});

test('trial displays only the expiry date in the park timezone', () => {
 const tenant = { timezone: 'Asia/Bangkok', trial: { status: 'trialing', days: 7, started_at: '2026-10-10T00:00:00Z', ends_at: '2026-10-17T00:00:00Z', expired: false } };
 const html = renderToStaticMarkup(e(ui.ParkTrialStatus, { tenant }));
 assert.match(html, /Триал до 17 октября 2026/);
 assert.doesNotMatch(html, /Asia\/Bangkok|07:00|10 окт/);
 const boundary = { ...tenant, trial: { ...tenant.trial, ends_at: '2026-10-16T20:00:00Z' } };
 assert.match(renderToStaticMarkup(e(ui.ParkTrialStatus, { tenant: boundary })), /Триал до 17 окт/);
 assert.match(renderToStaticMarkup(e(ui.ParkTrialStatus, { tenant: { ...tenant, trial: { ...tenant.trial, expired: true } } })), /Триал завершён/);
});

test('timetable and deliveries keep shared month and asset filter in separate panels', () => {
 const source = readFileSync('src/components/platform/ParkBookingCalendar.tsx', 'utf8');
 const timetable = source.match(/<TabsContent value="timetable"[\s\S]*?<\/TabsContent>/)?.[0];
 const deliveries = source.match(/<TabsContent value="deliveries"[\s\S]*?<\/TabsContent>/)?.[0];
 assert.ok(timetable); assert.ok(deliveries);
 assert.match(timetable, /<SchedulerCalendar/); assert.doesNotMatch(timetable, /<MonthCalendarView/);
 assert.match(timetable, /<ParkCalendarLegend view="timetable"/);
 assert.match(deliveries, /<MonthCalendarView/); assert.doesNotMatch(deliveries, /<SchedulerCalendar/);
 assert.match(deliveries, /<ParkCalendarLegend view="deliveries"/);
 assert.match(deliveries, /currentDate=\{date\}/);
 assert.match(timetable, /startDate=\{date\}/);
 assert.match(timetable, /cars=\{cars\.filter\(car => !assetId \|\| car\.id === assetId\)\}/);
 assert.match(source, /timetableFocusDay\(month, today\)/);
});

test('timetable legend describes booking bars; delivery legend keeps pickup and return', () => {
 const timetable = renderToStaticMarkup(e(ui.ParkCalendarLegend, { view: 'timetable' }));
 assert.match(timetable, /Подтверждено/);
 assert.match(timetable, /Ожидает подтверждения/);
 assert.match(timetable, /Блокировка/);
 assert.match(timetable, /bg-emerald-500/);
 assert.match(timetable, /bg-purple-500/);
 assert.match(timetable, /bg-slate-400/);
 assert.equal((timetable.match(/<li /g) || []).length, 3);
 assert.doesNotMatch(timetable, /Выдача|Возврат|bg-yellow/);
 assert.match(timetable, /flex-wrap/);
 const deliveries = renderToStaticMarkup(e(ui.ParkCalendarLegend, { view: 'deliveries' }));
 assert.equal((deliveries.match(/<li /g) || []).length, 2);
 assert.match(deliveries, /Выдача/); assert.match(deliveries, /Возврат/);
 assert.match(deliveries, /bg-green-500/); assert.match(deliveries, /bg-orange-400/);
 assert.doesNotMatch(deliveries, /Подтверждено|Ожидает подтверждения|Блокировка/);
});

test('delivery-only calendar renders handovers in green and orange without blocks or middle days', () => {
 const items = [
  { ...booking, status: 'confirmed' },
  { ...booking, id: 'pending', pricing: { ...booking.pricing, asset_name: 'Pending car' } },
  { ...booking, id: 'blocked', entry_type: 'block', status: 'confirmed', pricing: { ...booking.pricing, asset_name: 'Blocked car' } },
  { ...booking, id: 'cancelled', status: 'cancelled', pricing: { ...booking.pricing, asset_name: 'Cancelled car' } },
 ];
 const html = renderToStaticMarkup(e(ui.MonthCalendarView, { currentDate: new Date('2026-08-01T00:00:00'), bookings: items.map(ui.calendarBooking), logisticsData: items.map(ui.calendarLogistics), showOccupancy: true, handoversOnly: true, onDateChange() {}, onBookingClick() {}, onDayClick() {} }));
 assert.match(html, /bg-green-400 text-green-950/);
 assert.match(html, /bg-orange-300 text-orange-950/);
 assert.doesNotMatch(html, /Blocked car|Cancelled car|data-plain-occupancy|bg-purple-300|Ожидает подтверждения/);
 const day = html.match(/data-calendar-day="2026-08-03"[\s\S]*?(?=data-calendar-day="2026-08-04")/)?.[0];
 assert.ok(day);
 assert.doesNotMatch(day, /data-calendar-booking|Toyota|Pending car/);
 assert.match(day, /событий: 0/);
 const source = readFileSync('src/components/platform/ParkBookingCalendar.tsx', 'utf8');
 assert.match(source, /showOccupancy handoversOnly/);
 assert.match(source, /item\.entry_type !== 'block' && \(item\.pricing\.start_date === selection\.day \|\| item\.pricing\.end_date === selection\.day\)/);
});

test('month and transport occupy two columns without a separate today row', () => {
 const source = readFileSync('src/components/platform/ParkBookingCalendar.tsx', 'utf8');
 assert.match(source, /mt-3 grid grid-cols-2 items-end gap-2/);
 assert.match(source, /<ParkCalendarMonthSelect[^>]*onChange=\{setMonth\}/);
 assert.match(source, /htmlFor=\{`\$\{id\}-asset`\}[^>]*>\{pt\("Транспорт"\)\}/);
 assert.match(source, /pt\("Весь транспорт"\)/);
 assert.match(source, /onChange=\{event => setAssetId\(event.target.value\)\}/);
 assert.doesNotMatch(source, /pt\("Сегодня"\)|Предыдущий месяц|Следующий месяц|setScrollResetKey/);
});

test('rental request sheet omits technical copy and keeps its accessible title', () => {
 const source = readFileSync('src/components/platform/ParkBookingCalendar.tsx', 'utf8');
 const sheet = source.match(/<Dialog open=\{!!selection\}[\s\S]*?<\/Dialog>/)?.[0];
 assert.ok(sheet);
 assert.doesNotMatch(sheet, /Даты указаны по часовому|Автоматические сообщения клиентам|<DialogDescription|<Info/);
 assert.match(sheet, /aria-describedby=\{undefined\}/);
 assert.match(sheet, /<DialogTitle/);
 assert.match(sheet, /details\(selected\)/);
 assert.match(sheet, /<DialogHeader className="text-left">/);
 assert.doesNotMatch(sheet, /<DialogHeader[^>]*sticky/);
});

test('calendar vehicle filter changes only through the user-controlled select, never on booking save', () => {
 const source = readFileSync('src/components/platform/ParkBookingCalendar.tsx', 'utf8');
 assert.match(source, /const \[assetId, setAssetId\] = useState\(''\)/);
 assert.equal((source.match(/setAssetId\(/g) || []).length, 1);
 assert.match(source, /onChange=\{event => setAssetId\(event.target.value\)\}/);
 const saved = source.match(/onSaved=\{booking => \{([^]*?)\}\} \/>/)?.[1];
 assert.ok(saved);
 assert.doesNotMatch(saved, /setAssetId/);
 assert.match(saved, /setBookings\(items =>/);
 assert.match(saved, /setDraft\(null\)/);
});

test('manual form has labeled fields, inline validation hooks and date-only inputs', () => {
 const html = renderToStaticMarkup(e(ui.ParkManualBookingForm, { tenantId: 'park-a', admin: false,
   assets: [{ id: 'asset-a', name: 'Toyota', pricing: { daily_rate: 800, currency: 'THB' }, deposit_policy: { amount: 5000 } }],
   initialDay: '2026-08-02', onSaved() {}, onClose() {} }));
 assert.match(html, /Добавить запись в календарь/);
 assert.match(html, /Блокировка \/ обслуживание/);
 assert.match(html, /Имя клиента/);
 assert.match(html, /Создать подтверждённую бронь/);
 assert.match(html, /Предбронь — ожидает подтверждения/);
 assert.match(html, /Статус брони/);
 assert.match(html, /type="date"[^>]+value="2026-08-02"/);
 assert.match(html, /aria-describedby=/);
 assert.doesNotMatch(html, /datetime-local|chat_id|Bearer|secret|images_web/);
});

test('timetable cell routing includes occupied return days and ignores cancelled/other vehicles', () => {
 const other = { ...booking, id: 'other-booking', asset_id: 'other-car' };
 assert.equal(ui.timetableCellBooking([other, booking], booking.asset_id, booking.pricing.start_date)?.id, booking.id);
 assert.equal(ui.timetableCellBooking([booking], booking.asset_id, booking.pricing.end_date)?.id, booking.id);
 assert.equal(ui.timetableCellBooking([{ ...booking, status: 'cancelled' }], booking.asset_id, booking.pricing.start_date), undefined);
 assert.equal(ui.timetableCellBooking([booking], booking.asset_id, '2026-08-05'), undefined);
 assert.equal(ui.timetableCellBooking([other], booking.asset_id, booking.pricing.start_date), undefined);
});

test('park timetable cells are native keyboard-accessible controls; legacy grid stays unchanged', () => {
 const car = ui.calendarCars([], [booking])[0];
 const props = { cars: [car], bookings: [ui.calendarBooking(booking)], startDate: new Date('2026-08-01T00:00:00'), daysToShow: 97, onDateChange() {}, onBookingClick() {}, onCreateBooking() {}, readOnly: true };
 const interactive = renderToStaticMarkup(e(ui.SchedulerCalendar, { ...props, onDayCellClick() {} }));
 assert.equal((interactive.match(/data-day-index=/g) || []).length, 97);
 assert.match(interactive, /type="button"[^>]*data-compact-event/);
 assert.match(interactive, /Ячейка календаря:/);
 assert.equal((interactive.match(/tabindex="0"/g) || []).length, 3); // region, one cell, existing bar
 const readonly = renderToStaticMarkup(e(ui.SchedulerCalendar, props));
 assert.doesNotMatch(readonly, /data-day-index=/);
 const disabled = renderToStaticMarkup(e(ui.SchedulerCalendar, { ...props, onDayCellClick() {}, dayCellsDisabled: true }));
 assert.equal((disabled.match(/disabled=""/g) || []).length, 97);
 const source = readFileSync('src/components/admin/SchedulerCalendar.tsx', 'utf8');
 assert.match(source, /onPointerCancelCapture=/);
 assert.match(source, /event.detail !== 0/);
 assert.match(source, /event.preventDefault\(\); event.stopPropagation\(\)/);
 assert.match(source, /scrollLeft - gesture.left/);
 assert.match(source, /ArrowLeft.*ArrowRight.*Home.*End/);
});

test('timetable draft carries vehicle/start/end and preserves the manual form defaults elsewhere', () => {
 const assets = [{ id: 'asset-a', name: 'Other', pricing: { daily_rate: 800 }, deposit_policy: { amount: 5000 } },
  { id: 'asset-b', name: 'Selected', pricing: { daily_rate: 900 }, deposit_policy: { amount: 6000 } }];
 const html = renderToStaticMarkup(e(ui.ParkManualBookingForm, { tenantId: 'park-a', assets, admin: false, initialDay: '2026-10-31', initialEndDay: '2026-11-01', initialAssetId: 'asset-b', onSaved() {}, onClose() {} }));
 assert.match(html, /value="asset-b" selected=""/);
 assert.match(html, /value="2026-10-31"/);
 assert.match(html, /value="2026-11-01"/);
 const source = readFileSync('src/components/platform/ParkBookingCalendar.tsx', 'utf8');
 assert.match(source, /onDayCellClick=/);
 assert.match(source, /if \(existing\) setSelection\(\{ bookingId: existing.id \}\)/);
 assert.match(source, /endDay: format\(addDays\(clickedDate, 1\)/);
 assert.match(source, /initialEndDay=\{draft.endDay\}/);
 assert.match(source, /trigger\?\.isConnected/);
});

test('manual grid choice appears once and disables only the manual rate', () => {
 const rates = { price_1_6: 800, price_7_14: 700, price_15_29: 600, price_30: 500 };
 const html = renderToStaticMarkup(e(ui.ParkManualBookingForm, { tenantId: 'park-a', admin: false,
   assets: [{ id: 'asset-a', name: 'Toyota', pricing: { daily_rate: 800, currency: 'THB', tariff_grid: { low_season: rates, high_season: rates, high_start: '11-01', high_end: '03-31' } }, deposit_policy: { amount: 5000 } }],
   onSaved() {}, onClose() {} }));
 assert.equal((html.match(/Рассчитать аренду по тарифам автомобиля/g) || []).length, 1);
 assert.match(html, /type="checkbox"[^>]*checked=""/);
 assert.match(html, /id="[^"]+-rate" disabled=""/);
 assert.doesNotMatch(html, /id="[^"]+-deposit" disabled=""/);
});

test('block projects to a distinct calendar label and color without altering stored booking status', () => {
 const block = { ...booking, entry_type: 'block', source: 'owner_manual', status: 'confirmed', operator_details: { customer_name: '', note: 'Ремонт' } };
 assert.equal(ui.calendarBooking(block).status, 'blocked');
 assert.equal(block.status, 'confirmed');
 const html = renderToStaticMarkup(e(ui.MonthCalendarView, { currentDate: new Date('2026-08-01T00:00:00'), bookings: [ui.calendarBooking(block)], logisticsData: [ui.calendarLogistics(block)], onDateChange() {}, onBookingClick() {}, onDayClick() {}, showOccupancy: true }));
 assert.match(html, /aria-label="Блокировка: Toyota"/);
 assert.match(html, /bg-slate-200/);
 assert.equal(ui.calendarBooking({ ...block, status: 'cancelled' }).status, 'cancelled');
});
