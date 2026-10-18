"""Read-only post-release article gate. No publishing, forms, or remote writes."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sys

ORIGIN = "https://sunny-rentals.online"


def article_cases(root):
    directory = root / "public/content/blog"
    slugs = json.loads((directory / "index.json").read_text())
    cases = []
    for slug in slugs:
        if not isinstance(slug, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
            raise ValueError("Invalid published article slug")
        source = json.loads((directory / (slug + ".json")).read_text())
        if source.get("slug") != slug or not source.get("title"):
            raise ValueError("Invalid published article identity")
        cases.append({"slug": slug, "url": ORIGIN + "/articles/" + slug + "/"})
    if not cases:
        raise ValueError("No published articles to check")
    return cases


def verify_checks(checks):
    failures = []
    for name in ("revision", "canonical", "language", "heading", "images", "contents", "cta", "tables"):
        if not checks.get(name):
            failures.append(name)
    if checks.get("overflow"):
        failures.append("page overflow")
    return failures


def check(root, export, output, slugs=None):
    from playwright.sync_api import sync_playwright

    cases = article_cases(root)
    if slugs:
        cases = [case for case in cases if case["slug"] in slugs]
        if {case["slug"] for case in cases} != set(slugs):
            raise ValueError("Requested article is not published in local index")
    translated = []
    for case in cases:
        case["language"] = "ru"
        case["relative"] = "articles/" + case["slug"] + "/index.html"
        relative = "en/articles/" + case["slug"] + "/index.html"
        if (export / relative).is_file():
            translated.append(dict(case, language="en", relative=relative,
                                   url=ORIGIN + "/en/articles/" + case["slug"] + "/"))
    cases.extend(translated)
    output.mkdir(parents=True, exist_ok=True, mode=0o700)
    output.chmod(0o700)
    report = {"status": "failed", "checked_at": datetime.now(timezone.utc).isoformat(),
              "mode": "live post-release Chromium, read-only", "visual_review": "screenshots require editor inspection",
              "pages": []}
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                for case in cases:
                    html = (export / case["relative"]).read_text()
                    # Reference is the exact release export, including editorial overlays.
                    reference = browser.new_page(java_script_enabled=False)
                    reference.route("**/*", lambda route: route.abort())
                    reference.set_content(html, wait_until="domcontentloaded")
                    expected = reference.locator(".article-reading").text_content()
                    expected_images = reference.locator('.article-reading__cover img, .article-reading__body img').evaluate_all("images=>images.map(i=>i.getAttribute('src'))")
                    reference.close()
                    for width, height in ((390, 844), (1440, 1000)):
                        context = browser.new_context(viewport={"width": width, "height": height}, reduced_motion="reduce")
                        # No forms, analytics, bookings or third-party requests during QA.
                        context.route("**/*", lambda route: route.continue_() if
                                      route.request.method == "GET" and route.request.url.startswith(ORIGIN + "/")
                                      and not re.search(r"/(?:api|track|analytics)(?:/|\?)", route.request.url)
                                      else route.abort())
                        page = context.new_page()
                        errors = []
                        page.on("pageerror", lambda error: errors.append(str(error)))
                        row = {"slug": case["slug"], "url": case["url"], "language": case["language"], "width": width}
                        report["pages"].append(row)
                        response = page.goto(case["url"], wait_until="networkidle", timeout=30000)
                        row["http_status"] = response.status if response else None
                        if not response or response.status != 200 or page.url.rstrip("/") != case["url"].rstrip("/"):
                            raise ValueError("Canonical article unavailable")
                        total = page.evaluate("document.documentElement.scrollHeight")
                        if total > 40000:
                            raise ValueError("Article exceeds bounded browser check")
                        for offset in range(0, total, 700):
                            page.evaluate("y=>scrollTo(0,y)", offset)
                            page.wait_for_timeout(50)
                        page.wait_for_function("Array.from(document.querySelectorAll('.article-reading img')).every(i=>i.complete)", timeout=10000)
                        checks = page.evaluate("""({expected,url,language,expectedImages}) => {
                          const article=document.querySelector('.article-reading');
                          const normalize=s=>(s||'').replace(/\\s+/g,' ').trim();
                          const links=[...document.querySelectorAll('.article-reading__contents a')];
                          const images=[...document.querySelectorAll('.article-reading__cover img,.article-reading__body img')];
                          return {
                            revision:!!article && normalize(article.textContent)===normalize(expected),
                            canonical:document.querySelector('link[rel=canonical]')?.href===url,
                            language:document.documentElement.lang===language,
                            heading:document.querySelectorAll('h1').length===1,
                            overflow:document.documentElement.scrollWidth>innerWidth+1,
                            images:images.length>0 && JSON.stringify(images.map(i=>i.getAttribute('src')))===JSON.stringify(expectedImages) && images.every(i=>i.complete&&i.naturalWidth>0&&i.alt.trim()),
                            contents:links.length>0&&links.every(a=>a.hash&&document.getElementById(a.hash.slice(1))),
                            cta:!!article?.querySelector(language==='en'?'a[href="/en/cars/"],a[href="/en/cars"]':'a[href="/cars/"],a[href="/cars"]'),
                            tables:[...document.querySelectorAll('.article-reading__table')].every(region=>{
                              const table=region.querySelector('table');
                              return table && parseFloat(getComputedStyle(table).fontSize)>=12 &&
                                (region.scrollWidth<=region.clientWidth+1 || ['auto','scroll'].includes(getComputedStyle(region).overflowX)) &&
                                [...table.querySelectorAll('td')].filter(td=>/^\\d[\\d\\s]*$/.test(td.textContent.trim())).every(td=>{
                                  const range=document.createRange();range.selectNodeContents(td);return range.getClientRects().length<=1;
                                });
                            })
                          };
                        }""", {"expected": expected, "url": case["url"], "language": case["language"], "expectedImages": expected_images})
                        page.locator('.article-reading__contents a').first.click()
                        checks["contents"] = checks["contents"] and bool(page.url.split("#")[1:])
                        page.evaluate("scrollTo(0,0)")
                        screenshot = output / (case["slug"] + f"-{case['language']}-{width}.png")
                        page.screenshot(path=str(screenshot), full_page=True)
                        screenshot.chmod(0o600)
                        row.update(checks=checks, pageerrors=errors, screenshot=screenshot.name)
                        failures = verify_checks(checks)
                        if errors:
                            failures.append("browser errors")
                        if failures:
                            row["failures"] = failures
                            raise ValueError("Article check failed: " + ", ".join(failures))
                        context.close()
                report["status"] = "passed"
            finally:
                browser.close()
    except Exception as error:
        report["error"] = str(error)
    finally:
        target = output / "live-report.json"
        target.write_text(json.dumps(report, ensure_ascii=False, indent=2))
        target.chmod(0o600)
    print(json.dumps({"status": report["status"], "report": str(target)}, ensure_ascii=False))
    return report["status"] == "passed"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--export", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--slug", action="append")
    args = parser.parse_args()
    os.umask(0o077)
    sys.exit(0 if check(args.root, args.export, args.output, args.slug) else 1)
