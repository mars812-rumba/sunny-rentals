# Sunny Rentals — article profile

Scope: Phuket car rental for tourists. Scheduled drafts are Russian; English pages
require a real translation and localized links. Speak as our team: «мы», «у нас»,
«наш прокат»; address the reader as «вы». Do not repeat the brand in every paragraph.

Confirmed company terms: `apps/marketing/src/content/rental-policy.ts`. Actual
photos and seasonal rates: supplied public inventory. A file read is not confirmation
of availability, freshness from the supplier or the final price for specific dates.
Never expose supplier contacts, bookings or private tenant data.

Begin with supplied Wordstat evidence, then relevant RU/EN competitors and primary
sources. Suggestions and competitor headings are candidate questions, not frequency
statistics. Disclose unavailable sources in research_notes. Preserve Wordstat period,
geography and query meaning; never substitute another destination's demand.

Verified next-action paths: `/cars/`, `/deposit/`, `/insurance/`, `/rental-terms/`
and the existing `/long-term-car-rental-phuket/`. Verify model URLs before linking.
Keep district comparisons together rather than generating near-duplicate pages.

Visuals: preserve Sunny's existing reading style. Real fleet photos represent cars;
Generated scenes must not be presented as documentary evidence. Public image
captions should briefly refer to the article title, without repeated AI notices;
preserve exact prompts, tools and origin in private/technical provenance. Choose tables, checklists or
diagrams when they explain the topic. Do not invent asset URLs. The current JSON-only
writer cannot execute shell commands, generate image files, run Python SEO scripts
or browser tests. After writing, the host generator runs the separate private
asset/SSR/Chromium gate. `config/seo-visuals.json` selects prepared assets, with an
explicit shared travel-planning fallback. Fresh unattended API image generation is
not enabled. Never claim that a shared illustration was newly generated per article.

Every article and revision requires the article-editor browser readability gate.
The existing host gate uses `scripts/editorial_browser.py` at 390px and 1440px,
saving private screenshots and `browser-report.json`; an editor must also inspect
those screenshots before calling the layout visually approved. Check tables and
whole price amounts especially. Repeat after text, cover or style changes. A
passing private SSR preview is not proof of production hydration or live delivery.
After separately authorized publication, perform a read-only check of the actual
canonical page and record separate evidence; until then live verification remains
pending. This rule does not install a post-publication scheduler or enable publishing.

Public canonical paths: `/articles/<slug>/`; `/blog/<slug>/` is compatibility only.
English: `/en/articles/<slug>/` only with translation. Output must match
`config/seo-draft.schema.json`; research and owner questions stay outside article copy.
Keep the scheduler and topic state unchanged. Owner review remains required.
This profile does not authorize deployment, publication or unattended publishing.
