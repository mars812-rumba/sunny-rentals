import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { readFileSync, existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { build } from 'esbuild';

const app = resolve('apps/marketing');
const requireApp = createRequire(resolve(app, 'package.json'));
const React = requireApp('react');
const { renderToStaticMarkup } = requireApp('react-dom/server');
const bundled = await build({
  stdin: { contents: `export * from './src/content/published-blog'; export * from './src/components/article-reading'; export { ArticlesIndex } from './src/components/articles-index'; export { default as sitemap } from './src/app/sitemap';`, resolveDir: app, loader: 'tsx' },
  tsconfig: resolve(app, 'tsconfig.json'), bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react-dom', 'next/link'], loader: { '.css': 'empty' },
});
const compiled = new Module(resolve(app, 'articles-fixture.cjs'));
compiled.filename = resolve(app, 'articles-fixture.cjs');
compiled.paths = Module._nodeModulePaths(app);
compiled._compile(bundled.outputFiles[0].text, compiled.filename);
const ui = compiled.exports;
const slug = 'choose-car-rental-phuket-reviews';

for (const locale of ['ru', 'en']) {
  test(`published article ${locale}: real body, photo, checklist, contents and next action`, () => {
    const post = ui.getPublishedBlogPost(slug, locale);
    assert.ok(post);
    const html = renderToStaticMarkup(React.createElement(ui.ArticleReading, { post }));
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /choosing-a-rental-phuket\.webp/);
    assert.match(html, /class="article-reading__checklist"/);
    assert.equal((html.match(/<li><h3>/g) || []).length, 4);
    assert.match(html, new RegExp(`href="${locale === 'en' ? '/en' : ''}/cars/?"`));
    for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${anchor}"`));
    assert.match(html, /article-section-7/);
    if (locale === 'en') assert.doesNotMatch(html.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, ''), /[а-яё]/i);
    const data = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(data['@type'], 'BlogPosting');
    assert.equal(data.headline, post.title);
    assert.equal(data.inLanguage, locale);
    const index = renderToStaticMarkup(React.createElement(ui.ArticlesIndex, { locale }));
    assert.ok(index.includes(post.title));
    assert.match(index, new RegExp(`href="${ui.publishedBlogPath(slug, locale) .replace(/\/$/, '')}/?"`));
  });

  test(`published article ${locale}: canonical, real alternates and sitemap`, () => {
    const post = ui.getPublishedBlogPost(slug, locale);
    const meta = ui.articleMetadata(post);
    assert.equal(meta.alternates.canonical, ui.publishedBlogPath(slug, locale));
    assert.equal(meta.openGraph.url, 'https://sunny-rentals.online' + meta.alternates.canonical);
    assert.equal(meta.alternates.languages.en, `/en/articles/${slug}/`);
    assert.equal(meta.alternates.languages['x-default'], `/articles/${slug}/`);
    assert.equal(meta.twitter.card, 'summary_large_image');
    assert.match(meta.openGraph.images[0].url, /^https:\/\//);
    assert.equal(ui.sitemap().filter(entry => entry.url === meta.openGraph.url).length, 1);
    assert.ok(!ui.sitemap().some(entry => entry.url.includes(`/blog/${slug}`)));
  });
}

test('only public indexed articles enter the collection; untranslated articles are not fake EN pages', () => {
  const index = JSON.parse(readFileSync('public/content/blog/index.json', 'utf8'));
  assert.deepEqual(new Set(ui.loadPublishedBlogPosts('ru').map(post => post.slug)), new Set(index));
  for (const post of ui.loadPublishedBlogPosts('ru')) {
    if (post.image) assert.ok(existsSync(resolve('public', post.image.slice(1))) || existsSync(resolve(app, 'public', post.image.slice(1))));
  }
  const directory = mkdtempSync(join(tmpdir(), 'sunny-publication-test-'));
  writeFileSync(join(directory, 'index.json'), JSON.stringify(['ru-only-fixture']));
  writeFileSync(join(directory, 'ru-only-fixture.json'), JSON.stringify({ slug: 'ru-only-fixture', title: 'Русская статья', content: 'Тестовый текст', generated_at: '2026-10-18T00:00:00Z', image_url: '/missing-editorial-cover.jpg' }));
  assert.equal(ui.loadPublishedBlogPosts('ru', directory)[0].image, undefined, 'Missing local images must be omitted');
  assert.equal(ui.loadPublishedBlogPosts('en', directory).length, 0);
  writeFileSync(join(directory, 'index.json'), JSON.stringify(['../private-state']));
  assert.throws(() => ui.loadPublishedBlogPosts('ru', directory), /Invalid published article slug/);
});

for (const locale of ['ru', 'en']) {
  test(`winter guide ${locale}: seven areas, actual language switch, readable visuals and no legacy promises`, () => {
    const winterSlug = '7-luchshih-mest-dlya-zimovschikov-na-phukete';
    const post = ui.getPublishedBlogPost(winterSlug, locale);
    assert.deepEqual(post.availableLocales, ['ru', 'en']);
    assert.equal(post.updatedAt, '2026-10-18');
    assert.doesNotMatch(post.content, /600|24\/7|полной страховкой|full insurance|Фиван/);
    const names = locale === 'en' ? ['Patong', 'Kathu', 'Rawai', 'Chalong', 'Kamala', 'Surin', 'Bang Tao'] : ['Патонг', 'Кату', 'Равай', 'Чалонг', 'Камала', 'Сурин', 'Банг Тао'];
    for (const name of names) assert.ok(post.content.includes('## ' + name));
    const html = renderToStaticMarkup(React.createElement(ui.ArticleReading, { post }));
    for (const file of ['winter-coast.webp', 'winter-inland.webp', 'winter-harbour.webp']) assert.ok(html.includes(file));
    for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${anchor}"`));
    assert.match(html, new RegExp(`href="/en/articles/${winterSlug}/?"`));
    assert.match(html, /role="region" aria-label="[^"]+" tabindex="0"/);
    if (locale === 'en') assert.doesNotMatch(html.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, ''), /[а-яё]/i);
    const index = renderToStaticMarkup(React.createElement(ui.ArticlesIndex, { locale }));
    assert.ok(index.includes(post.title));
    assert.equal(ui.sitemap().filter(entry => entry.url === 'https://sunny-rentals.online' + ui.publishedBlogPath(winterSlug, locale)).length, 1);
    assert.equal(ui.articleMetadata(post).openGraph.modifiedTime, '2026-10-18');
  });
}

test('winter illustrations have exact prompts, matching public copies and a bounded WebP payload', async () => {
  const sharp = requireApp('sharp');
  for (const file of ['winter-coast.webp', 'winter-inland.webp', 'winter-harbour.webp']) {
    const bytes = readFileSync(resolve('public/images/articles', file));
    assert.ok(bytes.length < 250 * 1024);
    assert.deepEqual(bytes, readFileSync(resolve(app, 'public/images/articles', file)));
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.width, 1600);
    assert.equal(meta.height, 900);
    assert.ok(meta.exif.toString().includes('photorealistic-natural'));
  }
});

test('generated image has bounded size and exact provenance in both public roots', async () => {
  const sharp = requireApp('sharp');
  for (const path of ['public/images/articles/choosing-a-rental-phuket.webp', 'apps/marketing/public/images/articles/choosing-a-rental-phuket.webp']) {
    const bytes = readFileSync(path);
    assert.ok(bytes.length < 250 * 1024);
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.width, 1600);
    assert.equal(meta.height, 900);
    assert.ok(meta.exif.toString().includes('Use case: photorealistic-natural'));
  }
});

test('compatibility routes are preserved and release assembly cannot replace Next article HTML', () => {
  for (const route of ['(ru)/articles/[slug]', 'en/articles/[slug]', '(ru)/blog/[slug]']) assert.ok(existsSync(resolve(app, `src/app/${route}/page.tsx`)));
  const deploy = readFileSync('deploy.sh', 'utf8');
  assert.match(deploy, /if \[\[ ! -f "\$\{MARKETING_APP\}\/out\/blog\/\$\{slug\}\/index\.html" \]\]; then/);
  const css = readFileSync(resolve(app, 'src/components/article-reading.css'), 'utf8');
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /:focus-visible/);
});
