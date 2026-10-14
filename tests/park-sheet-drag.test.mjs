import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const bundle = await build({ entryPoints: ['src/lib/park-sheet-drag.ts'], bundle: true, write: false, platform: 'node', format: 'esm' });
const { attachParkSheetDrag, sheetDragShouldClose } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('distance and velocity distinguish short drags from intentional dismissal', () => {
 assert.equal(sheetDragShouldClose(30, 0.1, 600), false);
 assert.equal(sheetDragShouldClose(125, 0, 600), true);
 assert.equal(sheetDragShouldClose(30, 0.8, 600), true);
 assert.equal(sheetDragShouldClose(5, 2, 600), false);
 assert.equal(sheetDragShouldClose(90, 0, 300), true);
});

function fixture({ allowed = true, desktop = false, reduced = false } = {}) {
 globalThis.window = { matchMedia: query => ({ matches: query.includes('640') ? desktop : reduced }) };
 let captured = false, closes = 0, measurements = 0, animations = 0;
 const handlers = new Map();
 const style = { transform: '', willChange: '', setProperty(key, value) { this[key] = value; }, removeProperty(key) { delete this[key]; } };
 const panel = { style, getAnimations: () => [], getBoundingClientRect() { measurements++; return { height: 600 }; }, animate() { animations++; return { cancel() {} }; } };
 const handle = { disabled: false, addEventListener: (key, fn) => handlers.set(key, fn), removeEventListener: key => handlers.delete(key), setPointerCapture: () => { captured = true; }, hasPointerCapture: () => captured, releasePointerCapture: () => { captured = false; } };
 const cleanup = attachParkSheetDrag(panel, handle, () => { closes++; return allowed; });
 const send = (type, y, time) => handlers.get(type)?.({ type, clientY: y, timeStamp: time, pointerId: 1, isPrimary: true, button: 0 });
 return { panel, handle, handlers, send, cleanup, stats: () => ({ closes, measurements, animations, captured }) };
}

test('handle follows the finger, measures once, cancels safely and suppresses a drag click', () => {
 const f = fixture();
 f.send('pointerdown', 10, 0); f.send('pointermove', 45, 80); f.send('pointermove', 55, 160);
 assert.equal(f.panel.style.transform, 'translateY(45px)');
 assert.equal(f.stats().measurements, 1);
 f.send('pointercancel', 55, 170);
 assert.equal(f.stats().closes, 0); assert.equal(f.panel.style.transform, '');
 assert.equal(f.panel.style.willChange, '');
 let prevented = false;
 f.handlers.get('click')({ detail: 1, preventDefault() { prevented = true; }, stopImmediatePropagation() {} });
 assert.equal(prevented, true);
 f.cleanup(); assert.equal(f.handlers.size, 0);
});

test('guarded dismissal snaps back; approved swipe uses its release position for the exit', () => {
 for (const allowed of [false, true]) {
  const f = fixture({ allowed });
  f.send('pointerdown', 0, 0); f.send('pointermove', 140, 100); f.send('pointerup', 140, 110);
  assert.equal(f.stats().closes, 1);
  assert.equal(f.panel.style['--park-sheet-release'], '140px');
  assert.equal(f.stats().animations, allowed ? 0 : 1);
  assert.equal(f.stats().captured, false);
  f.cleanup();
 }
});

test('desktop and saving cannot drag; reduced motion returns without animation', () => {
 const desktop = fixture({ desktop: true }); desktop.send('pointerdown', 0, 0);
 assert.equal(desktop.stats().measurements, 0); desktop.cleanup();
 const busy = fixture(); busy.handle.disabled = true; busy.send('pointerdown', 0, 0);
 assert.equal(busy.stats().measurements, 0); busy.cleanup();
 const reduced = fixture({ reduced: true }); reduced.send('pointerdown', 0, 0); reduced.send('pointermove', 30, 100); reduced.send('pointerup', 30, 200);
 assert.equal(reduced.stats().closes, 0); assert.equal(reduced.stats().animations, 0); reduced.cleanup();
});

test('mobile handle has a keyboard alternative and desktop keeps the Radix close control', () => {
 const source = readFileSync('src/components/platform/ParkFormSheet.tsx', 'utf8');
 assert.match(source, /<button type="button" data-park-sheet-handle/);
 assert.match(source, /aria-label=\{closeLabel \|\| pt\('Закрыть'\)\}/);
 assert.match(source, /touch-none/);
 assert.match(source, /onClick=\{\(\) => closeButton.current\?\.click\(\)\}/);
 assert.match(source, /DialogPrimitive.Close ref=\{closeButton\}/);
 assert.match(source, /'hidden sm:flex'/);
 assert.match(source, /requestClose.*onOpenChange\(false\)/);
});
