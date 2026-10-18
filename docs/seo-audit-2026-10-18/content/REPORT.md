# Live content and structured-data sample audit

Scope: 13 live URLs, direct HTTP GET, decoded UTF-8. All returned 200. Sample list and headings are in summary.json; individual HTML and JSON snapshots retain exact evidence. Non-mutating audit only, 2026-10-18. No rankings, traffic, Google indexing or penalty data available.

## Confirmed findings

1. **P2 / Warning: English pages declare Russian document language.** All six sampled English pages (`/en/`, `/en/articles/`, both `/en/articles/<slug>/`, `/en/long-term-car-rental-phuket/`, `/en/rental-terms/`) have raw `<html lang="ru">`, while content and JSON-LD inLanguage are English. Fix language in server HTML, not only after hydration. Impact primarily assistive technology/language handling; do not claim this alone prevents Google language detection or indexing.
2. **P2 / Warning: English home Twitter preview remains Russian.** `/en/` has `twitter:title=Аренда авто и байков на Пхукете` and the Russian description, despite English title and Open Graph. Fix locale-specific Twitter metadata.
3. **P2 / Warning: Both homepages lack og:image and og:type.** `/` and `/en/` contain twitter:image but no corresponding OG image/type. Other 11 sampled pages contain both. Supply verified existing site preview image and website type. Social-sharing defect, not an indexing blocker.
4. **P3 / Warning: RU review article snippet repeats H1 only.** `/articles/choose-car-rental-phuket-reviews/` meta and OG description are exactly `Как выбрать прокатчика на Пхукете по отзывам`. English counterpart has a useful distinct summary. Add a concrete benefit/question summary in Russian. Search engines may generate snippets independently; no guarantee from changing metadata.
5. **P2 / Likely trust improvement, not a sitewide absence claim:** In all sampled navigation/footers, contact links lead to Telegram bot or @marseloid; no privacy/about/contact page links, tel/mail or map links were found. Homepage AutoRental JSON-LD address is only locality Phuket + TH; no business phone/street. Add truthful public business identity, accountable team/contact and privacy information wherever appropriate, with no invented address or identities. Whether those pages exist elsewhere was not investigated.

## Pass / positive evidence

- All 13 URLs serve complete server-rendered content with exactly one H1 (audit initially scoped first article element, but full-document H1 verified separately).
- Each sample has a unique relevant title, a description and self-referencing canonical.
- Both published articles exist in RU and EN, linked from their localized index. Their article text includes contextual links toward fleet/terms/deposit and the winter guide toward monthly rental.
- Both article families have valid JSON-LD BlogPosting with headline, genuine Organization author, image, inLanguage, publish and modification dates, and canonical mainEntityOfPage. Author/date are visible; bundled article script misses them, so its absence warnings are false positives.
- Winter guide has three images with meaningful localized alt/captions and explicitly identifies AI illustration, seven substantive area headings and planning-source links.
- Car model `/cars/toyota-yaris/` ProductGroup contains five concrete variants, own image/SKU/Offer prices, separate deposit and daily UnitPriceSpecification. 517 THB schema price matches displayed minimum tariff, not a claimed date-specific quote. There is no fabricated InStock availability property. Visible text explicitly requires manager availability confirmation and distinguishes lowest tariff from actual date calculation.
- Monthly guide has concrete cost examples and explains 30+ tier, season crossover, deposit, advance payment and cancellation rather than claiming one universal monthly price.
- Localized terms give booking/inspection/extra-driver/advance/deposit answers and distinguish request from reservation.

## Maintenance / limitations

- Winter BlogPosting datePublished `2026-05-04T10:54:48.171307` has no timezone. Modification is valid date-only `2026-10-18`. Normalize dates when historical timezone is known; never fabricate historical timezone/date.
- Article Organization author lacks URL/publisher detail; strengthening real company/editorial identity is useful but not proof of invalid JSON or ranking suppression. No fake author bios.
- Commercial FAQPage JSON-LD occurs on terms/monthly/model pages. It is syntactically valid and corresponds to visible questions. No promise of Google FAQ rich results; eligibility is separate from Schema.org validity. No recommendation to add FAQ schema to articles.
- Root audit owner must verify current Google requirements against primary documentation if mentioning eligibility. Skill reference documents contain dated/unsupported historical assertions (for example precise AI-search uplift or broad December2025 penalties): excluded from this report.
- Scripts run: fetch_page.py (index), article_seo.py --json --no-autocomplete (English review), validate_schema.py (13 snapshots), parse_html.py (model). Outputs preserved here. `validate_schema.py` incorrectly flags a valid @context+@graph envelope as Missing@type; not a confirmed schema defect.
- article_seo 852-word warning and fixed 1500-word target excluded: coverage judged against user intent, no arbitrary word-count floor.
- Readability output is English-language-specific and not used to grade Russian. Requests fetch helper encoding mojibake was extraction-only; our direct requests set UTF-8 and rendered source is correct.
- No browser inspection performed by this specialist (assigned to separate browser agent), no Rich Results Test/Search Console, backlink/reputation or factual vehicle-data source verification.
