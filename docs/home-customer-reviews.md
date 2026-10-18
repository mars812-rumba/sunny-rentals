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
adaptation preserves the site's sand/ocean palette, uses a simple quote/video
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
