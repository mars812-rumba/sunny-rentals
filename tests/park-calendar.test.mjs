import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: `export * from './src/utils/park-calendar';
 export { SchedulerCalendar } from './src/components/admin/SchedulerCalendar';
 export { MonthCalendarView } from './src/components/admin/MonthCalendarView';
 export { ParkTrialStatus } from './src/components/platform/ParkTrialStatus';
 export { ParkManualBookingForm } from './src/components/platform/ParkManualBookingForm';
 export { ParkQuoteSummary, ParkContactFields } from './src/components/platform/ParkBookingForm';
 export { ParkRequestItem } from './src/components/platform/ParkRequestsPanel';
 export { ParkCalendarPhoto } from './src/components/platform/ParkCalendarPhoto';
 export { ParkCalendarViewButtons } from './src/components/platform/ParkBookingCalendar';
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

test('edit dates returns to same storefront filters after dialog focus release', () => {
 const calls = [];
 ui.focusStorefrontFilters({ focus: options => calls.push(['focus', options]), scrollIntoView: options => calls.push(['scroll', options]) });
 assert.deepEqual(calls, [['focus', { preventScroll: true }], ['scroll', { block: 'start', behavior: 'instant' }]]);
 ui.focusStorefrontFilters(null);
 const form = readFileSync('src/components/platform/ParkBookingForm.tsx', 'utf8');
 assert.match(form, /onEditPickup\?\.\(\{ start, end, pickup \}\)/);
 const page = readFileSync('src/pages/ParkStorefrontPage.tsx', 'utf8');
 assert.match(page, /<Dialog open=\{open\}/);
 assert.match(page, /returnPeriod\.current = value; setOpen\(false\)/);
 assert.match(page, /onCloseAutoFocus=[\s\S]*event\.preventDefault\(\)[\s\S]*onEditPickup\(previous\)/);
 assert.match(page, /onEditPickup=\{editPickup\}/);
 assert.match(page, /focusStorefrontFilters\(document\.getElementById\('park-rental-filters'\)\)/);
 assert.match(page, /setPeriod\(value\)/); assert.match(page, /setPickup\(value\.pickup\)/);
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
 assert.match(summary, /Получение: 14:30/); assert.match(summary, /Доставка:/); assert.match(summary, /Итого аренда и доставка:/);
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
 assert.match(html, /role="button" tabindex="0" aria-label="Toyota/);
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
 assert.match(html, /11\.10-16\.10/);
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
 assert.match(html, /bg-purple-100 text-purple-950[^>]*>Ожидает подтверждения/);
 assert.match(html, /Отменить/);
 const missing = renderToStaticMarkup(e(ui.ParkRequestItem, { ...props, booking: { ...booking } }));
 assert.match(missing, /Контакт для прямой связи не указан/);
 assert.doesNotMatch(missing, /href="(?:https:\/\/t.me|tel:)/);
 const unsafe = renderToStaticMarkup(e(ui.ParkRequestItem, { ...props, booking: { ...booking, customer: { username: 'evil?start=secret', phone: 'javascript:alert(1)' } } }));
 assert.doesNotMatch(unsafe, /href="(?:https:\/\/t.me|tel:|javascript:)/);
 const confirmed = renderToStaticMarkup(e(ui.ParkRequestItem, { ...props, booking: { ...booking, status: 'confirmed' } }));
 assert.match(confirmed, /bg-emerald-100 text-emerald-950[^>]*>Подтверждена/);
 assert.doesNotMatch(confirmed, />Подтвердить<\/button>/);
 assert.match(confirmed, />Отменить<\/button>/);
 const cancelled = renderToStaticMarkup(e(ui.ParkRequestItem, { ...props, booking: { ...booking, status: 'cancelled' } }));
 assert.match(cancelled, /bg-red-100 text-red-900[^>]*>Отменена/);
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
 assert.match(html, /bg-purple-100 text-purple-950/);
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
 assert.match(html, /min-h-7/);
 assert.match(html, /text-purple-900/);
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

test('confirmed occupancy is quiet but pickup and return retain their distinct colors', () => {
 const confirmed = { ...booking, status: 'confirmed' };
 const html = renderToStaticMarkup(e(ui.MonthCalendarView, { currentDate: new Date('2026-08-01T00:00:00'), bookings: [ui.calendarBooking(confirmed)], logisticsData: [ui.calendarLogistics(confirmed)], onDateChange() {}, onBookingClick() {}, showOccupancy: true }));
 assert.match(html, /text-slate-800/);
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
 assert.match(retained, /text-purple-900/);
 assert.match(retained, /text-slate-700/);
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
  if (status === 'requested') { assert.match(middle, /text-purple-900/); assert.match(middle, /lucide-clock/); }
 }
 for (const [entry_type, status, color] of [['rental', 'requested', '#e9d5ff'], ['block', 'confirmed', '#e2e8f0'], ['rental', 'confirmed', '#86efac']]) {
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
 assert.match(html, /Триал до 17 окт\. 2026/);
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
 assert.match(deliveries, /<MonthCalendarView/); assert.doesNotMatch(deliveries, /<SchedulerCalendar/);
 assert.match(deliveries, /currentDate=\{date\}/);
 assert.match(timetable, /startDate=\{date\}/);
 assert.match(timetable, /cars=\{cars\.filter\(car => !assetId \|\| car\.id === assetId\)\}/);
 assert.match(source, /setScrollResetKey\(value => value \+ 1\)/);
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
