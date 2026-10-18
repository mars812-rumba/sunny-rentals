# Sunny Rentals technical SEO + sitemap audit

Read-only live audit, 2026-10-18. Scope: all 110 canonical sitemap URLs (55 RU + 55 EN), robots.txt, selected old aliases, HTTP redirect, four nonexistent public paths. Requests used concurrency 5, timeout 20 seconds, pause 1 second per worker. Production/source unchanged.

## Confirmed passes

- Sitemap XML valid; 110 unique HTTPS URLs, no duplicates, below protocol limits; robots.txt references it.
- 110/110 sitemap URLs HTTP 200, no redirects, exactly one self-referencing canonical, no meta/header noindex observed.
- 110/110 nonempty titles, one description and one H1; no exact duplicate titles/descriptions in this sample.
- 330 HTML hreflang declarations, all targets within fetched sitemap; reciprocal return declarations verified. RU/EN/x-default present.
- Sitemap lastmod values have six distinct values, not indiscriminately one timestamp. Actual update-date accuracy cannot be proven without publication logs.
- HTTP homepage makes one permanent 301 redirect to HTTPS.
- Legacy /blog/choose-car-rental-phuket-reviews/ remains HTTP200 with canonical /articles/choose-car-rental-phuket-reviews/; intentionally noncanonical compatibility route, not a broken article.
- Vehicle variant /cars/toyota-yaris-2022-black/ HTTP200 canonical /cars/toyota-yaris/; variant canonicalization consistent with grouped catalog, not automatically a defect.

## Findings

### 1. Nonexistent public routes return legacy homepage HTTP200

Severity: Warning (priority High); confidence Confirmed.
Evidence: /seo-audit-missing-page-20261018/, /en/seo-audit-missing-page-20261018/, /articles/seo-audit-missing-20261018/, /cars/seo-audit-missing-20261018/ all HTTP200, legacy homepage title/H1, canonical homepage, no noindex. See summary.json and missing-paths.json.
Impact: soft-404 behavior, misleading navigation, wasted crawl, masking broken published links. Not evidence of an observed Google penalty.
Fix: serve genuine HTTP404 for unknown marketing URLs; keep SPA fallback restricted to known legacy app routes and preserve genuine historical aliases separately.

### 2. Every English HTML document declares Russian lang

Severity: Warning; confidence Confirmed.
Evidence: all110 HTML documents contain html lang=ru, including55 /en/ canonical pages whose titles/H1 are English. See crawl.json lang fields and saved HTML.
Impact: incorrect document-language semantics and assistive reading. Hreflang remains correct; do not describe this alone as Google indexing failure.
Fix: emit html lang=en in English server HTML, ru in Russian; verify final rendered DOM as separate browser evidence.

### 3. Security hardening headers absent on audited homepage

Severity: Warning (maintenance); confidence Confirmed.
Evidence: skill security_headers.py found no HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. See security-headers.json and full response headers in crawl.json.
Impact: defense-in-depth gap, not proven ranking/indexability blocker.
Fix: configure justified headers at edge/server; stage CSP report-only first and ensure booking, analytics and Telegram embedding still work. Do not blindly DENY framing or disable geolocation if product needs them. Add HSTS only after checking HTTPS on intended subdomains.

## Informational / unknown

- Robots wildcard allows public content and excludes app/admin/dashboard/API paths. AI crawlers inherit wildcard policy; no explicit AI policy is a business choice, not an SEO error.
- Sitemap membership proves discovery signals, not actual Google/Yandex indexing. GSC/Yandex Webmaster data not supplied.
- Raw HTTP/HTML evidence does not measure real-user Core Web Vitals, client hydration or all interactions. Root audit handles browser/performance separately.
- No technical numeric score assigned here: parent report reconciles these observations with content/browser evidence.

## Evidence

- crawl.py: reproducible bounded collector.
- crawl.json: clean UTF-8 extracted metadata + statuses + response headers and HTML evidence paths for all115 fetches.
- summary.json: sitemap statuses, exact duplicates, consistency checks, extra routes.
- missing-paths.json: independent missing article/car route check.
- sitemap.xml and robots.txt: direct fetched responses.
- robots-check.json, security-headers.json, redirect-check.json, hreflang-check.json: bundled SEO skill checks.

Collector's first run had a requests-default charset display error and malformed HTTP URL construction; both were corrected and final evidence regenerated. Neither was treated as a site defect.
