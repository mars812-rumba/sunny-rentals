import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const bundle = await build({
  stdin: { contents: `export { ImageCarousel } from './src/components/CarCard';
    export { default as HeroBanner } from './src/components/HeroBanner';
    export { VehicleCardFrame } from './src/components/VehicleCardFrame';
    export { LanguageProvider } from './src/contexts/LanguageContext';`, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, platform: 'node', format: 'cjs',
  external: ['react', 'react/jsx-runtime', 'react-dom'],
  define: { 'import.meta.env.VITE_API_URL': '""' }, loader: { '.webp': 'dataurl' },
});
const compiled = new Module(resolve('tests/storefront-ui-fixture.cjs'));
compiled.filename = resolve('tests/storefront-ui-fixture.cjs');
compiled.paths = Module._nodeModulePaths(process.cwd());
compiled._compile(bundle.outputFiles[0].text, compiled.filename);
const ui = compiled.exports;
const e = React.createElement;

test('shared Sunny gallery accepts scoped media without a legacy image URL', () => {
  const html = renderToStaticMarkup(e(ui.ImageCarousel, {
    photos: ['first.jpg', 'second.jpg'], carName: 'Tenant Toyota', carId: 'park-a:toyota', t: () => 'Фото пока нет',
    renderPhoto: (photo, index) => e('img', { src: `/api/storefront/park-a/media/${photo}`, alt: `Toyota ${index + 1}` }),
  }));
  assert.match(html, /\/api\/storefront\/park-a\/media\/first.jpg/);
  assert.match(html, /Следующее фото: Tenant Toyota/);
  assert.doesNotMatch(html, /images_web|localhost|park-b/);
});

test('park hero has park identity and supplied price, not Sunny commercial claims', () => {
  const html = renderToStaticMarkup(e(ui.LanguageProvider, null,
    e(ui.HeroBanner, { park: { name: 'Phuket Drive', minimumPrice: '800 THB' } })));
  assert.match(html, /Phuket Drive/);
  assert.match(html, /800 THB/);
  assert.doesNotMatch(html, /Sunny Rentals|100\+ reviews|От 600|на месте|в 2 клика/);
});

test('legacy Sunny hero retains its original default copy', () => {
  const html = renderToStaticMarkup(e(ui.LanguageProvider, null, e(ui.HeroBanner)));
  assert.match(html, /Sunny Rentals/);
  assert.match(html, /Аренда на Пхукете/);
});
