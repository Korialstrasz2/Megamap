"""Megamap 1.2 UI/export regression. Python + Playwright are developer-only.
--inline is the sandbox harness: removes CSP and embeds source in an in-memory
page. It does NOT validate real file navigation, CSP, storage restart, Windows
BAT execution or an external VTT importer. Omit it on a normal desktop to use
file navigation. --entry selects the HTML file under test (default index.html).
The English interface is forced so label lookups are stable.
No network service or dependency is needed to run Megamap.
"""
from pathlib import Path
import argparse,json,re,time,base64,csv,io
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--inline',action='store_true');p.add_argument('--chromium',default=None);p.add_argument('--entry',default='index.html');p.add_argument('--output',default=str(ROOT/'docs'/'qa-v12'));args=p.parse_args()
OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True);checks=[];errors=[];start=time.time()
def expect(value,message='Assertion failed'):
    if not value:raise AssertionError(message)
def check(name,fn):
    fn();checks.append({'name':name,'passed':True});print('PASS:',name,flush=True)
with sync_playwright() as p:
    opts={'headless':True,'args':['--no-sandbox']}
    if args.chromium:opts['executable_path']=args.chromium
    browser=p.chromium.launch(**opts);page=browser.new_page(viewport={'width':1600,'height':1050},accept_downloads=True);page.set_default_timeout(20000);page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
    if args.inline:
        html=(ROOT/args.entry).read_text(encoding='utf-8');html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
        for css in ['src/style.css']:html=html.replace('<link rel="stylesheet" href="'+css+'">','<style>'+(ROOT/css).read_text(encoding='utf-8')+'</style>')
        for name in ['city-studio.js','city-render.js','city-ui.js','battle-arena.js','battle-materials.js','battle-hq.js','app.js','assets.js','encounter-content.js','battle-landscapes.js','battle.js','battle-render.js','battle-ui.js','engine.js','editor-core.js','render.js','i18n.js']:html=html.replace('<script src="src/'+name+'"></script>','<script>'+(ROOT/'src'/name).read_text(encoding='utf-8')+'</script>')
        page.set_content(html,wait_until='load')
    else:page.goto((ROOT/args.entry).as_uri(),wait_until='load')
    page.click('#settingsBtn');page.select_option('#setLanguage','en');page.click('#settingsDone')
    def js(expr):return page.evaluate(expr)
    def left(name):page.click('[data-left="'+name+'"]')
    def mode(name):left('build');page.click('[data-mode="'+name+'"]')
    def reveal(selector):
        page.evaluate('(sel)=>{const el=document.querySelector(sel);if(!el)return;const pane=el.closest("[data-opt-pane]");if(pane&&pane.hidden){const t=document.querySelector(`[data-opt-tab="${pane.dataset.optPane}"]`);if(t)t.click();}}',selector)
    def tool(name):
        btn=page.locator('[data-tool="'+name+'"]')
        if not btn.is_visible():
            page.evaluate('(n)=>{const b=document.querySelector(`[data-tool="${n}"]`);const g=b&&b.closest(".tool-group");const t=g&&g.querySelector("[data-group-trigger]");if(t)t.click();}',name)
            page.wait_for_timeout(80)
        btn.click()
    def opt(name,value):
        reveal('[data-opt="'+name+'"]')
        el=page.locator('[data-opt="'+name+'"]');tag=el.evaluate('(el)=>el.tagName');typ=el.get_attribute('type')
        if tag=='SELECT':el.select_option(str(value))
        elif typ=='checkbox':el.set_checked(bool(value))
        elif typ=='range':el.evaluate('(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}));}',str(value))
        else:el.fill(str(value));el.press('Tab')
    def build():
        count=js('MegamapApp.getAtlas().maps.length');page.click('#generate');page.wait_for_function('(n)=>MegamapApp.getAtlas().maps.length===n+1',arg=count);page.wait_for_selector('#busy',state='hidden')
    def click_at(x,y):
        p=page.evaluate('([x,y])=>{const m=document.querySelector("#mapHost svg").getScreenCTM();return {x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f};}',[x,y]);page.mouse.click(p['x'],p['y']);page.wait_for_timeout(70)
    def dl(button,name):
        with page.expect_download() as w:page.click(button)
        dest=OUT/name;w.value.save_as(dest);expect(dest.stat().st_size>0);page.wait_for_selector('#busy',state='hidden');return dest
    try:
        page.wait_for_selector('#mapHost svg');page.wait_for_selector('#busy',state='hidden')
        check('Five separate creation modes, including legacy city, and 278 bundled assets',lambda:(expect(page.locator('[data-mode]').count()==5),expect(page.locator('.asset-card').count()==278),expect(js('MegamapApp.getVersion()')=='1.2.0')))
        def shapes():
            mode('city');expect(page.locator('[data-opt="shape"] option').count()==12);opt('shape','l-shape');opt('shapeGuidance',100);opt('river',False);expect('Exact target envelope' in page.locator('#shapePreview').inner_text());opt('shapeGuidance',1);expect('Target ignored' in page.locator('#shapePreview').inner_text());opt('shapeGuidance',100)
        check('Twelve shape choices, live preview, guidance endpoints 1 and 100',shapes)
        def quarters():
            reveal('[data-program="quarters"]');page.click('[data-program="quarters"][data-choice="none"]')
            for q in ['temple','military','university','cemetery']:page.check('[data-subset="quarters"][value="'+q+'"]')
            expect(page.locator('#quartersCount').inner_text()=='4/15');build();expect(js('JSON.stringify([...new Set(MegamapApp.getScene().features.filter(f=>f.type==="district").map(f=>f.quarter))].sort())')=='["cemetery","military","temple","university"]')
            expect(js('MegamapApp.getScene().city.shape')=='l-shape');expect(js('MegamapApp.getScene().city.shapeGuidance')==100)
        check('Quarter checklist excludes unchecked programs and includes every checked type',quarters)
        def buildings():
            reveal('[data-program="buildings"]');page.locator('details.program-picker').nth(1).locator('summary').click();page.click('[data-program="buildings"][data-choice="none"]')
            for v in ['temple','barracks','college','mausoleum']:page.check('[data-subset="buildings"][value="'+v+'"]')
            build();expect(js('MegamapApp.getScene().features.filter(f=>f.type==="building").every(f=>["temple","barracks","college","mausoleum"].includes(f.buildingKind))'));expect(js('new Set(MegamapApp.getScene().features.filter(f=>f.type==="building").map(f=>f.buildingKind)).size')==4)
            expect(js('(()=>{const s=MegamapApp.getScene();return s.features.filter(f=>f.type==="building").every(f=>f.polygon.every(p=>MegamapEngine.pointOnOrInside(p,s.city.boundary,.001)));})()'))
        check('Building whitelist is enforced inside the exact concave city envelope',buildings)
        cityindex=js('MegamapApp.getAtlas().active')
        def roofs():
            expect(js('new Set(MegamapApp.getScene().features.filter(f=>f.type==="building").map(f=>f.roofAsset)).size')>=4);expect('clipPath' in page.locator('#mapHost').inner_html());page.click('[data-right="assets"]');page.select_option('#assetCategory','Quarter rooftops');expect(page.locator('.asset-card').count()>25)
        check('Distinct quarter rooftops render, and the new asset category is browsable',roofs)
        page.screenshot(path=str(OUT/'city-programs.png'))
        def regen():
            js('window.__quarter=MegamapApp.getScene().features.find(f=>f.type==="district"&&f.quarter==="military");window.__prior=JSON.stringify(MegamapApp.getScene().features);MegamapApp.select([__quarter.id])');page.select_option('#quarterProgram','temple');page.get_by_role('button',name='Regenerate this district',exact=True).click();expect(js('MegamapApp.getScene().features.find(f=>f.id===__quarter.id).quarter')=='temple');expect(js('MegamapApp.getScene().features.filter(f=>f.type==="building"&&f.ward===__quarter.id).every(f=>f.buildingKind==="temple")'));page.click('#undo');expect(js('JSON.stringify(MegamapApp.getScene().features)===__prior'))
        check('Changing one quarter program and undo preserve exact previous geometry',regen)
        def local_default():
            mode('local');page.select_option('#preset','woodland');build();expect(js('MegamapApp.getScene().mode')=='local');expect(js('MegamapApp.getScene().scale')==20);expect(js('MegamapApp.getScene().features.every(f=>f.type!=="settlement"&&f.type!=="road"&&f.asset!=="local-farmstead")'))
        check('Local region is distinct from campaign mode, defaults to 20 km and no villages or roads',local_default)
        def heights():
            opt('sizeKm',10);opt('averageHeight',1200);opt('heightDiversity',900);opt('biome','mountains');opt('water','none');opt('roads','footpath');opt('caves',3);build();t=js('(()=>{const t=MegamapApp.getScene().terrain;return {min:t.minM,max:t.maxM,mean:t.meanM,spacing:t.cellMeters};})()');expect(abs(t['mean']-1200)<.01);expect(abs(t['max']-t['min']-900)<.01);expect(t['spacing']==62.5);expect(js('MegamapApp.getScene().features.filter(f=>f.type==="road").length')>0);expect(js('MegamapApp.getScene().features.filter(f=>f.asset==="cave-mouth").length')==3)
        check('Local controls drive physical extent, mean/relief in metres, optional roads and cave count',heights)
        localindex=js('MegamapApp.getAtlas().active')
        def localstyle():
            left('style');page.select_option('#terrainDisplay','elevation');page.uncheck('#hillshade');page.select_option('#grid','hex-flat');page.fill('#gridSpacingKm','2');page.locator('#gridSpacingKm').press('Tab');expect(js('MegamapApp.getScene().appearance.terrainDisplay')=='elevation');expect(js('MegamapApp.getScene().appearance.hillshade')==False);expect('data-grid="hex-flat"' in page.locator('#mapHost').inner_html());expect('m spacing' in page.locator('#heightExportHint').inner_text());page.select_option('#grid','none');page.select_option('#terrainDisplay','landcover');page.check('#hillshade')
        check('Local elevation/land-cover, hillshade and kilometre hex-grid styles are independent',localstyle)
        def ruler():
            tool('measure');click_at(200,500);click_at(300,500);expect('1.000 km' in page.locator('#status').inner_text());expect('m' in page.locator('#coordinateReadout').inner_text())
        check('Local ruler uses 1 km for a tenth of a 10 km survey; cursor shows metre elevations',ruler)
        page.screenshot(path=str(OUT/'local-survey.png'))
        def csv_export():
            left('export');rows=list(csv.DictReader(io.StringIO(dl('#heightCsvBtn','local-elevations.csv').read_text(encoding='utf-8'))));expect(len(rows)==25600);expect(set(rows[0])=={'column','row','easting_m','northing_m','elevation_m'});expect(abs(sum(float(r['elevation_m']) for r in rows)/len(rows)-1200)<.01);expect(float(rows[0]['easting_m'])==31.25)
        check('Elevation CSV downloads all 25,600 metre-based samples with the requested mean',csv_export)
        def localgrid():
            data=json.loads(dl('#gridMetaBtn','local-grid.json').read_text(encoding='utf-8'));expect(data['mapSizeUnits']=={'width':10,'height':10,'units':'km'})
        check('Grid metadata export states the local map physical extent',localgrid)
        def pointy():
            mode('battle');page.select_option('#preset','forest');opt('gridType','hex-pointy');opt('mapShape','rectangle');build();expect(js('MegamapApp.getScene().appearance.grid')=='hex-pointy');expect('data-grid="hex-pointy"' in page.locator('#mapHost').inner_html())
        check('Pointy-top movement grid works independently of a rectangular outer boundary',pointy)
        def snap():
            page.click('[data-right="assets"]');page.select_option('#assetCategory','Nature');page.fill('#assetSearch','tree');page.click('[data-asset="tree"]');page.check('#snap');click_at(411,332);expect(js('(()=>{const s=MegamapApp.getScene(),f=s.features.at(-1),p=MegamapCore.snapPoint(s,[411,332]);return f.type==="asset"&&Math.hypot(f.x-p[0],f.y-p[1])<1e-6;})()'));page.uncheck('#snap')
        check('Stamp snapping lands at the rendered pointy-hex center, not square vertices',snap)
        def flat():
            left('build');opt('gridType','hex-flat');opt('mapShape','hex-flat');build();expect(js('MegamapApp.getScene().battle.boundary.length')==6);expect('data-grid="hex-flat"' in page.locator('#mapHost').inner_html());tool('asset');before=js('MegamapApp.getScene().features.length');click_at(40,40);expect(js('MegamapApp.getScene().features.length')==before)
        check('Flat-top play-area boundary clips the map and rejects stamps outside it',flat)
        hexindex=js('MegamapApp.getAtlas().active');page.screenshot(path=str(OUT/'hex-flat-workbench.png'))
        def hex_exports():
            left('export');page.select_option('#resolution','1024');svg=dl('#svgBtn','hex-flat.svg').read_text(encoding='utf-8');expect('data-grid="hex-flat"' in svg and '<clipPath' in svg and 'NaN' not in svg);png=dl('#pngBtn','hex-flat.png').read_bytes();expect(png.startswith(b'\x89PNG\r\n\x1a\n'));grid=json.loads(dl('#gridMetaBtn','hex-flat-grid.json').read_text(encoding='utf-8'));expect(grid['grid']['type']=='hex-flat');expect(grid['grid']['distance']==5);expect(grid['mapShape']=='hex-flat')
        check('Hex SVG, PNG and grid metadata exports preserve the selected orientation',hex_exports)
        def uvtt():
            v=json.loads(dl('#vttBtn','hex-flat.dd2vtt').read_text(encoding='utf-8'));expect(v['format']==.2);expect(v['megamap']['grid']['type']=='hex-flat');expect(base64.b64decode(v['image']).startswith(b'\x89PNG'))
        check('Universal VTT contains a real PNG and explicit Megamap hex-grid metadata',uvtt)
        def zones():
            mode('battle');page.select_option('#preset','dungeon');page.click('[data-opt-tab="encounter"]')
            rows=page.locator('[data-zone]').count();expect(rows==len(js('MegamapEngine.BATTLE_PLANS.dungeon')))
            page.locator('[data-zone-remove]').nth(rows-1).click();page.locator('[data-zone-remove]').nth(rows-2).click()
            expect(page.locator('[data-zone]').count()==rows-2)
            page.click('[data-zone-add]')
            values=page.eval_on_selector_all('[data-zone]','els=>els.map(e=>e.value)')
            expect(len(values)==rows-1 and values[-1]=='treasury','adding a zone continues the preset plan')
            page.locator('[data-zone]').nth(3).select_option('prison')
            values=page.eval_on_selector_all('[data-zone]','els=>els.map(e=>e.value)')
            build()
            expect(js('MegamapApp.getScene().battle.plan')==values,'generated plan must follow the edited program')
            expect(js('MegamapApp.getScene().features.filter(f=>f.type==="room").map(f=>f.label)[3]')=='Cells')
            expect(js('MegamapApp.getScene().features.some(f=>f.type==="portal")'),'planned rooms get doors')
            page.click('[data-zone-reset]')
            expect(page.eval_on_selector_all('[data-zone]','els=>els.map(e=>e.value)')==js('MegamapEngine.BATTLE_PLANS.dungeon'))
            page.select_option('[data-opt="theme"]','tavern')
            expect(page.eval_on_selector_all('[data-zone]','els=>els.map(e=>e.value)')==js('MegamapEngine.BATTLE_PLANS.tavern'),'changing the preset swaps in that plan')
        check('Zone program editor adds, removes, re-roles and resets per-preset plans',zones)
        def defaultgrid():
            mode('battle');page.select_option('#preset','dungeon');build()
            expect(js('MegamapApp.getScene().options.gridType')=='hex-flat' and js('MegamapApp.getScene().appearance.grid')=='hex-flat')
            expect(js('(()=>{const s=MegamapApp.getScene(),spec=MegamapCore.gridSpec(s),poly=MegamapCore.hexPolygon(0,0,spec.radius,spec.pointy),ys=poly.map(p=>p[1]);return poly.filter(p=>Math.abs(p[1]-Math.min(...ys))<1e-6).length===2;})()'),'flat-top hexes keep a flat edge on top')
        check('Battle maps default to flat-top hex movement cells',defaultgrid)
        def palettes():
            mode('battle');page.select_option('#preset','ice-cave');opt('gridType','hex-pointy');opt('mapShape','hex-pointy');build();expect(js('MegamapApp.getScene().appearance.palette')=='frost');expect(js('MegamapApp.getScene().appearance.grid')=='hex-pointy');expect(js('MegamapApp.getScene().battle.cells.some(Boolean)'));page.screenshot(path=str(OUT/'hex-pointy.png'))
        check('Cold-theme palette preserves pointy-hex grid and a nonempty clipped cave',palettes)
        def allprograms():
            mode('city');reveal('[data-program="quarters"]');page.click('[data-program="quarters"][data-choice="all"]');opt('shape','t-shape');opt('shapeGuidance',100);opt('districts',12);reveal('[data-program="buildings"]');page.locator('details.program-picker').nth(1).locator('summary').click();page.click('[data-program="buildings"][data-choice="all"]');build();expect(js('new Set(MegamapApp.getScene().features.filter(f=>f.type==="district").map(f=>f.quarter)).size')==15)
        check('All 15 quarter types remain present even when target blocks is set to 12',allprograms)
        def emptyprogram():
            reveal('[data-program="quarters"]');page.click('[data-program="quarters"][data-choice="none"]');build();expect(js('MegamapApp.getScene().features.every(f=>f.type!=="building")'))
        check('No quarters produces editable blank plots rather than silently adding unwanted buildings',emptyprogram)
        def roundtrip():
            page.evaluate('(i)=>MegamapApp.activate(i)',localindex);js('window.__snapshot=JSON.stringify(MegamapApp.getAtlas().maps)');backup=dl('#saveBtn','v12-roundtrip.megamap.json');page.set_input_files('#projectFile',str(backup));page.wait_for_function('()=>JSON.stringify(MegamapApp.getAtlas().maps)===window.__snapshot');expect(js('MegamapApp.getScene().options.heightDiversity')==900)
        check('Saved atlas round trip preserves new envelopes, programs, DEMs and hex settings exactly',roundtrip)
        def legacy():
            legacy=ROOT/'examples'/'Starter-atlas.megamap.json';data=json.loads(legacy.read_text(encoding='utf-8'));page.set_input_files('#projectFile',str(legacy));page.wait_for_function('(title)=>MegamapApp.getScene().title===title',arg=data['maps'][data['active']]['title']);expect(page.evaluate('(features)=>JSON.stringify(MegamapApp.getScene().features)===JSON.stringify(features)',data['maps'][data['active']]['features']))
        check('The shipped v1 starter atlas opens without regenerating its original geometry',legacy)
        check('No unhandled JavaScript errors in all v1.2 browser workflows',lambda:expect(not errors,str(errors)))
        report={'version':'1.2.0','browser':browser.version,'harness':'inline-with-CSP-removed' if args.inline else 'file-URL','passed':len(checks),'failed':0,'checks':checks,'pageErrors':errors,'durationSeconds':round(time.time()-start,1),'limitations':['Not a native Windows BAT execution test.','No external VTT import tested.']+(['Inline harness does not test file navigation, CSP enforcement or persistent browser storage recovery after restart.'] if args.inline else [])}
        (OUT/'browser-v12-results.json').write_text(json.dumps(report,indent=2));print(json.dumps({'passed':len(checks),'pageErrors':errors,'durationSeconds':report['durationSeconds']}))
    except Exception as e:
        page.screenshot(path=str(OUT/'FAILURE.png'));(OUT/'failure.json').write_text(json.dumps({'passed':checks,'exception':str(e),'pageErrors':errors},indent=2));raise
    finally:browser.close()
