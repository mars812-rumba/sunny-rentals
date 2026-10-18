# Articles publication and visual reading surface

## Direction contract

THESIS: one discoverable article collection, not two disconnected lists. Mode: Read.
OWN-WORLD: preserve Sunny's coastal photography, sand reading surface, Manrope,
ocean link colors, existing header/footer and 12–16px image corners. No redesign.
STORY: find a guide from Articles, understand its practical advice and continue to
the fleet or rental terms. Never mistake a Russian article for a translation.
FIRST VIEWPORT: back-to-articles link, one readable title, author/date/read time,
then a full-width thematic photograph. Below it, narrow contents beside the reading
column; on phones the contents sit above it. Reviews have a four-step checklist.
FORM: code-led local extension of the existing Articles index; no new visual world,
no concept seed. The photo is illustrative, never evidence of an actual transaction.
FINISH: source review and this surface record capture the local extension; every
new shipping raster carries provenance. No global DESIGN.md, PRODUCT.md or design
sidecar is created or changed for this task.

## Source of truth and URLs

The active bot publishes public JSON to `public/content/blog/` and updates its
index. `published-blog.ts` reads that index at build time; it never reads private
editorial state. Every indexed RU article is listed at `/articles/` and rendered
as static HTML at `/articles/<slug>/`. Already-shared `/blog/<slug>/` URLs render
the same guide with a canonical pointing to `/articles/<slug>/`.

`deploy.sh` must preserve the Next-rendered compatibility pages instead of
overwriting them with the legacy SPA shell. No deploy is executed in this task.
The bot can keep its current public JSON format and old links; no bot restart
or external bot-code modification is required for this integration.

The reviews guide has an explicit full English translation in `blog-editorial.ts`
and a genuine `/en/articles/<slug>/` page. Hreflang and language switching only
point to translations that actually exist. Other Russian-only guides are explicitly
labelled in the English collection and link to the Russian page; no fake EN clone.
New publications automatically enter the RU collection after the normal release;
English versions and individually generated covers still require explicit assets.

## Visual assets

`choosing-a-rental-phuket.webp`: built-in image generation, compressed to WebP,
1600 × 900. Exact prompt: `docs/assets/article-reviews-cover.json`, also embedded
in EXIF. Preparation: `apps/marketing/scripts/prepare-article-cover.mjs`.
The cover ships in both public asset trees because Next and the legacy build
have separate public roots. The visible caption declares its illustrative origin.

The checklist uses semantic HTML, not text baked into a picture: it stays readable,
selectable, translated and responsive. Real car photos remain real inventory assets.
Markdown raw HTML is skipped; GFM tables scroll inside their own labelled region.

## Verification boundary

Use unit/SSR tests and an isolated export, not the root `npm run build` command
(which deploys). Confirm published-body HTML, index links, canonical/hreflang,
legacy compatibility, image budget and matching checklist anchors.
No production content, running service, live state, commit or push is changed here.

## Checked inheritance and finishing evidence

Source inspection confirms inheritance from `apps/marketing/src/app/globals.css`:
the effective body rule uses Manrope first (loaded by `app/layout.tsx`), the shared
shell is capped at 1180px with 1rem side gutters, and article surfaces use
`--sand-50`, `--ocean-950`, `--ocean-700` and `--line`. The index hero reuses
`--sunny-waves-background`. The shared `SiteHeader` supplies the existing logo,
navigation, language controls and mobile menu; the article footer reuses existing
footer styling. These are observed inheritance points, not newly declared brand
rules. Later global overrides govern the effective header and body styling.

`articles-index.css` preserves the photo-and-copy collection layout and switches
to one column at 700px. `article-reading.css` adds a local 16:9 cover, sticky
contents beside the prose, stacked contents at 800px, and a four-step checklist
that changes from two columns to one at 500px. These widths, prose measures and
checklist composition belong to this reading surface, not the whole site.
Both stylesheets provide visible keyboard focus rules; the source uses a labelled,
keyboard-focusable scrolling region for wide tables.

The new cover is present in both public roots at 141,460 bytes each. Its recorded
dimensions are 1600 × 900; the image regression checks dimensions, a 250 KiB budget
and embedded prompt provenance. The prompt and origin are also recorded in
`docs/assets/article-reviews-cover.json`. Source review confirms the localized
illustration caption, genuine English article body and semantic four-item list.

Verification passed: 17 publication/monthly tests and 11 Python editorial tests,
plus a final isolated export of 167 routes. The new article-export check verifies
both public RU guides, their compatibility pages, the full English reviews guide,
collection links and shipped cover. Existing content checks passed for 150 detail
pages and both homepages; SEO checks passed for 109 canonical URLs. Article
alternates include RU x-default and only real translations; the SEO checker now
also rejects declared alternates pointing to absent HTML. Existing bilingual
marketing pages retain their RU/EN requirements.
The finish review found an absent legacy winter cover: the loader now checks
local asset existence and omits missing covers; the regression covers this case.
The final export includes that fix. No browser or screenshot evidence was available, so
desktop/mobile appearance and interaction are not visually approved here.

The Impeccable context launcher was unavailable in the main task. Existing source
provided the identity evidence; this does not establish global design-document
freshness. No design-system drift repair is included. New public RU JSON entries
join the collection on the next release; complete English translations and newly
generated covers remain explicit editorial work rather than automated output.

## Shared public footer — 18 October 2026

`SiteFooter` is now mounted once in `DocumentLayout` for both Russian and English
marketing routes, including articles, collections, catalogue/detail, trust pages
and homepages. Four page-specific footer fragments have been removed, preventing
missing or duplicate navigation. The existing forest/sand brand palette remains;
menu items are semantic vertical lists at all widths, with 32px minimum link
targets and visible keyboard focus. Desktop has brand/navigation/contact columns;
mobile stacks them. The footer stays in document flow, not fixed over content.
The legacy public Footer keeps its existing vertical lists and now links to the
current `/articles/` collection and real rental-policy pages, not broken local
section anchors. Operational/admin/tenant screens are intentionally untouched.

Owner's density refinement: links are 14px without underlines, with 32px rows and
no inter-item gap; footer padding is 32px, mobile group gaps 24px. Contact headings
are 16px. Keyboard focus and hover color remain visible, and the lists stay vertical.

The private editorial preview also renders the shared footer, matching the new
layout composition. Verification: 24 publication/monthly tests, scoped ESLint
with no errors, isolated TypeScript check and real local Next/Chromium checks at
390px and 1440px for representative public RU/EN routes. Reports and screenshots
are under `.local/footer-qa/`; this is local verification, not a deployed change.

## Article visual refresh — 18 October 2026

Owner feedback supersedes the earlier visible AI-caption policy below: article
covers now use a short localized reference to the article title. Exact generation
prompts and origin remain in technical provenance and image EXIF, not repeated
under every cover. The car-versus-taxi guide has a distinct comparison cover,
with taxi and rental sides rather than the reviews guide's cafe/key composition.
Its prompt is in `docs/assets/car-or-taxi-phuket-vs-cover.json`; 1600, 800 and
480-pixel WebP copies ship in both public roots (174,808 / 69,280 / 32,764 bytes).

Impeccable-informed reading fixes keep the existing Sunny visual identity:
14px table text, smaller cell padding, normal word wrapping, unbroken numeric
amounts and keyboard-accessible local horizontal scrolling. The visible scroll
hint is localized. The published article's prose, humor, prices and low-season
caveat are unchanged. The editorial profile and memory record these preferences;
the pipeline can safely replace a recognized leading cover without changing prose.

Verification: 22 Node publication/monthly tests; 5 pipeline and 12 editorial Python
tests; isolated Next export and checks for 111 canonical URLs, three RU guides,
real English translations, 150 content/detail pages and both homepages. Chromium
private SSR checks at 390px and 1440px passed: images load, no page-wide overflow,
table font is 14px, and all 16 numeric pricing cells occupy one line. This is a
private preview, not production hydration validation. No deployment or service
restart was performed.

## Winter guide revision — 18 October 2026

The screenshot identified `7-luchshih-mest-dlya-zimovschikov-na-phukete`,
not the newer reviews guide. Its historical public JSON remains intact. A localized
editorial revision in `winter-guide.ts` now supplies both RU and genuine EN copy,
so language switching stays on this article instead of returning to the collection.
It preserves the seven original areas: Patong, Kathu, Rawai, Chalong, Kamala,
Surin and Bang Tao. Short sections, a semantic comparison table, accommodation
checks and localized monthly-guide/fleet links replace the old long-form flow.
Unverified 600-baht pricing, full-insurance and 24/7-support claims are not repeated.
The revised copy links official TAT and Phuket destination sources. Original
publication date remains visible alongside an explicit editorial update date;
structured data and sitemap modification dates reflect the revision.

Three AI-generated illustrative scenes ship in both public roots at 1600 × 900:
`winter-coast.webp` (240,348 bytes), `winter-inland.webp` (242,316 bytes) and
`winter-harbour.webp` (216,678 bytes). Exact prompts and origins are recorded in
`docs/assets/winter-guide-images.json` and embedded in EXIF. Preparation uses
`apps/marketing/scripts/prepare-winter-guide-images.mjs`. Captions identify these
as illustrations, not photographs of particular accommodation or handover sites.
No inventory photography is replaced. Inline images reserve the correct 16:9 size.

Verification for this revision: 20 publication/monthly tests passed; isolated Next
export passed for 168 routes; article export checks passed for both languages,
compatibility URLs, index inclusion and images; existing content checks passed for
150 pages and both homepages; SEO checks passed for 110 canonical URLs. Scoped
ESLint has zero errors and two existing fast-refresh warnings in shared reading/index
modules. Source review confirms heading/TOC alignment, local table scrolling,
stacked narrow-screen contents and localized links. No browser-rendered desktop,
mobile or interaction verification was available. No deploy, commit, push, live
state edit or service restart was performed.
