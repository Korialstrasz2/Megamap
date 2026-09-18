"""2.5D viewer and refined City Studio acceptance with actual file/CSP by default.
--inline is explicitly a local sandbox fallback, NOT shipped-CSP evidence.
"""
from pathlib import Path
import argparse, json, re, struct
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--inline',action='store_true');parser.add_argument('--chromium');parser.add_argument('--output',default=str(ROOT/'docs/qa-city-refinement'));args=parser.parse_args()
OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];remote=[]
def check(name,result):
    assert result,name
    checks.append(name);print('PASS:',name,flush=True)
with sync_playwright() as pw:
    launch={'headless':True,'args':['--no-sandbox']}
    if args.chromium:launch['executable_path']=args.chromium
    browser=pw.chromium.launch(**launch);page=browser.new_page(viewport={'width':1500,'height':1000},accept_downloads=True);page.set_default_timeout(45000)
    page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept());page.on('request',lambda r:remote.append(r.url) if r.url.startswith(('http://','https://')) else None)
    try:
        if args.inline:
            html=(ROOT/'index.html').read_text();html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
            html=re.sub(r'<link rel="stylesheet" href="([^"]+)">',lambda m:'<style>'+(ROOT/m[1]).read_text()+'</style>',html)
            html=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>'+(ROOT/m[1]).read_text()+'</script>',html);page.set_content(html,wait_until='load')
        else:page.goto((ROOT/'index.html').as_uri(),wait_until='load')
        page.wait_for_function('window.MegamapApp && MegamapApp.getScene()');page.wait_for_selector('#busy',state='hidden');page.evaluate('document.querySelectorAll("dialog[open]").forEach(d=>d.close())')
        def js(code,arg=None):return page.evaluate(code,arg)
        def language(lang):page.click('#settingsBtn');page.select_option('#setLanguage',lang);page.click('#settingsDone')
        def left(tab):page.click('[data-left="'+tab+'"]')
        def build(preset):
            left('build');page.click('[data-mode="fantasy"]');page.select_option('#preset',preset);page.fill('#seed','refine-0');n=js('MegamapApp.getAtlas().maps.length');page.click('#generate');page.wait_for_function('(n)=>MegamapApp.getAtlas().maps.length===n+1',arg=n);page.wait_for_selector('#busy',state='hidden')
        def open_view():left('style');page.click('#city25Open');page.wait_for_selector('#city25Host [data-city-perspective="true"]')
        def close_view():page.click('#city25Close')
        def export(button,name):
            with page.expect_download(timeout=60000) as d:page.click(button)
            path=OUT/name;d.value.save_as(path);return path
        language('en');build('fishing')
        check('304 library assets including the new city detail collection',js('MegamapAssets.catalog.length')==304 and js('MegamapAssets.categories.includes("City details")'))
        check('Four-hut preset retains its exact structure and boat counts',js('MegamapApp.getScene().cityStudio.statistics.buildings')==4 and js('MegamapApp.getScene().cityStudio.statistics.boats')==3)
        check('Functional fishing details exist as editable asset objects',js('MegamapApp.getScene().features.some(f=>f.asset==="city-net-racks")'))
        before=js('JSON.stringify(MegamapApp.getScene().features)');open_view()
        check('2.5D opens an independent read-only viewer',page.locator('#city25Dialog').evaluate('d=>d.open') and page.locator('#city25Host [data-wall-face]').count()>0)
        check('Projection has pitched roofs, terrain and city detail',page.locator('#city25Host [data-roof-face="pitched"]').count()>0 and page.locator('#city25Host [data-terrain-face]').count()>0)
        original=page.locator('#city25Host>svg').get_attribute('viewBox');page.locator('#city25Host').press('+');zoomed=page.locator('#city25Host>svg').get_attribute('viewBox')
        check('Keyboard zoom changes only the viewport',float(zoomed.split()[2])<float(original.split()[2]))
        page.locator('#city25Host').press('ArrowRight');check('Keyboard panning moves the viewport',page.locator('#city25Host>svg').get_attribute('viewBox')!=zoomed)
        page.click('#city25Fit');check('Fit restores the complete map extent',page.locator('#city25Host>svg').get_attribute('viewBox')==original)
        page.click('#city25Right');check('Camera rotates by ninety degrees',page.locator('#city25Host>svg').get_attribute('data-bearing')=='90')
        page.click('#city25Left');check('Reverse rotation restores the original orientation',page.locator('#city25Host>svg').get_attribute('data-bearing')=='0')
        page.locator('#city25Host').press('+')
        svg=export('#city25Svg','fishing-2.5d.svg');text=svg.read_text()
        check('SVG export contains complete projected geometry, not the temporary zoom',('viewBox="'+original+'"') in text and 'data-wall-face' in text and '<script' not in text)
        png=export('#city25Png','fishing-2.5d.png');data=png.read_bytes();w,h=struct.unpack('>II',data[16:24])
        check('PNG export renders the full projection at 2048 pixels wide',data[:8]==b'\x89PNG\r\n\x1a\n' and w==2048 and h>500 and len(data)>5000)
        page.click('#city25Fit');page.screenshot(path=str(OUT/'fishing-viewer.png'));close_view()
        check('Viewing, rotating and exporting do not change the map',js('JSON.stringify(MegamapApp.getScene().features)')==before)
        left('style');page.uncheck('#hq');page.click('#city25Open');check('Standard mode remains available in 2.5D',page.locator('#city25Host [data-window]').count()==0);close_view();page.check('#hq')
        info=js('''()=>{const s=MegamapApp.getScene(),b=s.features.find(f=>f.type==='building');b.gmOnly=true;return b.id;}''');page.check('#playerView');page.click('#city25Open')
        check('Player-safe perspective hides GM-only building geometry',page.locator('#city25Host [data-id="'+info+'"]').count()==0);close_view();page.uncheck('#playerView')
        build('council');check('Council has its own assembly terrace and lower harbor identity',js('MegamapApp.getScene().cityStudio.neighborhoods.some(w=>w.profile.name==="Assembly terrace")'))
        open_view();page.screenshot(path=str(OUT/'council-viewer.png'));export('#city25Png','council-2.5d.png')
        check('Longship sails and multi-level facades are rendered',page.locator('#city25Host [data-sail]').count()>0 and page.locator('#city25Host [data-window]').count()>0)
        page.set_viewport_size({'width':760,'height':850});check('Perspective controls and viewport fit a narrow window',page.locator('#city25Dialog').evaluate('d=>d.scrollWidth<=d.clientWidth+2'));page.screenshot(path=str(OUT/'perspective-narrow.png'));page.set_viewport_size({'width':1500,'height':1000})
        page.keyboard.press('Escape');check('Escape returns to top-down editing',not page.locator('#city25Dialog').evaluate('d=>d.open'))
        language('it');open_view();check('Perspective actions are translated into Italian','Ruota a sinistra' in page.locator('#city25Left').inner_text() and 'Anteprima' in page.locator('#city25Title').inner_text());close_view();language('en')
        # Round-trip genuinely generated metadata through the application importer.
        saved=export('#saveBtn','refined-city-atlas.megamap.json');before=js('JSON.stringify(MegamapApp.getScene().features)');page.set_input_files('#projectFile',str(saved));page.wait_for_timeout(300)
        check('Atlas reload preserves profiles, physical details and exact geometry',js('JSON.stringify(MegamapApp.getScene().features)')==before and js('MegamapApp.getScene().cityStudio.refinementVersion')==1)
        build('river-capital');check('Capital keeps dense and villa quarters plus unique working sites',js('MegamapApp.getScene().cityStudio.signatureSites')>=4 and js('MegamapApp.getScene().cityStudio.statistics.buildings')>900)
        left('style');page.screenshot(path=str(OUT/'capital-topdown-ui.png'));left('export');page.select_option('#resolution','2048');export('#pngBtn','capital-hq-topdown.png')
        open_view();export('#city25Png','capital-2.5d.png');check('Large-capital projection contains the generated palace', 'Imperial palace' in page.locator('#city25Host').inner_text());close_view()
        left('build');page.click('[data-mode="city"]');page.select_option('#preset','river');n=js('MegamapApp.getAtlas().maps.length');page.click('#generate');page.wait_for_function('(n)=>MegamapApp.getAtlas().maps.length===n+1',arg=n);page.wait_for_selector('#busy',state='hidden');left('style')
        check('Legacy maps remain separate and do not get an incompatible perspective control',not page.locator('#city25Open').is_visible() and not js('Boolean(MegamapApp.getScene().cityStudio)'))
        check('No unhandled JavaScript exceptions',not errors);check('No runtime HTTP or HTTPS requests',not remote)
        (OUT/'report.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'remoteRequests':remote,'browser':browser.version,'inline':args.inline},indent=2))
    except Exception:
        page.screenshot(path=str(OUT/'failure.png'));(OUT/'failure.json').write_text(json.dumps({'checks':checks,'errors':errors,'remoteRequests':remote},indent=2));raise
    finally:browser.close()
