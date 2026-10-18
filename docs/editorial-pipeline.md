# Article preparation stages — 18 October 2026

The running Telegram scheduler loads `scripts/seo_editorial.py` for each Sunny
generation. `generate()` now passes the researched JSON through
`scripts/editorial_pipeline.py` before returning a review-ready article. There
is no second scheduler, cron, service restart, state.json edit or automatic publish.

Sequence:

1. The existing server fetches Wordstat. The host additionally observes Google and
   Yandex autocomplete with bounded parallel requests (8s each), records date/query/
   locale and empty/unavailable states, and supplies them to the live-research writer.
   Suggestions are never labelled search volumes; failures do not invent results.
2. The host validates identity, language, sources and the existing draft contract.
3. `config/seo-visuals.json` selects a prepared thematic cover or the explicitly
   shared travel-planning fallback. Both public copies must exist, match, fit the
   image budget and have prompt/tool provenance. New API image generation is NOT
   enabled or implied; missing assets fail instead of producing invented URLs.
4. The cover and honest illustration caption are added as leading Markdown. A
   table, checklist or steps and useful section headings are required. Four actual
   internal article links are checked in the trial (generic gate permits 1–8).
5. `preview-editorial.mjs` renders the real production `ArticleReading` component
   privately, with the site's CSS and static-export image configuration. This is
   SSR-only: it does not validate client hydration or production routing.
6. `editorial_browser.py` starts a temporary loopback-only preview server, runs
   Chromium at 390×844 and 1440×1000, checks title structure, RU lang, private
   noindex, BlogPosting, catalogue CTA, image loading, local TOC targets/click and
   absence of document overflow/pageerrors. Requests outside the local preview
   are blocked. The server exposes only the HTML and allowlisted public images,
   not the private draft/report directory. It shuts down after the bounded check.
7. Only a passed report returns the enriched article to the bot for owner review.
   Failure preserves diagnostics and raises; it never publishes or silently skips
   checks. Existing scheduler retry/deduplication behavior is unchanged.

Artifacts alongside the raw response: `ready.json`, `quality-report.json` (bound
to exact ready.json SHA-256), `preview.html`, `browser-report.json`, and desktop/
mobile screenshots. The parent directory is private and files use restrictive
permissions. Checks need Node/esbuild/application dependencies plus Playwright
and Chromium; the Python runner prefers `/home/agentic-seo-venv/bin/python`.

The public JSON format is unchanged. `leadingArticleCover()` lets the public
loader derive the index/hero image and caption from the verified leading Markdown,
then removes that prefix from the prose to avoid displaying the cover twice.
This also works for old `/blog/` compatibility pages after normal app publication.
Image assets must be included in the ordinary approved application release; the
article-only publisher is not a new asset deployment service.

## Live verification hook — 18 October 2026

`deploy.sh`, also called by the existing Telegram article publisher, now runs
`scripts/editorial_live_check.py` after the release symlink switch and HTTP smoke
checks, inside its existing health/rollback boundary. No change to the bot or a
second scheduler is required. This hook takes effect when the owner releases the
updated source; adding it does not itself deploy anything.

It reads the public index, checks every RU canonical article and genuine English
translation present in the exact release export, and compares rendered article
text and image paths against that export (including editorial overlays). Chromium
at 390px and 1440px checks HTTP 200, canonical, language, one H1, loaded article
images/alt text, TOC click, CTA, page overflow and numeric/table readability after
scripts load. Only same-origin GET requests outside API/tracking endpoints are
allowed; it never submits forms. Screenshots and `live-report.json` are private
in `.local/seo-editorial/live-<release>/`. Screenshots still require editor review:
an automated pass is not a subjective readability approval.

Missing browser dependencies, stale content, broken layout or timeout fail the
release health gate; the existing deploy trap restores the previous release.
There are no automatic republishing retries or service restarts. The wrapper has
a 600-second limit, navigation has 30 seconds and image loading 10 seconds.
For growing article archives, revisit that budget rather than silently skipping
pages. A manual read-only run can use the same script with `--export PATH`,
`--output PRIVATE_PATH` and optional repeated `--slug SLUG` filters. Use the
release's exact exported HTML; do not use an unrelated local build as production
evidence. Local build comparison is useful for detecting a stale release, not
for claiming that the local build was deployed.

## Trial article

Private trial: `.local/seo-editorial/car-or-taxi-phuket/ready.json`, not a public
content entry. About 1,430 body words before the cover/caption. Uses our team voice,
scenario comparison, a checked 748 THB × 7 Toyota Yaris example, delivery/deposit
separation, four internal links and no invented taxi quotes or fuel prices.
Two RU and two EN competitor pages were fetched; primary Grab/FCDO and Sunny terms
were checked. Wordstat and actual empty autocomplete responses are saved privately.
No KD/CPC/Google rankings or localized demand volumes are fabricated.

Cover: `car-or-taxi-phuket.webp`, 1600×900, 169,262 bytes; 800px and 480px versions
also prepared (63,526 / 29,720 bytes) for later responsive consumption. Both public
roots contain identical copies. Exact built-in image_gen prompt and original
location: `docs/assets/car-or-taxi-phuket-cover.json`. It depicts travel planning,
not an actual rental transaction or particular car. Shared fallback use is recorded
as such; this is not fresh generation for every future article.

Verification: 37 tests passed (21 publication/monthly, 12 generator and 4 pipeline),
plus the trial's real Chromium checks in both viewports and four HTTP link checks.
An isolated export completed for 168 routes, with static-page timeout retries;
SEO verification passed for all 110 canonical URLs, article export checks passed,
and existing content checks passed for 150 detail/content pages and both homes.
No live deployment, backend restart or state change was performed by this task.
