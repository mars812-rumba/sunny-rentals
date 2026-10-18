"""Bounded local export regression gate; not a PageSpeed score or field CWV test."""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import sys
from threading import Thread
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright


def check(export, output):
    export, output = Path(export).resolve(), Path(output).resolve()
    output.mkdir(parents=True, exist_ok=True)

    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def translate_path(self, path):
            candidate = super().translate_path(path)
            # deploy.sh merges root/public/images_web after the Next export.
            if urlsplit(path).path.startswith('/images_web/') and not Path(candidate).is_file():
                public = Path(__file__).resolve().parents[1] / 'public'
                fallback = (public / urlsplit(path).path.lstrip('/')).resolve()
                if fallback.is_relative_to(public.resolve()) and fallback.is_file():
                    return str(fallback)
            return candidate

    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(export)))
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{server.server_port}"
    report = {"mode": "isolated static export, not production PSI", "pages": []}
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            try:
                for locale in ("ru", "en"):
                    for width in (320, 390, 1440):
                        context = browser.new_context(viewport={"width": width, "height": 1000 if width == 1440 else 844}, reduced_motion="reduce")
                        requests, errors, failures = [], [], []
                        context.route("**/*", lambda route: route.continue_() if route.request.url.startswith(origin + "/") else route.abort())
                        page = context.new_page()
                        page.on("request", lambda req: requests.append(req.url))
                        page.on("pageerror", lambda error: errors.append(str(error)))
                        page.on("response", lambda response: failures.append(response.url) if response.status >= 400 else None)
                        page.goto(origin + ("/en/" if locale == "en" else "/"), wait_until="networkidle")
                        page.evaluate("document.fonts.ready")
                        initial_requests = list(requests)
                        checks = page.evaluate("""() => ({
                          overflow: document.documentElement.scrollWidth > innerWidth + 1,
                          h1: document.querySelectorAll('h1').length,
                          background: getComputedStyle(document.querySelector('.marketing-hero__backdrop')).backgroundImage,
                          font: getComputedStyle(document.body).fontFamily,
                          latinLoaded: document.fonts.check('700 20px Manrope', 'Rent a car'),
                          cyrillicLoaded: document.fonts.check('700 20px Manrope', 'Аренда авто'),
                          highPreloads: [...document.querySelectorAll('link[as=image][fetchpriority=high]')].map(l => l.href),
                          fleetFollowsHero: document.querySelector('.marketing-hero').nextElementSibling.id === 'fleet',
                          heroImages: document.querySelectorAll('.marketing-hero img').length,
                          formGap: document.querySelector('.booking-search--hero .booking-search__panel').getBoundingClientRect().top - document.querySelector('.marketing-hero__copy').getBoundingClientRect().bottom,
                          formPadding: getComputedStyle(document.querySelector('.booking-search--hero')).paddingBlock
                        })""")
                        assert checks["h1"] == 1 and not checks["overflow"], checks
                        assert checks["fleetFollowsHero"] and checks["heroImages"] == 0, checks
                        assert checks["formPadding"] == "0px", checks
                        assert 0 <= checks["formGap"] <= (20 if width <= 700 else 28), checks
                        assert checks["latinLoaded"] and (locale != "ru" or checks["cyrillicLoaded"]), checks
                        expected = "kata-sunset-hero-mobile.webp" if width <= 700 else "kata-sunset-hero.webp"
                        other = "kata-sunset-hero.webp" if width <= 700 else "kata-sunset-hero-mobile.webp"
                        assert expected in checks["background"], checks
                        assert any(urlsplit(url).path.endswith(expected) for url in initial_requests)
                        assert not any(urlsplit(url).path.endswith(other) for url in initial_requests)
                        assert not any("fonts.google" in url or url.endswith(".mp4") for url in initial_requests)
                        assert not any("kata-sunset-mobile.webp" in url or url.endswith("/kata-sunset.webp") for url in initial_requests)
                        assert any("/fonts/manrope-v20-latin.woff2" in url for url in initial_requests)
                        assert not errors and not failures, {"errors": errors, "http": failures}
                        date = page.locator('.booking-search--hero input[type="date"]').first
                        date.fill("2026-11-01")
                        assert date.input_value() == "2026-11-01"
                        # Screenshot before interacting with below-fold content.
                        if width != 320:
                            page.screenshot(path=str(output / f"{locale}-{width}.png"))
                        buttons = page.locator('#reviews button')
                        assert buttons.count() >= 2
                        before = page.locator('#customer-review-quotes figure:not([hidden])').inner_text()
                        buttons.nth(1).click()
                        assert page.locator('#customer-review-quotes figure:not([hidden])').inner_text() != before
                        report["pages"].append({"locale": locale, "width": width, "checks": checks, "initialResources": initial_requests})
                        context.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        (output / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"Passed {len(report['pages'])} locale/viewport cases; {output / 'report.json'}")


if __name__ == "__main__":
    check(*sys.argv[1:])
