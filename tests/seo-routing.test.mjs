import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';

test('nginx public 404s preserve explicit static and legacy routes', async (t) => {
  const nginx = '/usr/sbin/nginx';
  const probe = spawnSync(nginx, ['-v']);
  if (probe.error?.code === 'ENOENT') return t.skip('nginx is not installed');
  const directory = mkdtempSync(join(tmpdir(), 'sunny-routing-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const site = join(directory, 'site');
  const entries = {
    'index.html': 'marketing home', '404.html': 'page not found',
    'en/index.html': 'English home', 'cars/model/index.html': 'model page',
    'articles/guide/index.html': 'article page', 'blog/guide/index.html': 'article compatibility',
    'offers/deal/index.html': 'published offer', 'app/index.html': 'legacy application',
    'p/index.html': 'park application', 'owner/index.html': 'owner application',
    'admin/app/index.html': 'admin application',
  };
  for (const [path, body] of Object.entries(entries)) {
    const file = join(site, path);
    mkdirSync(resolve(file, '..'), { recursive: true });
    writeFileSync(file, body);
  }
  const portProbe = createServer();
  portProbe.listen(0, '127.0.0.1');
  await once(portProbe, 'listening');
  const port = portProbe.address().port;
  await new Promise(resolve => portProbe.close(resolve));
  const routes = readFileSync('deploy/nginx.public-static-routes.conf', 'utf8')
    .replaceAll('/home/sunny-rentals/dist', site);
  const config = join(directory, 'nginx.conf');
  writeFileSync(config, `master_process off;
pid ${directory}/nginx.pid;
error_log ${directory}/error.log;
events {}
http { access_log off; server { listen 127.0.0.1:${port}; ${routes} } }`);
  const syntax = spawnSync(nginx, ['-t', '-p', directory, '-c', config], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
  const server = spawn(nginx, ['-p', directory, '-c', config, '-g', 'daemon off;']);
  t.after(async () => { if (server.exitCode === null) { server.kill('SIGTERM'); await once(server, 'exit'); } });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { await fetch(base, { signal: AbortSignal.timeout(1000) }); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 50)); }
  }
  assert.ok(ready, 'isolated nginx did not start');
  for (const path of ['/missing/', '/en/missing/', '/cars/missing/', '/articles/missing/', '/blog/missing/', '/offers/missing/', '/missing.webp']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 404, path);
    assert.equal(await response.text(), 'page not found', path);
  }
  for (const [path, body] of Object.entries({
    '/': 'marketing home', '/en/': 'English home', '/cars/model/': 'model page',
    '/articles/guide/': 'article page', '/blog/guide/': 'article compatibility',
    '/offers/deal/': 'published offer', '/app/deep-link': 'legacy application',
    '/admin/app/': 'admin application', '/platform-admin/': 'legacy application',
    '/p/new-park': 'park application', '/owner/new-park': 'owner application',
  })) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.equal(await response.text(), body, path);
  }
});
