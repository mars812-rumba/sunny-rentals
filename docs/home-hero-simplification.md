# Homepage hero without the duplicate vehicle carousel

Owner request: remove the vehicle carousel from the opening hero because the
next section already groups vehicles by category. Applies to both public languages.

`MarketingHero` now contains the existing offer, static sunset background and
booking form only. It no longer imports `HeroVehicleCarousel`, accepts a fleet
array, or preloads a featured car photo. `MarketingHomePage` no longer constructs
and serializes the entire inventory as hero props. The carousel's randomization,
4.2-second timer, scroll handlers and dots are absent from the homepage import
graph and initial JavaScript. Historical component source is retained unused;
no product photographs or catalogue components were deleted.

Impeccable-guided simplification preserves the existing visual identity, form,
copy, categories, article/review sections and footer. A scoped simple-hero modifier
removes viewport-height placeholders and the empty second-column layout. The copy
and form no longer wait for entrance animations. Existing background preloads
remain media-qualified, with one applicable background per screen size.

Local production-export comparison (same dependencies, not a live speed test):

| Asset | Before | After |
| --- | ---: | ---: |
| Russian homepage HTML | 226,969 bytes | 195,148 bytes |
| English homepage HTML | 206,381 bytes | 175,617 bytes |
| Initial JS, gzip sum | 189,092 bytes | 187,852 bytes |
| Hero vehicle slides | 5 | 0 |

The initial homepage scripts were inspected: carousel code is absent. These
figures do not establish a new LCP/PageSpeed score. The owner's screenshot showed
5.0-second LCP for the earlier live page; repeat that measurement after an
authorized release to assess the actual result.

Verification: 34 Node tests, isolated Next export, existing SEO/content/article
checks, and local Chromium checks of RU/EN at 320px, 390px and 1440px. The booking
form remains editable, category groups are intact and directly follow the hero,
and no car image or carousel is rendered in the hero. No form was submitted and
no publication, commit, push, service restart or scheduler change was performed.
Private evidence: `.local/home-hero-qa/`; physical-device and live speed checks
are not claimed.
