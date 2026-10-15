import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: `export * from './src/lib/crm-status-navigation'; export * from './src/components/admin/CRMStatusButton';`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react/jsx-runtime'] });
const compiled = new Module(resolve('tests/crm-status-navigation-fixture.cjs'));
compiled.filename = resolve('tests/crm-status-navigation-fixture.cjs');
compiled.paths = Module._nodeModulePaths(process.cwd());
compiled._compile(bundle.outputFiles[0].text, compiled.filename);
const ui = compiled.exports;

test('swipes follow the funnel, clamp at the ends and never enter or leave archive', () => {
 assert.equal(ui.adjacentCrmStatus('new', 'next'), 'in_work');
 assert.equal(ui.adjacentCrmStatus('in_work', 'next'), 'pre_booking');
 assert.equal(ui.adjacentCrmStatus('pre_booking', 'next'), 'confirmed');
 assert.equal(ui.adjacentCrmStatus('confirmed', 'next'), 'confirmed');
 assert.equal(ui.adjacentCrmStatus('new', 'previous'), 'new');
 assert.equal(ui.adjacentCrmStatus('pre_booking', 'previous'), 'in_work');
 assert.equal(ui.adjacentCrmStatus('archive', 'previous'), 'archive');
});

test('badges count unique unread chats, normalize old statuses, and clear or move the right chat', () => {
 const leads = [
  { user_id: 1, status: 'pre_booking', has_new_messages: true, message_count: 80, dialog: { has_new_messages: false } },
  { user_id: '1', status: 'pre_booking', has_new_messages: true },
  { user_id: 2, status: 'confirmed', dialog_status: { has_new_messages: true } },
  { user_id: 3, status: 'in_progress', has_new_messages: false, dialog: { has_new_messages: true } },
  { user_id: 4, status: 'pending', has_new_messages: true },
  { user_id: 5, status: 'new', has_new_messages: true, archived: true },
  { user_id: 6, status: 'new', has_new_messages: true },
 ];
 const original = JSON.stringify(leads);
 assert.deepEqual(ui.crmUnreadByStatus(leads), { new: 1, in_work: 0, pre_booking: 2, confirmed: 1, archive: 0 });
 const cleared = leads.map(lead => ui.clearCrmLeadUnread(lead, '1'));
 assert.equal(ui.crmUnreadByStatus(cleared).pre_booking, 1);
 const moved = cleared.map(lead => lead.user_id === 4 ? { ...lead, status: 'confirmed' } : lead);
 assert.equal(ui.crmUnreadByStatus(moved).pre_booking, 0);
 assert.equal(ui.crmUnreadByStatus(moved).confirmed, 2);
 assert.equal(JSON.stringify(leads), original);
 const normalized = ui.normalizeCrmLead({ user_id: 1, has_new_messages: true, claude_status: 'active', dialog: { claude_status: 'stopped' } });
 assert.equal(normalized.dialog_status.claude_status, 'active');
});

test('status buttons remain keyboard accessible; unread is distinct from total and does not blink', () => {
 const props = { label: 'PBOOK', count: 20, unread: 3, active: true, onSelect() {} };
 const html = renderToStaticMarkup(React.createElement(ui.CRMStatusButton, props));
 assert.match(html, /<button type="button"/);
 assert.match(html, /aria-pressed="true"/);
 assert.match(html, /PBOOK: лидов 20, чатов с непрочитанными 3/);
 assert.match(html, /bg-red-700/);
 assert.doesNotMatch(html, /animate-|blink/);
 const zero = renderToStaticMarkup(React.createElement(ui.CRMStatusButton, { ...props, unread: 0 }));
 assert.doesNotMatch(zero, /bg-red-700/);
 const many = renderToStaticMarkup(React.createElement(ui.CRMStatusButton, { ...props, unread: 101 }));
 assert.match(many, /99\+/); assert.match(many, /непрочитанными 101/);
});

function gestureFixture({ blocked = false, nested = false } = {}) {
 globalThis.window = { innerWidth: 400 };
 globalThis.getComputedStyle = () => ({ overflowX: 'auto' });
 class ElementMock { closest() { return blocked ? this : null; } }
 globalThis.Element = ElementMock;
 const target = new ElementMock();
 target.scrollWidth = nested ? 200 : 0; target.clientWidth = 100;
 const handlers = new Map(), directions = [];
 const node = { addEventListener: (key, fn) => handlers.set(key, fn), removeEventListener: key => handlers.delete(key) };
 target.parentElement = node;
 const cleanup = ui.attachCrmStatusSwipes(node, value => directions.push(value));
 const send = (type, x, y = 100, time = 100, extra = {}) => handlers.get(type)?.({ target, pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, timeStamp: time, ...extra });
 return { handlers, directions, send, cleanup };
}

test('intentional horizontal touch switches; a swipe never also activates a lead', () => {
 const f = gestureFixture();
 f.send('pointerdown', 220, 100, 0); f.send('pointermove', 100, 105, 100); f.send('pointerup', 100, 105, 150);
 assert.deepEqual(f.directions, ['next']);
 let suppressed = false;
 f.handlers.get('click')({ detail: 1, preventDefault() { suppressed = true; }, stopImmediatePropagation() {} });
 assert.equal(suppressed, true);
 f.send('pointerdown', 100, 100, 200); f.send('pointerup', 220, 100, 350);
 assert.deepEqual(f.directions, ['next', 'previous']);
 f.cleanup(); assert.equal(f.handlers.size, 0);
});

test('scrolls, small taps, canceled/long gestures, controls, browser edges and nested scrollers do not switch', () => {
 for (const kind of ['vertical', 'short', 'cancel', 'slow', 'blocked', 'nested', 'edge', 'mouse']) {
  const f = gestureFixture({ blocked: kind === 'blocked', nested: kind === 'nested' });
  const extra = { pointerType: kind === 'mouse' ? 'mouse' : 'touch' };
  f.send('pointerdown', kind === 'edge' ? 5 : 220, 100, 0, extra);
  f.send('pointermove', kind === 'short' ? 215 : 100, kind === 'vertical' ? 300 : 100, 100);
  f.send(kind === 'cancel' ? 'pointercancel' : 'pointerup', kind === 'short' ? 215 : 100, kind === 'vertical' ? 300 : 100, kind === 'slow' ? 1500 : 200);
  assert.deepEqual(f.directions, [], kind); f.cleanup();
 }
});

test('CRM refreshes every tab, updates both unread stores, and aborts obsolete tab loads', () => {
 const source = readFileSync('src/pages/CRMPage.tsx', 'utf8');
 assert.match(source, /touchAction: 'pan-y pinch-zoom'/);
 assert.match(source, /setAllUsers\(prev => prev.map\(user => clearCrmLeadUnread/);
 assert.match(source, /mainController.current\?\.abort\(\)/);
 assert.match(source, /scope !== mainController.current/);
 assert.match(source, /setAllUsers\(fresh\)/);
 assert.match(source, /unread=\{unreadCounts\[key\]/);
 assert.doesNotMatch(source, /if \(users.length === 0\) return/);
});
