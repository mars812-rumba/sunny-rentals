import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const bundle = await build({ stdin: { contents: `
export { default as HeroBanner } from './src/components/HeroBanner';
export { LanguageProvider } from './src/contexts/LanguageContext';
`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, platform: 'node', format: 'cjs',
  external: ['react', 'react/jsx-runtime', 'react-dom'], loader: { '.webp': 'dataurl' },
});
const compiled = new Module(resolve('tests/app-hero-logo-fixture.cjs'));
compiled.filename = resolve('tests/app-hero-logo-fixture.cjs');
compiled.paths = Module._nodeModulePaths(process.cwd());
compiled._compile(bundle.outputFiles[0].text, compiled.filename);
const { HeroBanner, LanguageProvider } = compiled.exports;
const render = props => renderToStaticMarkup(React.createElement(LanguageProvider, null, React.createElement(HeroBanner, props)));

test('Sunny hero uses the existing uncropped logo instead of a photo background', () => {
  const html = render({});
  assert.match(html, /alt="Sunny Rentals"/);
  assert.match(html, /object-contain/);
  assert.match(html, /width="184" height="184"/);
  assert.doesNotMatch(html, /background-image|bg-black\/50|h-64/);
  assert.match(html, /bg-white pt-12 pb-14 sm:pb-24/);
  assert.match(html, /sunny-catalog-logo/);
});

test('subtitle is car-only and Sunny benefit badges leave no empty container', () => {
  const html = render({});
  assert.match(html, /Аренда на Пхукете/);
  assert.match(html, /Sunny Rentals — большой выбор проверенных авто/);
  assert.doesNotMatch(html, /байк/);
  for (const text of ['От 600฿', 'Оплата', 'на месте', 'в 2 клика']) assert.ok(!html.includes(text));
  assert.doesNotMatch(html, /grid-cols-3|mb-6/);
});

test('optional tenant hero keeps its own branding and existing backdrop', () => {
  const html = render({ park: { name: 'Fixture Park', minimumPrice: '900฿', logo: React.createElement('span', null, 'Park logo') } });
  assert.match(html, /Fixture Park/);
  assert.match(html, /Park logo/);
  assert.match(html, /background-image/);
  assert.doesNotMatch(html, /alt="Sunny Rentals"/);
  assert.match(html, /grid-cols-3/);
  assert.match(html, /От 900฿/);
});
