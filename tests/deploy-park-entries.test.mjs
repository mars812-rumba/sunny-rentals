import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('release prepares both storefront and owner HTML without running deploy', () => {
  const script = readFileSync('deploy.sh', 'utf8');
  const syntax = spawnSync('bash', ['-n', 'deploy.sh'], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
  // Run only the static park-entry block against a disposable fixture.
  // Never execute npm, production writes, symlink switching or service commands.
  const block = script.match(/if \[\[ -d "\$\{PROJECT_ROOT\}\/backend\/data-v2\/tenants" \]\]; then[\s\S]*?\nfi/)?.[0];
  assert.ok(block);
  const fixture = mkdtempSync(join(tmpdir(), 'sunny-park-entries-'));
  try {
    const release = join(fixture, 'release');
    mkdirSync(join(fixture, 'backend/data-v2/tenants/park-a'), { recursive: true });
    mkdirSync(join(fixture, 'backend/data-v2/tenants/park-b'), { recursive: true });
    mkdirSync(join(fixture, 'backend/data-v2/tenants/invalid_name'), { recursive: true });
    mkdirSync(join(release, 'legacy'), { recursive: true });
    writeFileSync(join(release, 'legacy/index.html'), '<html>Vite park application</html>');
    const result = spawnSync('bash', ['-e', '-u', '-c', block], {
      env: { ...process.env, PROJECT_ROOT: fixture, RELEASE_DIR: release }, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    for (const park of ['park-a', 'park-b']) {
      for (const suffix of ['', '/owner']) {
        assert.equal(readFileSync(join(release, `site/p/${park}${suffix}/index.html`), 'utf8'), '<html>Vite park application</html>');
      }
    }
    assert.throws(() => readFileSync(join(release, 'site/p/invalid_name/index.html')));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
