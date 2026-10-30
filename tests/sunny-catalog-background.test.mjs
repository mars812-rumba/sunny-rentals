import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

const css = readFileSync('src/components/sunny-catalog.css', 'utf8');
test('catalogue has scoped sea/sun colours and lightweight static depth', () => {
  assert.match(css, /--sunny-catalog-sea:/);
  assert.match(css, /--sunny-catalog-sand:/);
  assert.match(css, /radial-gradient/);
  assert.match(css, /\.sunny-catalog \.sunny-rental-form/);
  assert.match(css, /\.sunny-catalog \.sunny-catalog-hero\s*\{\s*background: transparent/);
  assert.match(css, /box-shadow: var\(--sunny-catalog-depth\)/);
  assert.doesNotMatch(css, /backdrop-filter|filter:|animation:|url\(|position:\s*fixed/);
  assert.equal(transformSync(css, { loader: 'css', minify: true }).warnings.length, 0);
});

test('theme is attached only to public Sunny catalogue, not global body or tenant routes', () => {
  const index = readFileSync('src/pages/Index.tsx', 'utf8');
  assert.match(index, /import '@\/components\/sunny-catalog.css'/);
  assert.match(index, /className="sunny-catalog min-h-dvh pb-8"/);
  assert.doesNotMatch(css, /(?:^|\n)(?:body|html|:root)\s*\{/);
  const form = readFileSync('src/components/FilterForm.tsx', 'utf8');
  assert.match(form, /cn\('sunny-rental-form', isMobile/);
});
