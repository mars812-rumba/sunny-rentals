import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const app = resolve('apps/marketing');
const requireApp = createRequire(resolve(app, 'package.json'));
const React = requireApp('react');
const { renderToStaticMarkup } = requireApp('react-dom/server');
const bundle = await build({
  stdin: { contents: `export * from './src/content/customer-reviews'; export * from './src/components/customer-reviews';`, resolveDir: app, loader: 'tsx' },
  tsconfig: resolve(app, 'tsconfig.json'), bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'], loader: { '.css': 'empty' },
});
const compiled = new Module(resolve(app, 'reviews-fixture.cjs'));
compiled.filename = resolve(app, 'reviews-fixture.cjs');
compiled.paths = Module._nodeModulePaths(app);
compiled._compile(bundle.outputFiles[0].text, compiled.filename);
const { customerReviews, customerReviewVideo, CustomerReviews } = compiled.exports;

test('migration preserves the seven customer quotes and excludes the team reply and invented ratings', () => {
  const legacy = readFileSync('src/components/site/ReviewsSection.tsx', 'utf8');
  assert.deepEqual(customerReviews.map(r => r.id), ['5228', '2848', '2515', '2336', '2284', '2281', '2280']);
  for (const review of customerReviews) {
    assert.ok(legacy.includes(review.ru));
    assert.ok(legacy.includes('https://t.me/carbook_in_phuket/' + review.id));
    assert.ok(review.en.length > 20);
    assert.equal(review.rating, undefined);
  }
});

for (const locale of ['ru', 'en']) test(`reviews ${locale}: server-visible quote, original links, accessible controls and click-only video`, () => {
  const html = renderToStaticMarkup(React.createElement(CustomerReviews, { locale }));
  assert.match(html, /id="reviews"/);
  assert.match(html, /<blockquote>/);
  assert.equal((html.match(/<figure hidden=""/g) || []).length, 6);
  assert.equal((html.match(/https:\/\/t.me\/carbook_in_phuket\//g) || []).length, 7);
  assert.doesNotMatch(html, /4814|Спасибо за доверие|AggregateRating|ratingValue/);
  assert.equal((html.match(/aria-controls="customer-review-quotes"/g) || []).length, 2);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<button[^>]+aria-label=/);
  assert.match(html, /loading="lazy"/);
  assert.doesNotMatch(html, /<video|<iframe|\.mp4/);
  assert.ok(html.includes(customerReviewVideo.instagram));
  if (locale === 'en') {
    assert.match(html, /Translated from Russian/);
    assert.match(html, /Video in Russian/);
    assert.doesNotMatch(html, /[а-яё]/i);
  }
});

test('public video and poster are unchanged copies of the existing customer media', () => {
  for (const [old, path] of [['src/assets/video_review.mp4', customerReviewVideo.src], ['src/assets/video_preview.webp', customerReviewVideo.poster]]) {
    const source = readFileSync(old);
    for (const root of ['public', 'apps/marketing/public']) assert.deepEqual(readFileSync(root + path), source);
  }
  assert.match(readFileSync('apps/marketing/src/components/marketing-home-page.tsx', 'utf8'), /<CustomerReviews locale=\{locale\} \/>/);
});
