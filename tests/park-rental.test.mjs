import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle = await build({ entryPoints: ['src/lib/park-rental.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
test('days exclude return day and do not depend on DST', () => {
  assert.equal(api.rentalDays({ start: '2026-10-11', end: '2026-10-14' }), 3);
  assert.equal(api.rentalDays({ start: '2026-03-28', end: '2026-03-30' }), 2);
  assert.equal(api.rentalDays({ start: '2026-10-11', end: '2026-10-11' }), 0);
  assert.equal(api.rentalDays({ start: '2026-10-14', end: '2026-10-11' }), -3);
});
test('invalid dates are not silently normalized', () => {
  assert.ok(Number.isNaN(api.rentalDays({ start: '2026-02-30', end: '2026-03-01' })));
  assert.ok(Number.isNaN(api.rentalDays({ start: '11.10.2026', end: '2026-10-14' })));
  assert.match(api.parkToday('Asia/Bangkok'), /^\d{4}-\d{2}-\d{2}$/);
  assert.throws(() => api.parkToday('invalid-timezone'));
});
