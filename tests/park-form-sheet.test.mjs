import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sheet = readFileSync('src/components/platform/ParkFormSheet.tsx', 'utf8');
const css = readFileSync('src/components/platform/park-form-sheet.css', 'utf8');

test('park forms share a responsive 90dvh sheet with transform/opacity-only motion', () => {
 assert.match(sheet, /DialogPrimitive\.Portal/); assert.match(sheet, /DialogPrimitive\.Overlay/);
 assert.match(sheet, /data-park-sheet-body/); assert.match(sheet, /min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain/);
 assert.match(sheet, /header && <div className="shrink-0/);
 assert.match(css, /height: var\(--park-sheet-height, 90dvh\)/);
 assert.match(css, /border-radius: 1rem 1rem 0 0/);
 assert.match(css, /@media \(min-width: 640px\)/);
 assert.match(css, /max-width: 48rem/);
 assert.match(css, /200ms ease-out/);
 assert.match(css, /prefers-reduced-motion: reduce/);
 assert.match(css, /env\(safe-area-inset-bottom\)/);
 assert.doesNotMatch(css + sheet, /backdrop-filter|box-shadow|will-change/);
 for (const block of css.matchAll(/@keyframes[^]*?\}\s*\}/g)) assert.doesNotMatch(block[0], /(?:height|width|top|bottom|filter):/);
 assert.match(readFileSync('src/main.tsx', 'utf8'), /park-form-sheet.css/);
});

test('sheets protect unsaved data and saving, adjust to keyboard and restore accessible closing', () => {
 assert.match(sheet, /if \(!open && \(busy \|\| saving\)\) return false/);
 assert.match(sheet, /if \(!open && dirty\)/);
 assert.match(sheet, /<AlertDialog open=\{confirm\}/);
 assert.match(sheet, /<AlertDialogCancel>/);
 assert.match(sheet, /disabled=\{context\?\.busy\}/);
 assert.match(sheet, /activeSaves.current.size > 0/);
 assert.match(sheet, /window.visualViewport/);
 assert.match(sheet, /removeEventListener\('resize', update\)/);
 assert.match(sheet, /cancelAnimationFrame\(frame\)/);
 assert.match(sheet, /scrollIntoView\(\{ block: 'nearest', behavior: 'instant' \}\)/);
 assert.match(sheet, /onChangeCapture=/);
 assert.match(sheet, /returnFocus.current.focus\(\{ preventScroll: true \}\)/);
 const form = readFileSync('src/components/platform/ParkBookingForm.tsx', 'utf8');
 assert.match(form, /markSaved\?\.\(\); setBooking\(result\)/);
});

test('manual, vehicle, request and customer flows use sheets without changing API submission', () => {
 for (const path of ['ParkManualBookingForm.tsx', 'VehicleDetailsEditor.tsx', 'PlatformTenantWorkspace.tsx', 'ParkRequestsPanel.tsx']) {
  const source = readFileSync(`src/components/platform/${path}`, 'utf8');
  assert.match(source, /ParkFormSheet/); assert.match(source, /park-sheet-actions/);
 }
 for (const path of ['ParkStorefrontPage.tsx', 'ParkOwnerWebPage.tsx']) assert.match(readFileSync(`src/pages/${path}`, 'utf8'), /ParkFormSheet as Dialog, ParkFormSheetContent as DialogContent/);
 const editor = readFileSync('src/components/platform/ParkRequestsPanel.tsx', 'utf8');
 assert.match(editor, /const inside = useInsideParkFormSheet\(\)/);
 assert.match(editor, /return inside \? fields : <ParkFormSheet/);
 assert.match(editor, /expected_updated_at: version/);
 const manual = readFileSync('src/components/platform/ParkManualBookingForm.tsx', 'utf8');
 assert.match(manual, /pending.current.requestId/); assert.match(manual, /active.current\?\.abort/);
});
