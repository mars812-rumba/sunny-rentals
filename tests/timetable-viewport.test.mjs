import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/lib/timetable-viewport.ts'], bundle: true, write: false, platform: 'node', format: 'esm' });
const { observeTimetableViewport } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('chrome hides only after the visible timetable reaches the screen top and returns on upward scrolling', () => {
 const attributes = new Map();
 let notify, watched, disconnected = false;
 globalThis.window = { IntersectionObserver: true };
 globalThis.document = { documentElement: { setAttribute: (key, value) => attributes.set(key, value), removeAttribute: key => attributes.delete(key) } };
 globalThis.IntersectionObserver = class {
  constructor(callback) { notify = callback; }
  observe(node) { watched = node; }
  disconnect() { disconnected = true; }
 };
 const sentinel = {};
 const cleanup = observeTimetableViewport(sentinel);
 assert.equal(watched, sentinel);
 const notifyBounds = (bottom, height = 1) => notify([{ boundingClientRect: { height, bottom } }]);
 notifyBounds(300); assert.equal(attributes.size, 0);
 notifyBounds(-1); assert.equal(attributes.get('data-park-timetable-immersed'), 'true');
 notifyBounds(1); assert.equal(attributes.size, 0);
 notifyBounds(-1); notifyBounds(0, 0); assert.equal(attributes.size, 0); // hidden tab
 notifyBounds(-1); cleanup(); assert.equal(attributes.size, 0); assert.equal(disconnected, true);
});

test('unsupported observer falls back to ordinary page scrolling', () => {
 globalThis.window = {};
 assert.doesNotThrow(() => observeTimetableViewport({})());
});
