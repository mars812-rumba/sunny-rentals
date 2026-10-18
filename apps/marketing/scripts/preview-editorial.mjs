import { build } from 'esbuild';
import Module, { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [draftPath, output, locale = 'ru'] = process.argv.slice(2);
if (!['ru', 'en'].includes(locale)) throw new Error('Unsupported preview locale');
if (!draftPath || !output) throw new Error('Pass private draft JSON and preview HTML destination');
const draft = JSON.parse(readFileSync(draftPath, 'utf8'));
const appRequire = createRequire(resolve(app, 'package.json'));
const React = appRequire('react');
const { renderToStaticMarkup } = appRequire('react-dom/server');
const { ImageConfigContext } = appRequire('next/dist/shared/lib/image-config-context.shared-runtime');
const { imageConfigDefault } = appRequire('next/dist/shared/lib/image-config');
const bundle = await build({
  stdin: { contents: `export { ArticleReading } from './src/components/article-reading'; export { SiteFooter } from './src/components/site-footer'; export { leadingArticleCover } from './src/content/article-cover'; export { getPublishedBlogPost } from './src/content/published-blog';`, resolveDir: app, loader: 'tsx' },
  tsconfig: resolve(app, 'tsconfig.json'), bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react-dom', 'next/link', 'next/image'], loader: { '.css': 'empty' },
});
const compiled = new Module(resolve(app, 'editorial-preview-fixture.cjs'));
compiled.filename = resolve(app, 'editorial-preview-fixture.cjs');
compiled.paths = Module._nodeModulePaths(app);
compiled._compile(bundle.outputFiles[0].text, compiled.filename);
const { ArticleReading, SiteFooter, leadingArticleCover, getPublishedBlogPost } = compiled.exports;
const cover = leadingArticleCover(draft.draft_markdown ?? '');
const post = typeof draft.draft_markdown !== 'string' ? getPublishedBlogPost(draft.slug, locale) : { slug: draft.slug, title: draft.title, description: draft.title,
  content: cover?.content ?? draft.draft_markdown, author: 'Sunny Rentals',
  publishedAt: new Date().toISOString(), locale, availableLocales: [locale],
  image: cover?.image, imageAlt: cover?.alt, imageCaption: cover?.caption };
if (!post) throw new Error('Published article not found');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const css = ['src/app/globals.css', 'src/components/article-reading.css'].map(file => readFileSync(resolve(app, file), 'utf8')).join('\n');
// Mirror next.config.ts: static export has no /_next/image optimization endpoint.
const article = React.createElement(ImageConfigContext.Provider, { value: { ...imageConfigDefault, unoptimized: true } }, React.createElement(React.Fragment, null, React.createElement(ArticleReading, { post }), React.createElement(SiteFooter, { locale })));
const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(post.title)}</title><style>${css}</style></head><body>${renderToStaticMarkup(article)}</body></html>`;
writeFileSync(output, html, { mode: 0o600 });
console.log('Private SSR preview ready');
