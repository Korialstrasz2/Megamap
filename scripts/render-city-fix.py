# Save as scripts/render-city-fix.py; usage:
# python scripts/render-city-fix.py docs/qa-city/before
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

folder = Path(sys.argv[1]).resolve()
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1050, "height": 1050})
    for svg in sorted(folder.glob("*.svg")):
        page.goto(svg.as_uri(), wait_until="load")
        page.screenshot(path=str(svg.with_suffix(".png")))
    browser.close()
