"""Smart brush and compounds acceptance. Default opens shipped file/CSP.
--inline is a sandbox fallback and is never claimed as file/CSP evidence.
"""
from pathlib import Path
import argparse,json,re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--inline',action='store_true');p.add_argument('--chromium');p.add_argument('--output',default=str(ROOT/'docs/qa-city-part2'));a=p.parse_args()
OUT=Path(a.output);OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];remote=[]
def check(name,value):
    assert value,name
    checks.append(name);print('PASS:',name,flush=True)
with sync_playwright() as pw:
    kw={'headless':True,'args':['--no-sandbox']}
    if a.chromium:kw['executable_path']=a.chromium
    browser=pw.chromium.launch(**kw);page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True);page.set_default_timeout(45000)
    page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept());page.on('request',lambda r:remote.append(r.url) if r.url.startswith(('http://','https://')) else None)
    try:
        if a.inline:
            html=(ROOT/'index.html').read_text();html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
            html=re.sub(r'<link rel="stylesheet" href="([^"]+)">',lambda m:'<style>'+(ROOT/m[1]).read_text()+'</style>',html)
            html=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>'+(ROOT/m[1]).read_text()+'</script>',html)
            page.set_content(html,wait_until='load')
        else:page.goto((ROOT/'index.html').as_uri(),wait_until='load')
        page.wait_for_function('window.MegamapApp && MegamapApp.getScene()');page.wait_for_selector('#busy',state='hidden')
        page.evaluate('document.querySelectorAll("dialog[open]").forEach(d=>d.close())')
        js=page.evaluate
        js("MegamapI18n.setLang('en')")
        js("MegamapApp.generate('fantasy','part2-browser',{preset:'river-capital',size:'city',relief:0,boatCount:0})");page.wait_for_selector('#busy',state='hidden')
        check('Normal generation includes physical complexes',js('MegamapApp.getScene().cityStudio.complexes.length')>=4)
        page.click('#newWizard');page.click('#wizardNext');page.click('#wizardNext');page.click('#wizardNext')
        check('Single Smart buildings brush is visible and selected',page.locator('[data-brush="smart"]').is_visible() and page.locator('[data-brush="smart"]').get_attribute('aria-pressed')=='true')
        check('Specific quarter colors are collapsed by default',not page.locator('[data-brush="temple"]').is_visible())
        page.click('#cityPaintSmartExample');check('Smart example enables a bounded four-stroke plan',page.is_checked('#cityPaintEnabled') and js('MegamapCityPaint.currentPlan().strokes.length')==4)
        canvas=page.locator('#cityPaintCanvas');canvas.scroll_into_view_if_needed();b=canvas.bounding_box()
        page.mouse.move(b['x']+b['width']*.19,b['y']+b['height']*.33);page.mouse.down();page.mouse.move(b['x']+b['width']*.23,b['y']+b['height']*.45,steps=10);page.mouse.up();page.wait_for_timeout(120)
        check('Pointer painting records smart intent',js('MegamapCityPaint.currentPlan().strokes.at(-1).role')=='smart')
        draft=js('JSON.stringify(MegamapCityPaint.currentPlan())');page.click('#cityPaintUndo');page.click('#cityPaintRedo');check('Smart stroke undo/redo preserves exact points',js('JSON.stringify(MegamapCityPaint.currentPlan())')==draft)
        page.locator('#cityPaintDetailed summary').click();check('Explicit districts remain available for hybrid planning',page.locator('[data-brush="temple"]').is_visible());page.locator('#cityPaintDetailed summary').click()
        page.screenshot(path=str(OUT/'smart-painter-en.png'))
        count=js('MegamapApp.getAtlas().maps.length');page.click('#cityPaintPreviewButton');page.wait_for_selector('#cityPaintPreview svg')
        check('Preview reports actual required-quarter coverage','Smart quarters' in page.locator('#cityPaintStatus').inner_text())
        check('Preview does not add an atlas map',js('MegamapApp.getAtlas().maps.length')==count)
        page.click('#cityPaint25D');check('Smart city has a direct 2.5D preview',page.locator('#city25Host [data-city-complex-label]').count()>=3);page.click('#city25Close')
        check('Closing perspective keeps the painted draft',js('JSON.stringify(MegamapCityPaint.currentPlan())')==draft)
        page.click('#wizardNext');page.wait_for_function('(n)=>MegamapApp.getAtlas().maps.length===n+1',arg=count);page.wait_for_selector('#busy',state='hidden')
        scene=js('MegamapApp.getScene()');report=scene['cityStudio']['smartCity']
        (OUT/'generated-scene.json').write_text(json.dumps(scene))
        check('Wizard finish uses the smart stroke program',scene['options']['cityPlan']==json.loads(draft))
        check('Required quarters have physical content',report['fulfilled']==report['required'])
        check('Painted capital includes the five complex families',{c['kind'] for c in scene['cityStudio']['complexes']}=={'fortress','temple','warehouse','park','square'})
        check('No inhabitants or generated narrative',not scene.get('population') and all(not f.get('notes') for f in scene['features']))
        check('All 304 asset definitions are bundled',js('MegamapAssets.catalog.length')==304)
        js("MegamapI18n.setLang('it')");page.wait_for_timeout(150)
        check('New complex labels follow Italian','Grande tempio' in page.locator('#mapHost').inner_text() and 'Fortezza interna' in page.locator('#mapHost').inner_text())
        page.screenshot(path=str(OUT/'smart-capital-it.png'))
        before=js('JSON.stringify(MegamapApp.getScene().features)');page.click('#city25Quick');check('Italian 2.5D includes localized complex labels','Fortezza interna' in page.locator('#city25Host').inner_text())
        page.screenshot(path=str(OUT/'smart-capital-25d.png'))
        def export(selector,name):
            with page.expect_download(timeout=60000) as download:page.click(selector)
            file=OUT/name;download.value.save_as(file);return file
        svg=export('#city25Svg','smart-capital-it.svg');png=export('#city25Png','smart-capital-it.png')
        check('Perspective exports include localized labels and valid PNG','Grande tempio' in svg.read_text() and png.read_bytes()[:8]==b'\x89PNG\r\n\x1a\n')
        page.click('#city25Close');check('Perspective and exports preserve geometry',js('JSON.stringify(MegamapApp.getScene().features)')==before)
        saved=export('#saveBtn','smart-city.megamap.json');page.set_input_files('#projectFile',str(saved));page.wait_for_timeout(250)
        check('Save/reload preserves smart mask, program and geometry',js('JSON.stringify(MegamapApp.getScene().features)')==before and js('JSON.stringify(MegamapApp.getScene().options.cityPlan)')==draft)
        page.click('#newWizard');page.click('#wizardNext');page.click('#wizardNext');page.click('#wizardNext');page.click('#cityPaintLoad')
        check('Smart plan can be recovered from the saved map',js('JSON.stringify(MegamapCityPaint.currentPlan())')==draft)
        check('Smart controls are translated','Edifici intelligenti' in page.locator('[data-brush="smart"]').inner_text())
        page.set_viewport_size({'width':650,'height':920});page.screenshot(path=str(OUT/'smart-painter-it-narrow.png'))
        check('Simple palette fits a narrow wizard',page.locator('#newWizardDialog').evaluate('d=>d.scrollWidth<=d.clientWidth+2'))
        page.click('#wizardClose');page.set_viewport_size({'width':1440,'height':1000})
        js("MegamapApp.generate('fantasy','normal-no-draft',{preset:'market',size:'village'})");page.wait_for_selector('#busy',state='hidden');check('Normal generation never silently reuses smart brush drafts',not js('Boolean(MegamapApp.getScene().cityStudio.paintPlan)'))
        check('No unhandled JavaScript exceptions',not errors);check('No runtime network requests',not remote)
        (OUT/'report.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'remoteRequests':remote,'browser':browser.version,'inline':a.inline},indent=2))
    except Exception:
        (OUT/'failure.json').write_text(json.dumps({'checks':checks,'errors':errors,'remoteRequests':remote},indent=2))
        try:page.screenshot(path=str(OUT/'failure.png'),timeout=5000)
        except Exception:pass
        raise
    finally:browser.close()
