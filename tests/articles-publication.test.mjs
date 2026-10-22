import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
  stdin: { contents: `export * from './src/content/published-blog'; export * from './src/components/article-reading'; export { SiteFooter } from './src/components/site-footer'; export { default as DocumentLayout } from './src/components/document-layout'; export { ArticlesIndex } from './src/components/articles-index'; export { default as sitemap } from './src/app/sitemap';`, resolveDir: app, loader: 'tsx' },
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
  test(`Krabi ${locale}: approved bilingual article, localized transparent map and real alternates`, async () => {
    const post = ui.getPublishedBlogPost('phuket-krabi-by-car', locale);
    assert.ok(post); assert.deepEqual(post.availableLocales, ['ru', 'en']);
    assert.equal((post.content.match(/^## /gm) || []).length, 7);
    assert.equal(post.image, `/images/articles/phuket-krabi-route-${locale}.webp`);
    for (const [, path] of post.content.matchAll(/\]\((\/[^)]+)\)/g)) assert.ok(locale === 'en' ? path.startsWith('/en/') : !path.startsWith('/en/'));
    if (locale === 'en') {
      assert.doesNotMatch(post.content, /[а-яё]/i);
      assert.match(post.content, /Samet Nangshe/); assert.match(post.content, /identified second party/);
      assert.match(post.content, /without prior approval/); assert.match(post.content, /limitations and exclusions/);
    } else {
      assert.match(post.content, /Самет Нангше/); assert.match(post.content, /без предварительного согласования/);
      assert.equal(createHash('sha256').update(post.content).digest('hex'), '8891dedbfd4c96ee1bf0d782f36295e76ec521068e7e7e57c1be89890720e355');
    }
    const html = renderToStaticMarkup(React.createElement(ui.ArticleReading, { post }));
    for (const prefix of ['', '/en']) assert.match(html, new RegExp(`href="${prefix}/articles/phuket-krabi-by-car/?"`));
    const meta = ui.articleMetadata(post);
    assert.equal(meta.alternates.canonical, `${locale === 'en' ? '/en' : ''}/articles/phuket-krabi-by-car/`);
    assert.ok(ui.sitemap().some(entry => entry.url === meta.openGraph.url));
    assert.ok(renderToStaticMarkup(React.createElement(ui.ArticlesIndex, { locale })).includes(post.title));
    const file = readFileSync('public' + post.image);
    assert.deepEqual(file, readFileSync(resolve(app, 'public' + post.image)));
    const info = await requireApp('sharp')(file).metadata();
    assert.equal(info.width, 1600); assert.equal(info.height, 900); assert.equal(info.hasAlpha, true);
    assert.ok(file.length < 250 * 1024); assert.ok(info.exif.toString().includes('built-in image_gen'));
  });
}

test('approved driving itinerary has a complete English page, localized links and reciprocal metadata', () => {
  const guideSlug = 'phuket-driving-itineraries';
  const post = ui.getPublishedBlogPost(guideSlug, 'en');
  assert.ok(post);
  assert.deepEqual(post.availableLocales, ['ru', 'en']);
  assert.doesNotMatch(post.content, /[а-яё]/i);
  assert.equal((post.content.match(/^## /gm) || []).length, 5);
  for (const text of ['Karon Viewpoint', 'Nai Harn', 'Promthep Cape', 'Thalang Road', 'Soi Rommani', 'Dibuk Road', '20–30 minutes', 'two to three hours', 'red flag', 'height and weight']) assert.ok(post.content.includes(text), text);
  for (const [, path] of post.content.matchAll(/\]\((\/[^)]+)\)/g)) assert.ok(path.startsWith('/en/'));
  assert.equal(post.image, '/images/articles/car-or-taxi-phuket.webp');
  const html = renderToStaticMarkup(React.createElement(ui.ArticleReading, { post }));
  assert.match(html, /href="\/articles\/phuket-driving-itineraries\/?"/);
  assert.match(html, /href="\/en\/articles\/phuket-driving-itineraries\/?"/);
  for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${anchor}"`));
  assert.ok(renderToStaticMarkup(React.createElement(ui.ArticlesIndex, { locale: 'en' })).includes(post.title));
  const meta = ui.articleMetadata(post);
  assert.equal(meta.alternates.canonical, '/en/articles/phuket-driving-itineraries/');
  assert.equal(meta.alternates.languages.ru, '/articles/phuket-driving-itineraries/');
  assert.equal(meta.openGraph.url, 'https://sunny-rentals.online/en/articles/phuket-driving-itineraries/');
  assert.equal(ui.sitemap().filter(entry => entry.url === meta.openGraph.url).length, 1);
});

for (const locale of ['ru', 'en']) {
  test(`shared public footer ${locale}: one layout footer with localized vertical navigation`, () => {
    const post = ui.getPublishedBlogPost(slug, locale);
    for (const child of [React.createElement(ui.ArticleReading, { post }), React.createElement(ui.ArticlesIndex, { locale }), React.createElement('main', null, 'Short page')]) {
      const html = renderToStaticMarkup(React.createElement(ui.DocumentLayout, { locale }, child));
      assert.equal((html.match(/<footer\b/g) || []).length, 1);
      assert.match(html, /<footer class="site-footer">/);
      const footer = html.slice(html.indexOf('<footer'));
      for (const path of ['cars', 'articles', 'rental-terms', 'insurance', 'deposit', 'delivery', 'faq']) {
        assert.match(footer, new RegExp(`href="${locale === 'en' ? '/en' : ''}/${path}/?"`));
      }
      assert.match(footer, /<ul class="site-footer__links"><li>/);
      assert.doesNotMatch(footer, /href="\/blog/);
      if (locale === 'en') assert.doesNotMatch(footer, /[а-яё]/i);
    }
  });

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
    const caption = html.match(/<figcaption>([\s\S]*?)<\/figcaption>/)?.[1] ?? '';
    assert.ok(caption.includes(post.title));
    assert.doesNotMatch(caption, /ИИ|AI-generated|generated with|с помощью/i);
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

test('bot leading cover becomes one hero and collection image without changing public JSON format', () => {
  const directory = mkdtempSync(join(tmpdir(), 'sunny-leading-cover-test-'));
  const image = '/images/articles/car-or-taxi-phuket.webp';
  writeFileSync(join(directory, 'index.json'), JSON.stringify(['leading-cover-fixture']));
  writeFileSync(join(directory, 'leading-cover-fixture.json'), JSON.stringify({
    slug: 'leading-cover-fixture', title: 'Русский черновик', generated_at: '2026-10-18T00:00:00Z',
    content: `![Карта и ключ](${image})\n\n*ИИ-иллюстрация, не реальная выдача*\n\n## Выбор транспорта\n\nПолезный текст.`,
  }));
  const post = ui.loadPublishedBlogPosts('ru', directory)[0];
  assert.equal(post.image, image);
  assert.equal(post.imageCaption, 'ИИ-иллюстрация, не реальная выдача');
  assert.ok(post.content.startsWith('## Выбор транспорта'));
  const html = renderToStaticMarkup(React.createElement(ui.ArticleReading, { post }));
  assert.equal((html.match(/<img\b[^>]*alt="Карта и ключ"/g) || []).length, 1);
});

test('car-vs-taxi cover is distinct and published seasonal copy is preserved', async () => {
  const post = ui.getPublishedBlogPost('car-or-taxi-phuket', 'ru');
  assert.ok(post);
  assert.equal(post.image, '/images/articles/car-or-taxi-phuket-vs.webp');
  assert.notEqual(post.image, ui.getPublishedBlogPost(slug, 'ru').image);
  assert.match(post.content, /низк[а-яё]* сезон[а-яё]*/i);
  const source = JSON.parse(readFileSync('public/content/blog/car-or-taxi-phuket.json', 'utf8'));
  assert.ok(source.content.endsWith(post.content));
  const photo = readFileSync('public' + post.image);
  assert.deepEqual(photo, readFileSync(resolve(app, 'public' + post.image)));
  const sharp = requireApp('sharp');
  const info = await sharp(photo).metadata();
  assert.equal(info.width, 1600);
  assert.equal(info.height, 900);
  assert.ok(photo.length < 250 * 1024);
  assert.ok(info.exif.toString().includes('photographic diptych'));
});

test('approved taxi-vs-rental guide has a complete English adaptation and genuine alternates', () => {
  const taxiSlug = 'car-or-taxi-phuket';
  const post = ui.getPublishedBlogPost(taxiSlug, 'en');
  assert.ok(post);
  assert.deepEqual(post.availableLocales, ['ru', 'en']);
  assert.doesNotMatch(post.content, /[а-яё]/i);
  assert.equal((post.content.match(/^## /gm) || []).length, 8);
  assert.match(post.content, /low season/i);
  assert.match(post.content, /high-season travel/i);
  assert.match(post.content, /18 October 2026/);
  assert.match(post.content, /7–14 days/);
  assert.match(post.content, /30\+ days in the low season/);
  for (const row of ['748 | 5 236 | 6 236 | 5 000', '954 | 6 678 | 7 678 | 5 000', '1 237 | 8 659 | 9 659 | 8 000', '1 045 | 7 315 | 8 315 | 10 000']) assert.ok(post.content.includes(row));
  assert.match(post.content, /517 baht per day/);
  assert.match(post.content, /500 baht each way/);
  assert.match(post.content, /6 236 ÷ 7 ≈ 891/);
  for (const [, path] of post.content.matchAll(/\]\((\/[^)]+)\)/g)) assert.ok(path.startsWith('/en/'));
  const html = renderToStaticMarkup(React.createElement(ui.ArticleReading, { post }));
  assert.match(html, /href="\/articles\/car-or-taxi-phuket\/?"/);
  assert.match(html, /href="\/en\/articles\/car-or-taxi-phuket\/?"/);
  assert.match(html, /car-or-taxi-phuket-vs-en\.webp/);
  assert.ok(renderToStaticMarkup(React.createElement(ui.ArticlesIndex, { locale: 'en' })).includes(post.title));
  const meta = ui.articleMetadata(post);
  assert.equal(meta.alternates.canonical, '/en/articles/car-or-taxi-phuket/');
  assert.equal(meta.alternates.languages.ru, '/articles/car-or-taxi-phuket/');
  assert.equal(meta.openGraph.url, 'https://sunny-rentals.online/en/articles/car-or-taxi-phuket/');
  assert.equal(ui.sitemap().filter(entry => entry.url === meta.openGraph.url).length, 1);
});

test('English comparison cover has localized provenance and matching public copies', async () => {
  const post = ui.getPublishedBlogPost('car-or-taxi-phuket', 'en');
  const photo = readFileSync('public' + post.image);
  assert.deepEqual(photo, readFileSync(resolve(app, 'public' + post.image)));
  const info = await requireApp('sharp')(photo).metadata();
  assert.equal(info.width, 1600);
  assert.equal(info.height, 900);
  assert.ok(photo.length < 250 * 1024);
  assert.ok(info.exif.toString().includes('text-localization'));
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
