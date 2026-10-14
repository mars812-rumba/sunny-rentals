import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import Module from 'node:module';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const bundle = await build({ entryPoints: ['src/components/platform/PlatformTenantActions.tsx'], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react/jsx-runtime', 'react-dom'], define: { 'import.meta.env.VITE_API_URL': '""' } });
const compiled = new Module(resolve('tests/platform-tenant-actions-fixture.cjs'));
compiled.filename = resolve('tests/platform-tenant-actions-fixture.cjs');
compiled.paths = Module._nodeModulePaths(process.cwd());
compiled._compile(bundle.outputFiles[0].text, compiled.filename);
const { PlatformTenantActions } = compiled.exports;

test('draft and published parks have explicit publication and deletion buttons', () => {
 for (const status of ['draft', 'trial', 'active']) {
  const html = renderToStaticMarkup(React.createElement(PlatformTenantActions, { tenant: { tenant_id: 'ar-rentals', name: 'AR Rentals', status }, onArchived() {}, onChanged() {} }));
  assert.match(html, /Удалить парк/);
  assert.match(html, status === 'draft' ? /Опубликовать</ : /Опубликовать заново/);
  assert.match(html, /type="button"/);
  assert.match(html, /aria-hidden="true"/);
 }
});

test('archive confirmation, failure reporting and admin-only wiring are preserved', () => {
 const source = readFileSync('src/components/platform/PlatformTenantActions.tsx', 'utf8');
 assert.match(source, /<AlertDialog open=\{!!action\}/);
 assert.match(source, /event.preventDefault\(\); void submit\(\)/);
 assert.match(source, /role="alert"/);
 assert.match(source, /Машины, брони и история сохранятся/);
 assert.match(source, /await archivePlatformTenant\(tenant.tenant_id\); onArchived\(\)/);
 assert.match(source, /Срок триала, машины и брони не изменятся/);
 const workspace = readFileSync('src/components/platform/PlatformTenantWorkspace.tsx', 'utf8');
 assert.match(workspace, /!owner && onArchived &&/);
 const admin = readFileSync('src/pages/PlatformAdminPage.tsx', 'utf8');
 assert.match(admin, /<PlatformTenantActions tenant=\{tenant\} hidePublish onArchived=\{onArchived\}/);
 assert.match(admin, /setTenants\(current => current.filter/);
});
