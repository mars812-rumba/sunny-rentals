import { test } from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { build } from 'esbuild';

const app = resolve('apps/marketing');
const requireApp = createRequire(resolve(app, 'package.json'));
const React = requireApp('react');
const { renderToStaticMarkup } = requireApp('react-dom/server');
const bundle = await build({
  stdin: { contents: `export { TrustPageLanding, createTrustPageMetadata } from './src/components/trust-page-landing';
    export { contentPages, getContentPage } from './src/content/content-pages';
    export { getCarsByCategory } from './src/content/cars';
    export { ArticlesIndex, createArticlesMetadata } from './src/components/articles-index';
    export { getArticles } from './src/content/articles';
    export { default as sitemap } from './src/app/sitemap';`, resolveDir: app, loader: 'tsx' },
  tsconfig: resolve(app, 'tsconfig.json'), bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react-dom', 'next/link'],
  loader: { '.css': 'empty' },
});
const compiled = new Module(resolve(app, 'monthly-rental-fixture.cjs'));
compiled.filename = resolve(app, 'monthly-rental-fixture.cjs');
compiled.paths = Module._nodeModulePaths(app);
compiled._compile(bundle.outputFiles[0].text, compiled.filename);
const ui = compiled.exports;
const slug = 'long-term-car-rental-phuket';

for (const locale of ['ru', 'en']) {
  test(`monthly page: ${locale} content, semantic tables, real photos and working anchors`, () => {
    const page = ui.getContentPage(slug, locale);
    assert.equal(ui.contentPages.filter(pair => pair[locale].slug === slug).length, 1);
    assert.equal(page.updatedAt, '2026-10-17');
    const editorial = JSON.stringify([page.title, page.intro, page.sections, page.faq]);
    assert.doesNotMatch(editorial, /подмен|замен[аыуе]|обслужив|при[её]мк|replacement|substitut|servicing|maintenance/i);
    assert.match(editorial, /30\+/);
    assert.match(editorial, /28, 30/);
    const html = renderToStaticMarkup(React.createElement(ui.TrustPageLanding, { page, locale }));
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.equal((html.match(/<caption>/g) || []).length, 2);
    assert.match(html, /<th scope="col"/);
    assert.match(html, /<th scope="row"/);
    assert.match(html, /role="region" aria-label="[^"]+" tabindex="0"/);
    assert.ok(html.indexOf('id="section-1"') < html.indexOf('id="rental-vehicles"'));
    for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) {
      assert.ok(html.includes(`id="${anchor}"`), `Missing anchor ${anchor}`);
    }
    const image = ui.getCarsByCategory('compact')[0].image;
    assert.ok(html.includes(`src="${image}"`));
    assert.ok(existsSync(resolve('public', image.slice(1))), `Missing actual fleet photo: ${image}`);
    const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const faq = jsonLd['@graph'].find(item => item['@type'] === 'FAQPage');
    assert.equal(faq.mainEntity.length, page.faq.length);
    for (const question of page.faq) assert.ok(html.includes(question.question.replaceAll('&', '&amp;')));
    if (locale === 'en') {
      const visible = html.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, '');
      assert.doesNotMatch(visible, /[а-яё]/i);
    }
  });

  test(`monthly metadata: ${locale} canonical, alternates and absolute social image`, () => {
    const page = ui.getContentPage(slug, locale);
    const meta = ui.createTrustPageMetadata(page, locale);
    const path = `${locale === 'en' ? '/en' : ''}/${slug}/`;
    assert.equal(meta.alternates.canonical, path);
    assert.equal(meta.alternates.languages.en, `/en/${slug}/`);
    assert.equal(meta.alternates.languages.ru, `/${slug}/`);
    assert.equal(meta.openGraph.url, `https://sunny-rentals.online${path}`);
    assert.equal(meta.title, page.title);
    assert.equal(meta.description, page.description);
    assert.equal(meta.twitter.card, 'summary_large_image');
    assert.match(meta.openGraph.images[0].url, /^https:\/\/sunny-rentals.online\/images_web\//);
  });
}

for (const locale of ['ru', 'en']) {
  test(`articles index: ${locale} routes, menu, curated article and metadata`, () => {
    const path = locale === 'ru' ? '/articles/' : '/en/articles/';
    const pageFile = locale === 'ru' ? 'src/app/articles/page.tsx' : 'src/app/en/articles/page.tsx';
    assert.ok(existsSync(resolve(app, pageFile)));
    assert.deepEqual(ui.getArticles(locale).map(article => article.slug), [slug]);
    const html = renderToStaticMarkup(React.createElement(ui.ArticlesIndex, { locale }));
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.equal((html.match(/class="articles-index__entry"/g) || []).length, 1);
    // Standalone Next Link SSR does not inherit next.config's trailingSlash flag.
    assert.match(html, new RegExp(`href="${locale === 'ru' ? '' : '/en'}/${slug}/?"`));
    assert.ok([...html.matchAll(/<a\b[^>]*>/g)].some(([tag]) => tag.includes('aria-current="page"') && new RegExp(`href="${path.slice(0, -1)}/?"`).test(tag)));
    const meta = ui.createArticlesMetadata(locale);
    assert.equal(meta.alternates.canonical, path);
    assert.equal(meta.openGraph.url, `https://sunny-rentals.online${path}`);
    assert.equal(meta.alternates.languages.en, '/en/articles/');
    assert.equal(meta.alternates.languages.ru, '/articles/');
    assert.equal(ui.sitemap().filter(entry => entry.url === meta.openGraph.url).length, 1);
    if (locale === 'en') assert.doesNotMatch(html.replace(/<[^>]*>/g, ''), /[а-яё]/i);
    const article = renderToStaticMarkup(React.createElement(ui.TrustPageLanding, { page: ui.getContentPage(slug, locale), locale }));
    assert.match(article, new RegExp(`<a href="${path.slice(0, -1)}/?">${locale === 'ru' ? 'Статьи' : 'Articles'}</a>`));
  });
}

test('mobile menu has a localized articles link that closes the menu', () => {
  const source = readFileSync(resolve(app, 'src/components/site-header.tsx'), 'utf8');
  const mobileNav = source.slice(source.indexOf('<nav className="site-menu__nav"'));
  assert.match(mobileNav, /<Link href=\{localePath\(locale, "\/articles"\)\} onClick=\{closeMenu\}/);
  assert.match(mobileNav, /copy\.nav\.articles/);
  const css = readFileSync(resolve(app, 'src/components/articles-index.css'), 'utf8');
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /:focus-visible/);
});

test('monthly contents stays a labelled list of text links, separate from the fleet CTA', () => {
  const globals = readFileSync(resolve(app, 'src/app/globals.css'), 'utf8');
  assert.doesNotMatch(globals, /\.trust-page__aside\s+a\s*\{/);
  assert.match(globals, /\.trust-page__aside\s*>\s*\.trust-page__fleet-link\s*\{/);
  const css = readFileSync(resolve(app, 'src/components/monthly-rental.css'), 'utf8');
  const linkRule = css.match(/\.monthly-rental__contents a\s*\{([^}]+)\}/)?.[1];
  assert.ok(linkRule);
  assert.doesNotMatch(linkRule, /background:|border-radius:/);
  assert.match(linkRule, /min-height: 44px/);
  assert.match(linkRule, /overflow-wrap: anywhere/);
  assert.match(linkRule, /text-decoration: underline/);
  for (const locale of ['ru', 'en']) {
    const page = ui.getContentPage(slug, locale);
    const html = renderToStaticMarkup(React.createElement(ui.TrustPageLanding, { page, locale }));
    const nav = html.match(/<nav class="monthly-rental__contents"[\s\S]*?<\/nav>/)?.[0];
    assert.match(nav, /aria-labelledby="monthly-contents-title"/);
    assert.match(nav, new RegExp(`<strong id="monthly-contents-title">${locale === 'ru' ? 'Содержание статьи' : 'In this article'}</strong>`));
    assert.equal((nav.match(/<a /g) || []).length, page.sections.length);
    assert.doesNotMatch(nav, /trust-page__fleet-link/);
    assert.equal((html.match(/class="trust-page__fleet-link"/g) || []).length, 1);
  }
});

test('ordinary pages keep the existing layout and no monthly elements', () => {
  const page = ui.getContentPage('short-term-car-rental-phuket', 'ru');
  const html = renderToStaticMarkup(React.createElement(ui.TrustPageLanding, { page, locale: 'ru' }));
  assert.doesNotMatch(html, /monthly-rental__opening|rental-comparison/);
  assert.ok(html.indexOf('id="rental-vehicles"') < html.indexOf('id="section-1"'));
  const css = readFileSync(resolve(app, 'src/components/monthly-rental.css'), 'utf8');
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /:focus-visible/);
});
