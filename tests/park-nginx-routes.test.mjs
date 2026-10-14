import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const routes = readFileSync('deploy/nginx.park-routes.conf', 'utf8');

test('all tenant paths use shared SPA entries instead of the marketing fallback', () => {
 for (const [prefix, entry] of [['p', '/p/index.html'], ['owner', '/owner/index.html']]) {
  const block = routes.match(new RegExp(`location \\^~ /${prefix}/ \\{([^]*?)\\}`))?.[1];
  assert.ok(block);
  assert.ok(block.includes(`try_files ${entry} =404;`));
  assert.match(block, /root \/home\/sunny-rentals\/dist;/);
  assert.match(block, /noindex, nofollow/);
  assert.match(block, /private, no-store/);
  assert.match(block, /no-referrer/);
  assert.doesNotMatch(block, /\$uri|tenant_id|ar-rentals|phuket-drive|return 30/);
 }
 assert.equal((routes.match(/location /g) || []).length, 2);
 assert.doesNotMatch(routes, /proxy_pass|listen |server_name|ssl_certificate/);
});

test('nginx parses the isolated park routing fragment without modifying production', t => {
 const available = spawnSync('nginx', ['-v'], { encoding: 'utf8' });
 if (available.error?.code === 'ENOENT') return t.skip('nginx is not installed');
 const fixture = mkdtempSync(join(tmpdir(), 'sunny-park-nginx-'));
 try {
  const config = join(fixture, 'nginx.conf');
  writeFileSync(config, `error_log stderr; pid ${fixture}/nginx.pid; events {} http { access_log off; server { listen 127.0.0.1:18089; ${routes} } }`);
  const result = spawnSync('nginx', ['-t', '-p', fixture, '-c', config], { encoding: 'utf8' });
  assert.match(result.stderr, /syntax is ok/);
  if (result.status !== 0 && /socket\(\).*failed \(1: Operation not permitted\)/.test(result.stderr)) {
   t.diagnostic('Syntax accepted; full nginx -t is blocked by the sandbox socket restriction. Revalidate on the server before activation.');
   return;
  }
  assert.equal(result.status, 0, result.stderr);
 } finally {
  rmSync(fixture, { recursive: true, force: true });
 }
});
