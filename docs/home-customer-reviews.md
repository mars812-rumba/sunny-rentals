# Customer reviews on the public homepages

The owner requested migration from `src/components/site/ReviewsSection.tsx` to
the new marketing homepages, excluding its first entry (`/4814`, a team reply).
The legacy component is preserved. `customer-reviews.ts` retains the other seven
Russian quotes verbatim and their Telegram message IDs. English versions are
explicitly labelled translations; no customer names or identities were invented.
Legacy hardcoded five-star values were not migrated, nor added to structured data.
The testimonial about a replacement remains a customer's account, not a company
guarantee; the section says individual booking arrangements must be agreed.

`CustomerReviews` is mounted after the fleet on both homepages. Impeccable-guided
adaptation preserves the site's sand/ocean palette, uses a simple quote-card/video
composition and stacks it on mobile. Seven server-rendered figures retain source
links; only the active quote is visible. Native labelled 44px previous/next buttons
wrap around, retain keyboard focus and announce the position. No auto-advance or
Framer Motion dependency was carried over from the old site.

Existing MP4 and WebP poster are byte-identical in both public roots under
`/media/reviews/`: 7,926,994 and 31,846 bytes. Video is H.264/AAC, 480x854,
38.56 seconds. Only the poster loads initially. The native video element/source
is created on an explicit user action, with inline playback, controls, and an
error message plus direct-file link if loading fails. The original Instagram
highlights link is retained; no Instagram embed/tracker is loaded. Source video
is Russian and has no supplied caption/subtitle file; this remains an accessibility
and English-language limitation, not claimed as resolved by translating UI labels.

Verification: 30 Node tests (publication/monthly/reviews); scoped ESLint with no
errors; isolated Next static export; existing checks for 112 canonical URLs, 150
content/detail pages and both homepages. Chromium on the local production export
passed RU/EN at 390px and 1440px: seven quotes, forward/reverse wrap, keyboard
activation/focus, no page overflow, loaded poster, no MP4 requests before action,
and actual video playback with duration ~38.56 seconds. A final-export confirmation
also checked the unavailable-source error and direct-file fallback. Evidence is private under
`.local/customer-reviews-qa/`. These are emulated browser viewports, not physical
iOS/Android tests or a deployed-site verification. No publication, commit, push,
production restart or scheduler changes were performed.

## Owner visual refinement: section emphasis and transparent icons

The reviews now have a pale blue section surface and one sand-colored review
card with a restrained soft shadow and 16px corners. The card encloses the active
quote, navigation and Instagram source link; video remains adjacent on desktop
and stacks below on mobile. Card padding and quote space adapt to the narrower
reading measure. Neither the seven original quotes nor video was changed.

Telegram is displayed beside the customer/source label; Instagram accompanies
the highlights link. Both images are decorative next to explicit text labels.
The owner's uploaded logo images were processed with built-in image_gen in
background-extraction mode. Transparent exterior corners and opaque white marks
are checked against decoded pixel data, not inferred from appearance. The
selected Telegram result excludes an earlier rejected output with a damaged disc.
Prompt and selected source provenance: `docs/assets/customer-review-icons.json`.
`prepare-review-icons.mjs` packages 128px lossless WebP files, preserving alpha
and embedding provenance. Matching files exist in both public roots:
`/media/reviews/telegram-transparent.webp` (12,686 bytes) and
`/media/reviews/instagram-transparent.webp` (15,756 bytes). Original uploads and
legacy icons were not overwritten.

Verification for this refinement: 31 Node tests and isolated production export,
plus existing SEO/content/article checks. Browser evidence is under
`.local/customer-reviews-icons-qa/`, covering RU/EN at 320, 390 and 1440px;
mobile/desktop playback is checked after explicit action. No live release.
