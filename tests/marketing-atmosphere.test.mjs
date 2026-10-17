import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const app = resolve('apps/marketing');
const sharp = createRequire(resolve(app, 'package.json'))('sharp');
const css = readFileSync(resolve(app, 'src/app/globals.css'), 'utf8');

for (const name of ['kata-sunset', 'phuket-waves', 'phuket-palms']) {
  for (const mobile of [false, true]) {
    test(`${name} ${mobile ? 'mobile' : 'desktop'}: WebP, budget, dimensions and provenance`, async () => {
      const filename = `${name}${mobile ? '-mobile' : ''}.webp`;
      const path = resolve(app, 'public/images/atmosphere', filename);
      const meta = await sharp(path).metadata();
      assert.equal(meta.format, 'webp');
      assert.ok(statSync(path).size <= 250 * 1024);
      assert.equal(meta.width, mobile ? 800 : name === 'kata-sunset' ? 1920 : 1600);
      assert.equal(meta.height, mobile ? 1200 : name === 'kata-sunset' ? 1080 : 900);
      assert.ok(meta.exif?.toString('utf8').includes('AI-generated'));
      assert.ok(css.includes(`/images/atmosphere/${filename}`));
    });
  }
}

test('all home backdrop declarations use the new sunset, with responsive preloads', () => {
  for (const [, block] of css.matchAll(/\.marketing-hero__backdrop\s*\{([^}]+)\}/g)) {
    assert.match(block, /background: var\(--sunny-sunset-background\)/);
    assert.doesNotMatch(block, /hero_bg|rgba\(2, 22, 37/);
  }
  const hero = readFileSync(resolve(app, 'src/components/marketing-hero.tsx'), 'utf8');
  assert.match(hero, /kata-sunset\.webp" media="\(min-width: 701px\)"/);
  assert.match(hero, /kata-sunset-mobile\.webp" media="\(max-width: 700px\)"/);
  assert.match(css, /\.catalog-hero\s*\{[^}]+--sunny-waves-background/);
  assert.match(css, /\.trust-page__hero\s*\{[^}]+--sunny-palms-background/);
  assert.match(readFileSync(resolve(app, 'src/components/articles-index.css'), 'utf8'), /--sunny-waves-background/);
  assert.match(readFileSync(resolve(app, 'src/components/monthly-rental.css'), 'utf8'), /--sunny-palms-background/);
});

test('neutral overlays keep white text above 4.5:1 even over pure white pixels', () => {
  const luminance = (rgb) => rgb.map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i], 0);
  for (const [base, alpha] of [[[16, 17, 14], 0.62], [[16, 23, 20], 0.68], [[20, 22, 16], 0.68]]) {
    const backdrop = base.map(value => value * alpha + 255 * (1 - alpha));
    assert.ok(1.05 / (luminance(backdrop) + 0.05) >= 4.5);
  }
});
