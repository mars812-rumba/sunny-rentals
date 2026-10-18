"""Bounded Chromium gate for a private, non-hydrated article preview."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import sys
from threading import Thread
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright


def check(directory, root, locale="ru"):
    if locale not in ("ru", "en"):
        raise ValueError("Unsupported preview language")
    directory, root = Path(directory).resolve(), Path(root).resolve()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_GET(self):
            path = unquote(urlsplit(self.path).path)
            file = directory / "preview.html" if path == "/" else None
            if path != "/" and (path.startswith(("/images/", "/images_web/")) or path == "/logo.png.webp"):
                for public in (root / "apps/marketing/public", root / "public"):
                    candidate = (public / path.lstrip("/")).resolve()
                    if candidate.is_relative_to(public.resolve()) and candidate.is_file():
                        file = candidate
                        break
            if file is None or not file.is_file():
                self.send_error(404)
                return
            data = file.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8" if path == "/" else mimetypes.guess_type(str(file))[0] or "application/octet-stream")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f"http://127.0.0.1:{server.server_port}"
    report = {"status": "failed", "mode": "private SSR preview, not production hydration", "viewports": []}
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                for width, height in ((390, 844), (1440, 1000)):
                    context = browser.new_context(viewport={"width": width, "height": height}, reduced_motion="reduce")
                    context.route("**/*", lambda route: route.continue_() if route.request.url.startswith(origin + "/") else route.abort())
                    page = context.new_page()
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    response = page.goto(origin, wait_until="networkidle", timeout=20000)
                    if response.status != 200:
                        raise ValueError("Preview unavailable")
                    total = page.evaluate("document.documentElement.scrollHeight")
                    if total > 40000:
                        raise ValueError("Preview exceeds bounded check size")
                    for offset in range(0, total, 650):
                        page.evaluate("y => window.scrollTo(0, y)", offset)
                        page.wait_for_timeout(60)
                    page.wait_for_function("Array.from(document.images).every(i => i.complete)", timeout=10000)
                    checks = page.evaluate("""() => ({
                      lang: document.documentElement.lang,
                      h1: document.querySelectorAll('h1').length,
                      noindex: document.querySelector('meta[name=robots]')?.content.includes('noindex'),
                      overflow: document.documentElement.scrollWidth > innerWidth + 1,
                      images: Array.from(document.images).map(i => ({src:i.getAttribute('src'), alt:i.alt, ok:i.complete && i.naturalWidth>0})),
                      anchors: Array.from(document.querySelectorAll('.article-reading__contents a')).map(a => ({href:a.hash,ok:!!document.getElementById(a.hash.slice(1))})),
                      cta: !!document.querySelector('a[href="/cars"]') || !!document.querySelector('a[href="/cars/"]'),
                      schemas: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s=>JSON.parse(s.textContent)['@type'])
                      ,tables: Array.from(document.querySelectorAll('.article-reading__table')).map(region=>({
                        width:region.clientWidth, scrollWidth:region.scrollWidth,
                        fontSize:getComputedStyle(region.querySelector('table')).fontSize,
                        wordBreak:getComputedStyle(region.querySelector('table')).wordBreak,
                        overflowWrap:getComputedStyle(region.querySelector('table')).overflowWrap,
                        numericCells:Array.from(region.querySelectorAll('td')).filter(td=>/^\\d[\\d\\s]*$/.test(td.textContent.trim())).map(td=>{
                          const range=document.createRange(); range.selectNodeContents(td);
                          return {text:td.textContent.trim(),whiteSpace:getComputedStyle(td).whiteSpace,lines:range.getClientRects().length};
                        })
                      }))
                    })""")
                    if locale == "en":
                        checks["cta"] = page.locator('a[href="/en/cars"], a[href="/en/cars/"]').count() > 0
                    report["viewports"].append({"width": width, "height": height, "checks": checks, "pageerrors": errors})
                    page.screenshot(path=str(directory / f"preview-{width}.png"), full_page=True)
                    if (checks["lang"] != locale or checks["h1"] != 1 or not checks["noindex"] or checks["overflow"]
                        or not checks["cta"] or "BlogPosting" not in checks["schemas"] or errors
                        or not checks["images"] or not all(image["ok"] for image in checks["images"])
                        or not checks["anchors"] or not all(anchor["ok"] for anchor in checks["anchors"])):
                        raise ValueError("Article browser invariant failed")
                    page.locator('.article-reading__contents a').first.click()
                    if urlsplit(page.url).fragment != checks["anchors"][0]["href"].lstrip("#"):
                        raise ValueError("Contents navigation failed")
                    page.evaluate("window.scrollTo(0,0)")
                    page.screenshot(path=str(directory / f"preview-{width}.png"), full_page=True)
                    context.close()
                report["status"] = "passed"
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        path = directory / "browser-report.json"
        path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf8")
        path.chmod(0o600)


if __name__ == "__main__":
    check(*sys.argv[1:])
