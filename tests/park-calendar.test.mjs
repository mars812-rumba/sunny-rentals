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
 export { ParkManualBookingForm } from './src/components/platform/ParkManualBookingForm';`, resolveDir: process.cwd(), loader: 'tsx' },
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

test('shared Gantt excludes return day for parks, keeps legacy inclusive range by default', () => {
 const props = { cars: ui.calendarCars([], [booking]), bookings: [ui.calendarBooking(booking)], startDate: new Date('2026-08-01T00:00:00'), daysToShow: 97, onDateChange() {}, onCreateBooking() {}, onBookingClick() {} };
 const html = renderToStaticMarkup(e(ui.SchedulerCalendar, { ...props, readOnly: true, exclusiveEnd: true }));
 assert.match(html, /role="button" tabindex="0" aria-label="Toyota/);
 assert.match(html, /width:42px/);
 assert.doesNotMatch(html, /images_web|park-b/);
 const legacy = renderToStaticMarkup(e(ui.SchedulerCalendar, props));
 assert.match(legacy, /width:66px/);
});

test('shared month has occupied-day and return badges, with named keyboard controls', () => {
 const html = renderToStaticMarkup(e(ui.MonthCalendarView, { currentDate: new Date('2026-08-01T00:00:00'), bookings: [ui.calendarBooking(booking)], logisticsData: [ui.calendarLogistics(booking)], onDateChange() {}, onBookingClick() {}, onDayClick() {}, showOccupancy: true }));
 assert.match(html, /aria-label="Выдача: Toyota"/);
 assert.match(html, /aria-label="Занято: Toyota"/);
 assert.match(html, /aria-label="Возврат: Toyota"/);
 assert.match(html, /<button[^>]+aria-label="3 августа 2026, событий: 1"/);
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

test('month view also contains the Gantt with shared dates and asset filter, without a Gantt switch', () => {
 const source = readFileSync('src/components/platform/ParkBookingCalendar.tsx', 'utf8');
 const monthPanel = source.match(/<TabsContent value="month"[\s\S]*?<\/TabsContent>/)?.[0];
 assert.ok(monthPanel);
 assert.ok(monthPanel.indexOf('<MonthCalendarView') < monthPanel.indexOf('<SchedulerCalendar'));
 assert.match(monthPanel, /currentDate=\{date\}/);
 assert.match(monthPanel, /startDate=\{date\}/);
 assert.match(monthPanel, /cars=\{cars\.filter\(car => !assetId \|\| car\.id === assetId\)\}/);
 assert.doesNotMatch(source, /TabsTrigger value="gantt"|TabsContent value="gantt"/);
 assert.match(source, /TabsTrigger value="list"/);
});

test('manual form has labeled fields, inline validation hooks and date-only inputs', () => {
 const html = renderToStaticMarkup(e(ui.ParkManualBookingForm, { tenantId: 'park-a', admin: false,
   assets: [{ id: 'asset-a', name: 'Toyota', pricing: { daily_rate: 800, currency: 'THB' }, deposit_policy: { amount: 5000 } }],
   initialDay: '2026-08-02', onSaved() {}, onClose() {} }));
 assert.match(html, /Добавить запись в календарь/);
 assert.match(html, /Блокировка \/ обслуживание/);
 assert.match(html, /Имя клиента/);
 assert.match(html, /Создать подтверждённую бронь/);
 assert.match(html, /type="date"[^>]+value="2026-08-02"/);
 assert.match(html, /aria-describedby=/);
 assert.doesNotMatch(html, /datetime-local|chat_id|Bearer|secret|images_web/);
});

test('block projects to a distinct calendar label and color without altering stored booking status', () => {
 const block = { ...booking, entry_type: 'block', source: 'owner_manual', status: 'confirmed', operator_details: { customer_name: '', note: 'Ремонт' } };
 assert.equal(ui.calendarBooking(block).status, 'blocked');
 assert.equal(block.status, 'confirmed');
 const html = renderToStaticMarkup(e(ui.MonthCalendarView, { currentDate: new Date('2026-08-01T00:00:00'), bookings: [ui.calendarBooking(block)], logisticsData: [ui.calendarLogistics(block)], onDateChange() {}, onBookingClick() {}, onDayClick() {}, showOccupancy: true }));
 assert.match(html, /aria-label="Блокировка: Toyota"/);
 assert.match(html, /bg-purple-100/);
 assert.equal(ui.calendarBooking({ ...block, status: 'cancelled' }).status, 'cancelled');
});
