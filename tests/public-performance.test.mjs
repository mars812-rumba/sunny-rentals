import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { request } from 'node:http';
import { gunzipSync } from 'node:zlib';
import { setTimeout as delay } from 'node:timers/promises';

const snippet = readFileSync('deploy/nginx.public-performance.conf', 'utf8');
test('fonts are local, licensed and identical in both public trees', () => {
  const layout = readFileSync('apps/marketing/src/components/document-layout.tsx', 'utf8');
  const css = readFileSync('apps/marketing/src/app/globals.css', 'utf8');
  assert.doesNotMatch(layout, /fonts\.googleapis|fonts\.gstatic|as="image"/);
  assert.doesNotMatch(readFileSync('apps/marketing/src/components/site-header.tsx', 'utf8'), /fetchPriority="high"/);
  assert.match(layout, /locale === "ru"/);
  for (const subset of ['latin', 'cyrillic', 'latin-ext']) {
    const path = `fonts/manrope-v20-${subset}.woff2`;
    const font = readFileSync(`apps/marketing/public/${path}`);
    assert.equal(font.subarray(0, 4).toString(), 'wOF2');
    assert.deepEqual(font, readFileSync(`public/${path}`));
    assert.match(css, new RegExp(path.replaceAll('.', '\\.')));
  }
  assert.match(readFileSync('apps/marketing/public/fonts/OFL-Manrope.txt', 'utf8'), /SIL OPEN FONT LICENSE/);
});

test('hero preload and CSS use the same smaller versioned artwork', () => {
  const css = readFileSync('apps/marketing/src/app/globals.css', 'utf8');
  for (const mobile of [false, true]) {
    const file = `images/atmosphere/kata-sunset-hero${mobile ? '-mobile' : ''}.webp`;
    const original = readFileSync(`apps/marketing/public/images/atmosphere/kata-sunset${mobile ? '-mobile' : ''}.webp`);
    const compressed = readFileSync(`apps/marketing/public/${file}`);
    assert.ok(compressed.length < original.length);
    assert.deepEqual(compressed, readFileSync(`public/${file}`));
    assert.ok(css.includes(file));
  }
});

test('isolated nginx serves gzip + safe caching without changing production', async t => {
  if (spawnSync('nginx', ['-v']).error?.code === 'ENOENT') return t.skip('nginx unavailable');
  const dir = mkdtempSync(join(tmpdir(), 'sunny-performance-'));
  let child;
  const get = (port, path, encoding = 'gzip') => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, headers: { 'Accept-Encoding': encoding } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject); req.end();
  });
  try {
    const probe = createServer();
    await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    for (const path of ['_next/static/chunks', 'fonts', 'images/atmosphere']) mkdirSync(join(dir, path), { recursive: true });
    const css = '.fixture{color:red;background:white}\n'.repeat(300);
    const js = 'window.fixture = true;\n'.repeat(300);
    writeFileSync(join(dir, '_next/static/chunks/test.css'), css);
    writeFileSync(join(dir, '_next/static/chunks/test.js'), js);
    writeFileSync(join(dir, 'fonts/test.woff2'), 'font fixture');
    writeFileSync(join(dir, 'images/atmosphere/test.webp'), 'image fixture');
    writeFileSync(join(dir, 'index.html'), '<h1>Public home</h1>');
    const routes = snippet.replaceAll('/home/sunny-rentals/dist', dir);
    const config = join(dir, 'nginx.conf');
    writeFileSync(config, `error_log stderr; pid ${dir}/nginx.pid; events {} http { include /etc/nginx/mime.types; access_log off; server { listen 127.0.0.1:${port}; ${routes} location / { root ${dir}; try_files $uri $uri/ =404; } } }`);
    const syntax = spawnSync('nginx', ['-t', '-p', dir, '-c', config], { encoding: 'utf8' });
    assert.equal(syntax.status, 0, syntax.stderr);
    child = spawn('nginx', ['-p', dir, '-c', config, '-g', 'daemon off; master_process off;'], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = ''; child.stderr.on('data', b => { stderr += b; });
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try { await get(port, '/'); ready = true; break; } catch { await delay(50); }
    }
    assert.ok(ready, stderr);
    for (const [path, expected] of [['test.css', css], ['test.js', js]]) {
      const zipped = await get(port, `/_next/static/chunks/${path}`);
      assert.equal(zipped.status, 200);
      assert.equal(zipped.headers['content-encoding'], 'gzip');
      assert.match(zipped.headers.vary, /Accept-Encoding/);
      assert.equal(zipped.headers['cache-control'], 'public, max-age=31536000, immutable');
      assert.equal(gunzipSync(zipped.body).toString(), expected);
      const plain = await get(port, `/_next/static/chunks/${path}`, 'identity');
      assert.equal(plain.headers['content-encoding'], undefined);
      assert.equal(plain.body.toString(), expected);
    }
    for (const path of ['/fonts/test.woff2', '/images/atmosphere/test.webp']) {
      const response = await get(port, path);
      assert.equal(response.headers['cache-control'], 'public, max-age=604800');
    }
    const missing = await get(port, '/_next/static/chunks/missing.css');
    assert.equal(missing.status, 404);
    assert.equal(missing.headers['cache-control'], undefined);
    const home = await get(port, '/');
    assert.equal(home.headers['cache-control'], undefined);
    assert.doesNotMatch(snippet, /location.*(?:api|admin|owner)|proxy_pass|listen |ssl_certificate/);
  } finally {
    if (child && child.exitCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve));
      child.kill('SIGTERM'); await exited;
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
