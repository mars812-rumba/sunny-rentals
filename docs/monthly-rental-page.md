# Monthly rental page — 17 October 2026

Local implementation only; not published. No cron or automatic publishing was configured.

## Scope and editorial decisions

- Extend `/long-term-car-rental-phuket/` and its `/en/` counterpart; no duplicate monthly article URL.
- Source copy: `apps/marketing/src/content/monthly-rental.ts`.
- Owner requested separate future articles for receiving/inspecting a car and for maintenance. Neither article is created or linked as if it exists.
- Do not discuss or promise substitute/replacement vehicles on this page. No accident, refund or coverage promises were inferred from the owner's informal explanation.
- No fixed monthly prices are invented. The page explains the existing 30+ tier and directs visitors to specific catalogue vehicles and date-specific totals.
- Existing delivery and insurance policy copy and FAQ remain shared sources; the monthly FAQ no longer expands into maintenance.

## Direction contract

THESIS: Help a monthly renter compare the whole stay, not an isolated “from” price. Expand the existing commercial page rather than creating another page targeting the same intent.

OWN-WORLD: Keep Sunny's ocean/sun palette, Manrope typography, shell, vehicle cards and native FAQ. New styles are scoped to the monthly opening and semantic comparison tables.

STORY: Everyday journeys → total cost → vehicle fit → longer stays → specific catalogue cars → confirmed availability and terms.

FIRST VIEWPORT: Monthly-rental heading and practical introduction alongside one actual catalogue photo, with direct anchors to cars and cost explanation. Columns stack on mobile. Captions clarify that availability needs checking.

FORM: Local extension of an established page; no new visual-world selection or concept roll. Native anchor navigation, readable article body, two captioned tables and the existing real-car catalogue.

FINISH: Source/SSR checks and app build are distinct from visual approval. No browser capture is available in this environment; mobile and desktop appearance must be checked in preview before publication.

## Sources and assets

Previous qualitative research used the public monthly-rental pages at Monkeycar, Phuket Car Rentals, Thailand Rent A Car and Phuket Hire Car. Their price, servicing and insurance claims were not adopted as Sunny policy. No keyword-volume or ranking claims are made.

Owner-confirmed Sunny policies remain in `rental-policy.ts`; catalogue rates and images remain in `cars.ts` and the existing public inventory. The opening reuses the first public compact car photo selected from that catalogue. No new photo is generated, no private tenant media is exposed, and no existing raster is rewritten.

## Verification and handoff

- `node --test tests/monthly-rental-page.test.mjs` checks both locales, unique route, two semantic tables, exact anchor targets, existing photo path, visible FAQ/JSON-LD parity, metadata and excluded topics.
- Targeted ESLint: no errors; the existing footer's raw image remains a Next lint warning.
- Full marketing TypeScript check encounters a pre-existing error in `scripts/content-audit.test.ts:64` (`equipment` on `never`). Do not silently alter unrelated tests to make the check green.
- Temporary app-only Next.js/webpack build passed, including app TypeScript and 160 static pages. It excludes those unrelated test scripts and writes only under `/tmp/sunny-monthly-check-nz7F8z`. Build workers were disabled in the temporary configuration to expose compiler diagnostics; no repository build configuration was changed.
- No design-system rewrite: checked `PRODUCT.md`, `globals.css`, the existing content-page layout and vehicle cards. Palette, type family and catalogue/FAQ primitives are preserved. Existing generic-page eyebrow/number styles are not promoted into new design rules or changed globally.
- Before publication: inspect desktop/mobile preview, verify social image on the deployed URL, and obtain owner approval. Acceptance/maintenance articles and scheduling are separate future work.

## Articles navigation — follow-up

- Added `/articles/` and `/en/articles/` with the monthly page as their first curated entry. No duplicate article URL, draft cards or links to unwritten topics.
- The shared header links to Articles in desktop navigation and the existing mobile dialog. Mobile selection uses the existing close/focus-restoration behaviour. The homepage footer also links to the index.
- The monthly page's breadcrumb links back to Articles. Both index routes have locale-specific canonical/social metadata, language alternates and sitemap entries.
- The index inherits the existing Sunny palette, typography, shell and footer. Its image/text row stacks below 700px and has an explicit keyboard focus ring; no new assets or design-system rewrite.
- Expanded the SSR test suite to cover the index, menu wiring, existing article target, language versions and sitemap uniqueness. Browser capture remains unavailable; no visual approval is claimed.
