import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

const css = readFileSync('src/components/sunny-catalog.css', 'utf8');
test('logo sits directly on the gradient without a white plate or box shadow', () => {
  const logo = css.match(/\.sunny-catalog \.sunny-catalog-logo\s*\{([^}]+)\}/)[1];
  assert.match(logo, /background: transparent/);
  assert.match(logo, /box-shadow: none/);
  assert.doesNotMatch(logo, /border-radius/);
});

test('catalogue has scoped navy gradient and lightweight static depth', () => {
  assert.match(css, /--sunny-catalog-sea:/);
  assert.match(css, /--sunny-catalog-ground: #081729/);
  assert.match(css, /radial-gradient/);
  assert.match(css, /\.sunny-catalog \.sunny-rental-form/);
  assert.match(css, /\.sunny-catalog \.sunny-catalog-hero\s*\{\s*background: transparent/);
  assert.match(css, /box-shadow: var\(--sunny-catalog-depth\)/);
  assert.doesNotMatch(css, /backdrop-filter|filter:|animation:|url\(|position:\s*fixed/);
  assert.equal(transformSync(css, { loader: 'css', minify: true }).warnings.length, 0);
});

test('hero and results text have AA contrast against all dark gradient stops', () => {
  function token(name) {
    return css.match(new RegExp(`--sunny-catalog-${name}: (#[0-9a-f]{6})`))[1];
  }
  function luminance(hex) {
    const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  }
  for (const text of ['on-dark', 'muted-on-dark']) {
    for (const background of ['sea', 'sky', 'accent', 'ground']) {
      assert.ok((luminance(token(text)) + 0.05) / (luminance(token(background)) + 0.05) >= 4.5,
        `${text} against ${background}`);
    }
  }
  assert.match(css, /\.sunny-catalog \.sunny-catalog-results-title/);
  assert.match(css, /--sunny-catalog-surface: #ffffff/);
});

test('theme is attached only to public Sunny catalogue, not global body or tenant routes', () => {
  const index = readFileSync('src/pages/Index.tsx', 'utf8');
  assert.match(index, /import '@\/components\/sunny-catalog.css'/);
  assert.match(index, /className="sunny-catalog min-h-dvh pb-8"/);
  assert.doesNotMatch(css, /(?:^|\n)(?:body|html|:root)\s*\{/);
  const form = readFileSync('src/components/FilterForm.tsx', 'utf8');
  assert.match(form, /cn\('sunny-rental-form', isMobile/);
});

test('all four form dropdowns opt into portal-safe surfaces without removing focus or disabled semantics', () => {
  const form = readFileSync('src/components/FilterForm.tsx', 'utf8');
  assert.equal((form.match(/<SelectContent className="sunny-catalog-select">/g) || []).length, 4);
  assert.match(css, /-webkit-tap-highlight-color: transparent/);
  assert.match(css, /\.sunny-catalog-select\s*\{\s*background-color: #ffffff/);
  assert.match(css, /\[data-radix-select-viewport\]\s*\{\s*background-color: inherit/);
  assert.match(css, /\[data-highlighted\]/);
  assert.match(css, /min-height: 44px/);
  assert.doesNotMatch(css, /outline:\s*(?:none|0)|pointer-events:\s*none|opacity:\s*1\s*!important/);
});
