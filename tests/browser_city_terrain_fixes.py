"""Painted edge/slope regression and four real 2.5D rotations with shipped CSP.
The fixture reconstructs the screenshot, not the unavailable original atlas.
"""
from pathlib import Path
import argparse, json, re, subprocess
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument('--inline', action='store_true')
p.add_argument('--chromium')
p.add_argument('--output', default=str(ROOT/'docs/qa-city-terrain-fixes'))
a = p.parse_args()
OUT = Path(a.output); OUT.mkdir(parents=True, exist_ok=True)
fixture = json.loads(subprocess.check_output(['node', '-e', 'console.log(JSON.stringify(require("./tests/fixtures/northern-painted-city.cjs")))'], cwd=ROOT))
checks, errors, remote = [], [], []
def check(name, value):
    assert value, name
    checks.append(name); print('PASS:', name, flush=True)
with sync_playwright() as pw:
    args = {'headless': True, 'args': ['--no-sandbox']}
    if a.chromium: args['executable_path'] = a.chromium
    browser = pw.chromium.launch(**args)
    page = browser.new_page(viewport={'width':1500,'height':1000}, accept_downloads=True)
    page.set_default_timeout(60000)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('dialog', lambda d: d.accept())
    page.on('request', lambda r: remote.append(r.url) if r.url.startswith(('http://','https://')) else None)
    try:
        if a.inline:
            html=(ROOT/'index.html').read_text()
            html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
            html=re.sub(r'<link rel="stylesheet" href="([^"]+)">',lambda m:'<style>'+(ROOT/m[1]).read_text()+'</style>',html)
            html=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>'+(ROOT/m[1]).read_text()+'</script>',html)
            page.set_content(html, wait_until='load')
        else: page.goto((ROOT/'index.html').as_uri(), wait_until='load')
        page.wait_for_function('window.MegamapApp && MegamapApp.getScene()')
        page.wait_for_selector('#busy', state='hidden')
        page.evaluate('document.querySelectorAll("dialog[open]").forEach(d=>d.close())')
        js = page.evaluate
        js("MegamapI18n.setLang('it')")
        js("x=>MegamapApp.generate('fantasy',x.seed,x.options)", fixture)
        scene = js('MegamapApp.getScene()')
        (OUT/'northern-city.megamap.json').write_text(json.dumps(scene))
        check('All five complexes fit the reconstructed northern sketch', {x['kind'] for x in scene['cityStudio']['complexes']}=={'fortress','temple','warehouse','park','square'})
        check('Northern canvas edge gets real development', sum(1 for f in scene['features'] if f['type']=='building' and f['y']<100)>15)
        check('River-aligned sampling finds valid longship berths', scene['cityStudio']['statistics']['boats']>=8)
        check('Unmet building targets disclose the physical painted area', any(w.startswith('Painted building land:') for w in scene['cityStudio']['warnings']))
        check('New capacity diagnostics translate to Italian', js("MegamapApp.getScene().cityStudio.warnings.filter(x=>x.startsWith('Painted building land:')).every(x=>MegamapMapLabels.text(x,'it').startsWith('Terreno edificabile dipinto:'))"))
        page.screenshot(path=str(OUT/'northern-city-top-down.png'))
        before = js('JSON.stringify(MegamapApp.getScene())')
        page.click('#city25Quick')
        check('Direct 2.5D viewer opens the corrected shared mesh', page.locator('#city25Host svg').get_attribute('data-terrain-mesh')=='64')
        check('Wall sections are individually terrain-following panels', page.locator('#city25Host [data-wall-top]').count()>70)
        seen=[]
        for angle in [0,90,180,270]:
            check('Camera bearing '+str(angle), page.locator('#city25Host svg').get_attribute('data-bearing')==str(angle))
            page.screenshot(path=str(OUT/('northern-city-'+str(angle)+'.png')))
            seen.append(page.locator('#city25Host svg').get_attribute('viewBox'))
            check('Rotation '+str(angle)+' preserves the stored scene', js('JSON.stringify(MegamapApp.getScene())')==before)
            page.click('#city25Right')
        check('Full rotation returns to identical framing', page.locator('#city25Host svg').get_attribute('viewBox')==seen[0])
        check('Complex labels remain readable and Italian', 'Fortezza interna' in page.locator('#city25Host').inner_text())
        def export(selector, name):
            with page.expect_download(timeout=60000) as download: page.click(selector)
            path=OUT/name; download.value.save_as(path); return path
        svg=export('#city25Svg','northern-city.svg'); png=export('#city25Png','northern-city.png')
        check('SVG export contains the shared depth-ordered scene', 'data-perspective-scene="true"' in svg.read_text())
        check('PNG export succeeds with the tessellated surfaces', png.read_bytes()[:8]==b'\x89PNG\r\n\x1a\n')
        page.click('#city25Close')
        saved=export('#saveBtn','northern-atlas.megamap.json')
        page.set_input_files('#projectFile',str(saved)); page.wait_for_timeout(200)
        check('Save/reload does not regenerate the repaired city', js('JSON.stringify(MegamapApp.getScene().features)')==json.dumps(scene['features'], separators=(',',':'),ensure_ascii=False))
        page.click('#newWizard'); page.click('#wizardNext'); page.click('#wizardNext'); page.click('#wizardNext'); page.click('#cityPaintLoad')
        check('Saved sketch remains available for a non-destructive rebuild', js('MegamapCityPaint.currentPlan()')==fixture['options']['cityPlan'])
        page.click('#cityPaintPreviewButton'); page.wait_for_selector('#cityPaintPreview svg')
        check('Wizard can preview the same repaired sketch', page.locator('#cityPaint25D').is_visible())
        page.click('#cityPaint25D'); check('Wizard perspective uses the same surface mesh', page.locator('#city25Host svg').get_attribute('data-terrain-mesh')=='64')
        page.click('#city25Close'); page.click('#wizardClose')
        check('No unhandled browser errors', not errors)
        check('No runtime network requests', not remote)
        (OUT/'report.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'remoteRequests':remote,'browser':browser.version,'inline':a.inline},indent=2))
    except Exception:
        (OUT/'failure.json').write_text(json.dumps({'checks':checks,'errors':errors,'remoteRequests':remote},indent=2))
        page.screenshot(path=str(OUT/'failure.png'))
        raise
    finally: browser.close()
