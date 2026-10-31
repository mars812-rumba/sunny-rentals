import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const bundle = await build({
  stdin: { contents: `export * from './shared/responsive-vehicle-image';
    export { ImageCarousel } from './src/components/CarCard';
    export { CarGallery } from './apps/marketing/src/components/car-gallery';`,
    resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  alias: { '@/lib/responsive-image': resolve('apps/marketing/src/lib/responsive-image.ts') },
  external: ['react', 'react/jsx-runtime', 'react-dom'],
  define: { 'import.meta.env': '{"VITE_API_URL":"https://api.example.test"}' },
});
const compiled = new Module(resolve('tests/vehicle-images-fixture.cjs'));
compiled.filename = resolve('tests/vehicle-images-fixture.cjs');
compiled.paths = Module._nodeModulePaths(process.cwd());
compiled._compile(bundle.outputFiles[0].text, compiled.filename);
const ui = compiled.exports;
const responsive = JSON.parse(readFileSync('shared/image-responsive-manifest.json'));
const webp = JSON.parse(readFileSync('shared/image-webp-manifest.json'));
const inventory = JSON.parse(readFileSync('backend/data/web_cars.json')).cars;
const photo = Object.values(inventory)[0].photos.main;

test('original and already-WebP references resolve identically, including remote API origins', () => {
  const url = `/images_web/${photo}`;
  assert.equal(ui.vehicleImageSrcSet(url), responsive[webp[url]]);
  assert.equal(ui.vehicleImageSrcSet(webp[url]), responsive[webp[url]]);
  assert.equal(ui.vehicleImageSrcSet(photo), responsive[webp[url]]);
  assert.ok(ui.vehicleImageSrcSet(url, 'https://api.example.test/').split(', ')
    .every(entry => entry.startsWith('https://api.example.test/images_web/')));
  for (const unknown of ['/missing.jpg', 'https://external.test/car.jpg', '/api/platform/photo/1']) {
    assert.equal(ui.vehicleImageSrcSet(unknown), undefined);
  }
});

test('all inventory photos have real decodable compressed WebPs with accurate responsive widths', async () => {
  const sharp = createRequire(resolve('apps/marketing/package.json'))('sharp');
  const photos = [...new Set(Object.values(inventory).flatMap(car => [car.photos?.main, ...car.photos?.gallery || []]).filter(Boolean))];
  let originalBytes = 0;
  let smallBytes = 0;
  let largeBytes = 0;
  for (const reference of photos) {
    const original = `/images_web/${reference}`;
    const entries = ui.vehicleImageSrcSet(original);
    assert.ok(entries, `Missing variants: ${reference}`);
    originalBytes += statSync(`public${original}`).size;
    for (const [index, entry] of entries.split(', ').entries()) {
      const [url, descriptor] = entry.split(' ');
      const path = `public${url}`;
      const decoded = await sharp(path).raw().toBuffer({ resolveWithObject: true });
      assert.equal(decoded.info.width, Number.parseInt(descriptor));
      assert.ok(decoded.info.width <= (index === 0 ? 480 : 960));
      assert.equal((await sharp(path).metadata()).format, 'webp');
    }
    const list = entries.split(', ');
    smallBytes += statSync(`public${list[0].split(' ')[0]}`).size;
    largeBytes += statSync(`public${list.at(-1).split(' ')[0]}`).size;
  }
  assert.ok(smallBytes < originalBytes * 0.25);
  assert.ok(largeBytes < originalBytes * 0.6);
  console.log(JSON.stringify({ photos: photos.length, originalBytes, smallBytes, largeBytes }));
});

test('actual /app carousel uses responsive lazy images with stable cacheable URLs', () => {
  const html = renderToStaticMarkup(React.createElement(ui.ImageCarousel, {
    photos: [photo], carName: 'Toyota', t: key => key, carId: 'test',
  }));
  assert.match(html, /srcSet="https:\/\/api.example.test\/images_web\//);
  assert.match(html, /sizes="/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /decoding="async"/);
  assert.doesNotMatch(html, /\?v=|localhost/);
});

test('marketing gallery keeps priority for first photo while using responsive WebPs', () => {
  const html = renderToStaticMarkup(React.createElement(ui.CarGallery, {
    images: [webp[`/images_web/${photo}`], '/external.jpg'], alt: 'Toyota', year: 2022,
    previousLabel: 'Previous', nextLabel: 'Next', photoLabel: 'Photo',
  }));
  assert.match(html, /srcSet="\/images_web\//);
  assert.match(html, /loading="eager"/);
  assert.match(html, /fetchPriority="high"/);
  assert.match(html, /loading="lazy"/);
});
