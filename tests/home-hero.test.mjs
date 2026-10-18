import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const app = resolve('apps/marketing');
const requireApp = createRequire(resolve(app, 'package.json'));
const React = requireApp('react');
const { renderToStaticMarkup } = requireApp('react-dom/server');
const bundle = await build({
  stdin: { contents: `export { MarketingHero } from './src/components/marketing-hero'; export { MarketingHomePage } from './src/components/marketing-home-page';`, resolveDir: app, loader: 'tsx' },
  tsconfig: resolve(app, 'tsconfig.json'), bundle: true, write: false, metafile: true, platform: 'node', format: 'cjs', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react-dom', 'next/link'], loader: { '.css': 'empty' },
});
const compiled = new Module(resolve(app, 'hero-fixture.cjs'));
compiled.filename = resolve(app, 'hero-fixture.cjs');
compiled.paths = Module._nodeModulePaths(app);
compiled._compile(bundle.outputFiles[0].text, compiled.filename);

for (const locale of ['ru', 'en']) test(`home hero ${locale}: offer and booking remain, duplicate vehicle rail is gone`, () => {
  const hero = renderToStaticMarkup(React.createElement(compiled.exports.MarketingHero, { locale }));
  assert.equal((hero.match(/<h1\b/g) || []).length, 1);
  assert.match(hero, /hero-promise/);
  assert.match(hero, /booking-search--hero/);
  assert.match(hero, /<form/);
  assert.match(hero, /type="date"/);
  assert.doesNotMatch(hero, /hero-vehicle|carousel|aria-roledescription|\/images_web\//);
  const backgrounds = [...hero.matchAll(/<link rel="preload"[^>]+href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(backgrounds.sort(), ['/images/atmosphere/kata-sunset-mobile.webp', '/images/atmosphere/kata-sunset.webp']);
  const home = renderToStaticMarkup(React.createElement(compiled.exports.MarketingHomePage, { locale }));
  assert.match(home, /id="fleet"/);
  assert.match(home, /id="category-compact"/);
  assert.match(home, /id="category-suv"/);
  assert.match(home, /id="category-bikes"/);
  assert.match(home, /id="reviews"/);
  assert.doesNotMatch(home, /hero-vehicle-carousel/);
  const firstHero = home.indexOf('marketing-hero--simple');
  const firstFleet = home.indexOf('id="fleet"');
  assert.ok(firstHero >= 0 && firstFleet > firstHero);
});

test('homepage import graph does not include the removed carousel or image-blocking preloader', () => {
  assert.ok(!Object.keys(bundle.metafile.inputs).some(path => /hero-vehicle-carousel|hero-preloader/.test(path)));
});
