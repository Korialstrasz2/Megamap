"""Part 1: language-aware maps and direct 2.5D access.
Default verifies the actual file entry point and CSP. --inline is only a marked
sandbox fallback; never present it as shipped-CSP evidence.
"""
from pathlib import Path
import argparse,json,re,struct
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
a=argparse.ArgumentParser();a.add_argument('--inline',action='store_true');a.add_argument('--chromium');a.add_argument('--output',default=str(ROOT/'docs/qa-city-part1'));args=a.parse_args()
OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];remote=[]
def check(name,value):
    assert value,name
    checks.append(name);print('PASS:',name,flush=True)
with sync_playwright() as p:
    kw={'headless':True,'args':['--no-sandbox']}
    if args.chromium:kw['executable_path']=args.chromium
    browser=p.chromium.launch(**kw);page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
    page.set_default_timeout(45000);page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
    page.on('request',lambda r:remote.append(r.url) if r.url.startswith(('http://','https://')) else None)
    try:
        if args.inline:
            html=(ROOT/'index.html').read_text();html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
            html=re.sub(r'<link rel="stylesheet" href="([^"]+)">',lambda m:'<style>'+(ROOT/m[1]).read_text()+'</style>',html)
            html=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>'+(ROOT/m[1]).read_text()+'</script>',html)
            page.set_content(html,wait_until='load')
        else:page.goto((ROOT/'index.html').as_uri(),wait_until='load')
        page.wait_for_function('window.MegamapApp && MegamapApp.getScene()');page.wait_for_selector('#busy',state='hidden')
        page.evaluate('document.querySelectorAll("dialog[open]").forEach(d=>d.close())')
        def js(s,arg=None):return page.evaluate(s,arg)
        def language(lang):
            page.click('#settingsBtn');page.select_option('#setLanguage',lang);page.click('#settingsDone');page.wait_for_timeout(150)
        def build(preset='river-capital'):
            js("preset=>MegamapApp.generate('fantasy','part1-browser',{preset,size:'town'})",preset);page.wait_for_selector('#busy',state='hidden')
        def export(selector,name):
            with page.expect_download(timeout=60000) as download:page.click(selector)
            path=OUT/name;download.value.save_as(path);return path
        language('en');build();check('2.5D shortcut is visible without opening Style',page.locator('#city25Quick').is_visible())
        js("()=>{const s=MegamapApp.getScene();s.appearance.layers.districts=true;MegamapApp.render();}")
        stored=js('JSON.stringify(MegamapApp.getScene())')
        check('English city labels use the stock English names','Imperial palace' in page.locator('#mapHost').inner_text())
        language('it');check('Map title and civic label switch to Italian','Fiume Dorato' in page.input_value('#mapTitle') and 'Palazzo imperiale' in page.locator('#mapHost').inner_text())
        check('Stock district labels switch to Italian','Corti' in page.locator('#mapHost').inner_text() or 'Cantieri' in page.locator('#mapHost').inner_text())
        check('Language switch does not edit the stored scene',js('JSON.stringify(MegamapApp.getScene())')==stored)
        page.screenshot(path=str(OUT/'city-labels-it.png'))
        page.click('#city25Quick');check('Direct shortcut opens the Italian projection','Palazzo imperiale' in page.locator('#city25Host').inner_text() and 'Fiume Dorato' in page.locator('#city25MapName').inner_text())
        box=page.locator('#city25Host svg').get_attribute('viewBox');page.click('#city25ZoomIn');check('Visible zoom-in control changes the view',float(page.locator('#city25Host svg').get_attribute('viewBox').split()[2])<float(box.split()[2]))
        page.click('#city25ZoomOut');page.click('#city25Fit');check('Fit restores the whole city',page.locator('#city25Host svg').get_attribute('viewBox')==box)
        svg=export('#city25Svg','city-part1-it.svg');check('2.5D SVG export includes localized labels','Palazzo imperiale' in svg.read_text() and 'Vista assonometrica' in svg.read_text())
        png=export('#city25Png','city-part1-it.png');check('2.5D PNG export still works',png.read_bytes()[:8]==b'\x89PNG\r\n\x1a\n' and png.stat().st_size>5000)
        page.click('#city25Right');page.click('#city25Close');check('Closing returns focus to the direct shortcut',js('document.activeElement.id')=='city25Quick')
        page.click('#city25Quick');check('Last camera bearing is remembered',page.locator('#city25Host svg').get_attribute('data-bearing')=='90')
        js("MegamapI18n.setLang('en')");page.wait_for_timeout(150);check('Open projection updates to English without regeneration','Imperial palace' in page.locator('#city25Host').inner_text())
        js("MegamapI18n.setLang('it')");page.wait_for_timeout(150);check('Open projection returns to Italian','Palazzo imperiale' in page.locator('#city25Host').inner_text())
        page.set_viewport_size({'width':650,'height':900});page.screenshot(path=str(OUT/'city25-it-narrow.png'));check('Perspective fits narrow windows without horizontal overflow',page.locator('#city25Dialog').evaluate('d=>d.scrollWidth<=d.clientWidth+2'))
        page.keyboard.press('Escape');page.set_viewport_size({'width':1440,'height':1000});check('Escape closes the preview',not page.locator('#city25Dialog').evaluate('d=>d.open'))
        check('Viewing and exporting leave scene data unchanged',js('JSON.stringify(MegamapApp.getScene())')==stored)
        page.locator('#city25Quick').focus();page.keyboard.press('Shift+V');check('Shift+V opens 2.5D',page.locator('#city25Dialog').evaluate('d=>d.open'));page.keyboard.press('Escape')
        page.keyboard.press('v');check('Existing V selection shortcut remains available',not page.locator('#city25Dialog').evaluate('d=>d.open'))
        fid=js("()=>{const f=MegamapApp.getScene().features.find(f=>f.cityRole==='civic');MegamapApp.select([f.id]);return f.id;}")
        label=page.locator('#selectionBody label').filter(has_text=re.compile('^Etichetta$')).locator('input')
        check('Object inspector shows localized default labels',label.input_value()=='Palazzo imperiale')
        label.fill('Market');label.press('Tab');check('Editing a label marks it as verbatim custom content',js("id=>MegamapApp.getScene().features.find(f=>f.id===id).labelCustom",fid))
        for lang in ['en','it','en','it']:language(lang)
        check('Custom label matching a stock word survives repeated switches','Market' in page.locator('#mapHost').inner_text())
        js("()=>{const s=MegamapApp.getScene();s.features.push({id:'custom-note',type:'label',x:100,y:100,size:14,label:'Market'});MegamapApp.render();}")
        language('en');language('it');check('MutationObserver does not translate freehand map text',page.locator('#mapHost').inner_text().count('Market')>=2)
        page.fill('#mapTitle','Golden River');page.locator('#mapTitle').press('Tab');language('en');language('it');check('User map titles are kept exactly as entered',page.input_value('#mapTitle')=='Golden River')
        page.fill('#featureSearch','Market');check('Feature search finds custom labels',page.locator('#featureResults button').count()>=1)
        page.click('[data-left="export"]');top=export('#svgBtn','topdown-it.svg');check('Top-down SVG preserves custom text and localized defaults','Market' in top.read_text() and 'Corti' in top.read_text())
        saved=export('#saveBtn','part1-atlas.megamap.json');before=js('JSON.stringify(MegamapApp.getScene())');page.set_input_files('#projectFile',str(saved));page.wait_for_timeout(300)
        check('Saved labels and custom flags survive reload',js('JSON.stringify(MegamapApp.getScene())')==before)
        # Painting remains wizard-only; perspective preview creates no atlas map.
        page.click('#newWizard');page.click('#wizardNext');page.click('#wizardNext');page.click('#wizardNext');page.click('#cityPaintExample');page.click('#cityPaintPreviewButton');page.wait_for_selector('#cityPaintPreview svg');n=js('MegamapApp.getAtlas().maps.length')
        page.click('#cityPaint25D');check('Painted-plan preview opens directly in 2.5D',page.locator('#city25Dialog').evaluate('d=>d.open'))
        page.click('#city25Close');check('Closing preview returns to the paint wizard without adding a map',page.locator('#newWizardDialog').evaluate('d=>d.open') and js('MegamapApp.getAtlas().maps.length')==n)
        page.click('#wizardClose');js("MegamapApp.generate('city','part1-legacy',{districts:12})");check('Legacy maps do not expose an incompatible 2.5D shortcut',not page.locator('#city25Quick').is_visible())
        check('No unhandled JavaScript errors',not errors);check('No runtime network requests',not remote)
        (OUT/'report.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'remoteRequests':remote,'browser':browser.version,'inline':args.inline},indent=2))
    except Exception:
        (OUT/'failure.json').write_text(json.dumps({'checks':checks,'errors':errors,'remoteRequests':remote},indent=2))
        try:page.screenshot(path=str(OUT/'failure.png'),timeout=5000)
        except Exception:pass
        raise
    finally:browser.close()
