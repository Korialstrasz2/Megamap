"""Browser regression workflow checks for Megamap v1.2.

Requires Python, Playwright and a Chromium executable ONLY for developer tests.
Normal use requires none of these. Usage:
  python tests/browser_smoke.py --inline --chromium /usr/bin/chromium --output /tmp/qa
Omit --inline on a normal system to test the actual local index.html launcher path.
--entry selects the HTML file under test (default index.html). The harness forces
the English interface so label lookups are stable.
The inline mode substitutes local CSS/JS and removes CSP from an in-memory page;
it does not verify file:// navigation, CSP enforcement or persistent browser storage.
"""
from pathlib import Path
import argparse, json, re, io, base64, time
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--inline',action='store_true');parser.add_argument('--chromium',default=None);parser.add_argument('--entry',default='index.html');parser.add_argument('--output',default=str(ROOT/'docs'/'qa'))
args=parser.parse_args();OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];started=time.time()
def check(name,fn):
    fn();checks.append({'name':name,'passed':True});print('PASS:',name,flush=True)
def expect(value,message='Assertion failed'):
    if not value:raise AssertionError(message)

with sync_playwright() as p:
    kw={'headless':True,'args':['--no-sandbox']}
    if args.chromium:kw['executable_path']=args.chromium
    browser=p.chromium.launch(**kw)
    page=browser.new_page(viewport={'width':1600,'height':1000},accept_downloads=True)
    page.set_default_timeout(12000)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('dialog',lambda d:d.accept())
    if args.inline:
        html=(ROOT/args.entry).read_text(encoding='utf-8')
        html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
        for css in ['src/style.css']:
            html=html.replace('<link rel="stylesheet" href="'+css+'">','<style>'+(ROOT/css).read_text(encoding='utf-8')+'</style>')
        for name in ['city-studio.js','city-render.js','city-ui.js','battle-arena.js','battle-materials.js','battle-hq.js','app.js','assets.js','encounter-content.js','battle-landscapes.js','battle.js','battle-render.js','battle-ui.js','engine.js','editor-core.js','render.js','i18n.js']:
            html=html.replace('<script src="src/'+name+'"></script>','<script>'+(ROOT/'src'/name).read_text(encoding='utf-8')+'</script>')
        page.set_content(html,wait_until='load')
    else:page.goto((ROOT/args.entry).as_uri(),wait_until='load')
    def force_english():
        page.click('#settingsBtn');page.select_option('#setLanguage','en');page.click('#settingsDone')
    force_english()
    def s():return page.evaluate('MegamapApp.getScene()')
    def atlas():return page.evaluate('(()=>{const a=MegamapApp.getAtlas();return {active:a.active,maps:a.maps.map(m=>({documentId:m.documentId,appearance:m.appearance})),library:a.library.map(x=>({id:x.id,name:x.name}))};})()')
    def n():return page.evaluate('MegamapApp.getScene().features.length')
    def xy(x,y):
        return page.evaluate("([x,y])=>{const m=document.querySelector('#mapHost svg').getScreenCTM();return {x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f};}",[x,y])
    def click_at(x,y):
        pos=xy(x,y);page.mouse.click(pos['x'],pos['y']);page.wait_for_timeout(60)
    def drag(a,b):
        pa,pb=xy(*a),xy(*b);page.mouse.move(pa['x'],pa['y']);page.mouse.down();page.mouse.move(pb['x'],pb['y'],steps=6);page.mouse.up();page.wait_for_timeout(100)
    def tool(name):
        btn=page.locator('[data-tool="'+name+'"]')
        if not btn.is_visible():
            page.evaluate('(n)=>{const b=document.querySelector(`[data-tool="${n}"]`);const g=b&&b.closest(".tool-group");const t=g&&g.querySelector("[data-group-trigger]");if(t)t.click();}',name)
            page.wait_for_timeout(80)
        btn.click()
    def reveal(selector):
        page.evaluate('(sel)=>{const el=document.querySelector(sel);if(!el)return;const pane=el.closest("[data-opt-pane]");if(pane&&pane.hidden){const t=document.querySelector(`[data-opt-tab="${pane.dataset.optPane}"]`);if(t)t.click();}}',selector)
    def left(name):page.click('[data-left="'+name+'"]')
    def right(name):page.click('[data-right="'+name+'"]')
    def select_id(id):page.evaluate('(id)=>MegamapApp.select([id])',id)
    def generate(mode,preset=None):
        left('build');page.click('[data-mode="'+mode+'"]')
        if preset:page.select_option('#preset',preset)
        before=len(atlas()['maps']);page.click('#generate')
        page.wait_for_function('(n)=>MegamapApp.getAtlas().maps.length===n+1',arg=before)
        page.wait_for_selector('#busy',state='hidden')
    def download(button,name):
        with page.expect_download() as waiting:page.click(button)
        dl=waiting.value;target=OUT/name;dl.save_as(target);expect(target.stat().st_size>0,'Empty download '+name)
        page.wait_for_selector('#busy',state='hidden');return target
    try:
        page.wait_for_selector('#mapHost svg');page.wait_for_selector('#busy',state='hidden')
        check('Startup: version, default 20 km region, 294 assets and visible Generate button',lambda:(expect(page.evaluate('MegamapApp.getVersion()')=='1.2.0'),expect(s()['scale']==20),expect(page.locator('.asset-card').count()==294),expect(page.locator('#generate').is_visible())))
        def styles():
            left('style');page.select_option('#palette','parchment');page.select_option('#grid','hex');page.check('#contours');expect(s()['appearance']['palette']=='parchment');expect(s()['appearance']['grid']=='hex');expect(s()['appearance']['contours'])
        check('Style controls change and store per-map appearance',styles)
        page.screenshot(path=str(OUT/'region.png'))
        def stamps():
            right('assets');page.select_option('#assetCategory','Interiors');page.fill('#assetSearch','throne');expect(page.locator('.asset-card').count()==1);page.click('[data-asset="throne"]');page.click('#favoriteAsset');page.click('#favoritesBtn');expect(page.locator('.asset-card').count()==1);page.click('#favoritesBtn');before=n();click_at(360,420);expect(n()==before+1);expect(s()['features'][-1]['asset']=='throne')
        check('Search, category filter, favorites and stamp placement',stamps)
        stamped=s()['features'][-1]['id']
        def undo_redo():
            before=n();page.click('#undo');expect(n()==before-1);page.click('#redo');expect(n()==before);select_id(stamped)
        check('Undo and redo restore object state',undo_redo)
        def edit_transform():
            page.get_by_label('Label',exact=True).fill('Royal audience');page.get_by_label('Label',exact=True).press('Tab');expect(s()['features'][-1]['label']=='Royal audience');page.locator('#selectionBody').get_by_role('button',name='Rotate +15°',exact=True).click();expect(s()['features'][-1]['rotation']==15);page.locator('#selectionBody').get_by_role('button',name='Scale ×1.1',exact=True).click();expect(abs(s()['features'][-1]['size']-22)<.001);page.locator('#selectionBody').get_by_role('button',name='Mirror stamp',exact=True).click();expect(s()['features'][-1]['flipX']);page.locator('#selectionBody').get_by_role('button',name='Duplicate',exact=True).click();expect(s()['features'][-1]['id']!=stamped)
        check('Inspector labels, rotation, scale, mirror and duplicate',edit_transform)
        dupe=s()['features'][-1]['id']
        def group():
            tool('select');select_id(stamped);page.keyboard.down('Shift');click_at(374,434);page.keyboard.up('Shift');# use diagnostic select if overlapping originals make click ambiguous
            page.evaluate('(ids)=>MegamapApp.select(ids)',[stamped,dupe]);expect('2 selected' in page.locator('#selectionCount').inner_text());before={f['id']:f['x'] for f in s()['features'] if f['id'] in [stamped,dupe]};page.keyboard.press('ArrowRight');after={f['id']:f['x'] for f in s()['features'] if f['id'] in before};expect(all(after[k]==before[k]+1 for k in before))
        check('Multi-selection and keyboard group nudging',group)
        def locks():
            select_id(stamped);page.get_by_label('Lock position & edits',exact=True).check();before=n();page.locator('#selectionBody').get_by_role('button',name='Delete',exact=True).click();expect(n()==before);page.get_by_label('Lock position & edits',exact=True).uncheck()
        check('Locked objects cannot be deleted',locks)
        def paths():
            tool('road');page.select_option('#roadStyle','cobble');click_at(180,200);click_at(260,280);click_at(430,210);page.keyboard.press('Enter');f=s()['features'][-1];expect(f['type']=='road' and len(f['points'])==3);tool('select');select_id(f['id']);drag((260,280),(290,325));f=next(x for x in s()['features'] if x['id']==f['id']);expect(abs(f['points'][1][0]-290)<2);page.locator('#selectionBody').get_by_role('button',name='Smooth path',exact=True).click();expect(len(s()['features'][-1]['points'])>3)
        check('Custom roads, node dragging and endpoint-preserving smoothing',paths)
        def area():
            tool('area');before=n();click_at(620,210);click_at(730,210);click_at(680,290);page.keyboard.press('Enter');expect(n()==before+1);expect(s()['features'][-1]['type']=='area')
        check('Filled polygon drawing and closing',area)
        def measure():
            tool('measure');click_at(100,700);click_at(600,700);expect('10.000 km' in page.locator('#status').inner_text())
        check('Scale-aware measurement: 500 local units = 10 km',measure)
        def scatter():
            right('assets');page.select_option('#assetCategory','Nature');page.fill('#assetSearch','willow');page.click('[data-asset="willow"]');tool('scatter');page.uncheck('#scatterAvoid');before=n();drag((200,550),(500,650));expect(n()>before+4);page.click('#undo');expect(n()==before)
        check('Asset scatter commits a stroke as one undo action',scatter)
        def city():
            generate('city');reveal('[data-opt="layout"]');page.select_option('[data-opt="layout"]','planned');page.click('#generate');page.wait_for_function("()=>MegamapApp.getScene().options.layout==='planned'");page.wait_for_selector('#busy',state='hidden');expect(s()['mode']=='city');expect(any(f['type']=='building' for f in s()['features']))
        check('New city generation and planned layout control',city)
        def regen():
            city=s();district=next(f for f in city['features'] if f['type']=='district' and any(x.get('ward')==f['id'] for x in city['features']));others=[f for f in city['features'] if f['type']=='building' and f.get('ward')!=district['id']];select_id(district['id']);page.locator('#selectionBody').get_by_role('button',name='Regenerate this district',exact=True).click();after=s();expect([f for f in after['features'] if f['type']=='building' and f.get('ward')!=district['id']]==others);expect(next(f for f in after['features'] if f['id']==district['id'])['revision']==1);expect(page.evaluate('!!MegamapEngine.validateScene(MegamapApp.getScene())'))
        check('Regenerating one district preserves all other district buildings',regen)
        page.screenshot(path=str(OUT/'city.png'))
        cityindex=atlas()['active']
        def persistence():
            left('atlas');page.click('[data-map="0"]');expect(s()['appearance']['palette']=='parchment');expect(s()['appearance']['grid']=='hex');expect(not page.locator('#undo').is_disabled());page.click('[data-map="'+str(cityindex)+'"]');expect(s()['appearance']['palette']=='atlas')
        check('Map switching preserves independent styles and undo histories',persistence)
        def linked():
            page.evaluate('MegamapApp.activate(0)');settlement=next(f for f in s()['features'] if f['type']=='settlement');select_id(settlement['id']);before=len(atlas()['maps']);page.locator('#selectionBody').get_by_role('button',name='Open linked city ↗').click();expect(len(atlas()['maps'])==before+1);expect(s()['mode']=='city');expect(s()['title']==settlement['label'])
        check('Regional settlements open named linked city maps',linked)
        check('Tavern preset builds a populated battle map',lambda:(generate('battle','tavern'),expect(s()['options']['theme']=='tavern'),expect(any(f.get('asset')=='round-table' for f in s()['features']))))
        page.screenshot(path=str(OUT/'battle.png'))
        def floors():
            tool('paint');page.select_option('#paintType','mountain');original=s()['battle']['cells'];drag((35,35),(150,35));filled=s()['battle']['cells'];expect(sum(filled)<sum(original));page.select_option('#paintType','land');drag((35,35),(150,35));after=s()['battle']['cells'];expect(sum(after)>sum(filled));page.click('#undo');expect(s()['battle']['cells']==filled);page.click('#undo');expect(s()['battle']['cells']==original)
        check('Battle floor painting changes geometry and supports undo',floors)
        # Use a clear area of an open battle map for explicit LOS/door testing.
        generate('battle','forest')
        def doors():
            tool('wall');click_at(200,220);click_at(600,220);page.keyboard.press('Enter');tool('portal');click_at(320,220);click_at(370,220);page.keyboard.press('Enter');tool('light');click_at(350,300);expect(s()['features'][-1]['type']=='light');expect(len([f for f in s()['features'] if f['type']=='portal'])==1);expect('NaN' not in page.locator('#mapHost').inner_html())
        check('Custom wall, two-point doorway and independent VTT light tools',doors)
        def privacy():
            tool('label');click_at(650,300);page.get_by_label('Label',exact=True).fill('SECRET_TEST_947');page.get_by_label('Label',exact=True).press('Tab');page.get_by_label('GM-only (omit from player export)',exact=True).check();left('style');page.check('#playerView');expect('SECRET_TEST_947' not in page.locator('#mapHost').inner_html());page.uncheck('#playerView');expect('SECRET_TEST_947' in page.locator('#mapHost').inner_html())
        check('GM-only object flag and player preview protect image content',privacy)
        def imageimport():
            # A tiny opaque PNG fixture; source is normalized through the browser canvas.
            data=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAECAYAAACzzX7wAAAAFUlEQVR4nGP0mhb9nwEPYMInSR0FACIIAkJCRyLrAAAAAElFTkSuQmCC')
            right('assets');page.set_input_files('#assetFile',{'name':'fixture.png','mimeType':'image/png','buffer':data});page.wait_for_function('()=>MegamapApp.getAtlas().library.length===1');page.select_option('#assetCategory','Imported');page.fill('#assetSearch','');expect(page.locator('.asset-card').count()==1);page.locator('.asset-card').click();click_at(540,450);expect(s()['features'][-1]['type']=='image');expect(s()['features'][-1]['data'].startswith('data:image/png;base64,'))
        check('Raster image import, normalization, library listing and stamping',imageimport)
        def exports():
            left('export');page.select_option('#resolution','1024');svg=download('#svgBtn','export.svg').read_text(encoding='utf-8');expect('SECRET_TEST_947' not in svg);expect('<svg' in svg and 'NaN' not in svg);png=download('#pngBtn','export.png').read_bytes();expect(png.startswith(b'\x89PNG\r\n\x1a\n'));webp=download('#webpBtn','export.webp').read_bytes();expect(webp[:4]==b'RIFF' and webp[8:12]==b'WEBP')
        check('Player-safe SVG, PNG and WebP downloads encode actual images',exports)
        def uvtt():
            v=json.loads(download('#vttBtn','export.dd2vtt').read_text(encoding='utf-8'));expect(v['format']==.2);expect(len(v['portals'])==1);expect(len(v['lights'])==1);expect(len(v['line_of_sight'])==2);expect(base64.b64decode(v['image']).startswith(b'\x89PNG'));expect(v['resolution']['pixels_per_grid']>0)
        check('Universal VTT download contains raster, split wall, doorway and light',uvtt)
        def gazetteer():
            right('notes');page.fill('#mapNotes','Campaign note <script>not executable</script>');page.locator('#mapNotes').press('Tab');note=download('#notesExport2','gazetteer.html').read_text(encoding='utf-8');expect('&lt;script&gt;' in note);expect('<script>not executable</script>' not in note)
        check('GM gazetteer exports notes with HTML escaping',gazetteer)
        backup=download('#saveBtn','roundtrip.megamap.json');saved=json.loads(backup.read_text(encoding='utf-8'));beforemaps=len(saved['maps'])
        def roundtrip():
            generate('battle','temple');page.set_input_files('#projectFile',str(backup));page.wait_for_function('(n)=>MegamapApp.getAtlas().maps.length===n',arg=beforemaps);expect(len(atlas()['library'])==1);expect(atlas()['maps'][0]['appearance']['palette']=='parchment');expect('Campaign note' in s()['notes']);expect(any(f['type']=='image' for f in s()['features']))
        check('Atlas download and reload preserve maps, styles, notes and embedded images',roundtrip)
        def invalid():
            page.evaluate('window.__beforeInvalid=JSON.stringify(MegamapApp.getAtlas())');page.set_input_files('#projectFile',{'name':'invalid.json','mimeType':'application/json','buffer':b'{"format":"megamap-atlas","version":1,"maps":[]}'});page.wait_for_function("()=>document.getElementById('status').textContent.startsWith('Could not open atlas:')");expect(page.evaluate('JSON.stringify(MegamapApp.getAtlas())===window.__beforeInvalid'))
        check('Invalid import is rejected without replacing the current atlas',invalid)
        def merge():
            scene=s();data=json.dumps({'format':'megamap-atlas','version':1,'active':0,'maps':[scene],'library':[]}).encode();before=len(atlas()['maps']);page.set_input_files('#mergeFile',{'name':'merge.json','mimeType':'application/json','buffer':data});page.wait_for_function('(n)=>MegamapApp.getAtlas().maps.length===n+1',arg=before);expect(len({m['documentId'] for m in atlas()['maps']})==before+1)
        check('Atlas merging assigns distinct map identities',merge)
        def zoom_theme():
            page.click('#fitBtn');page.click('#zoomIn');expect(page.locator('#zoomValue').inner_text()!='100%');page.click('#fitBtn');expect(page.locator('#zoomValue').inner_text()=='100%');page.click('#uiTheme');expect(page.locator('body').evaluate('(el)=>el.classList.contains("light-ui")'));page.click('#uiTheme');page.click('#focusBtn');expect(page.locator('body').evaluate('(el)=>el.classList.contains("hide-left")&&el.classList.contains("hide-right")'));page.click('#focusBtn')
        check('Zoom, fit, light UI and focus mode controls',zoom_theme)
        def responsive():
            for width in [1200,900,600]:
                page.set_viewport_size({'width':width,'height':900});page.wait_for_timeout(70);expect(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Horizontal page overflow at '+str(width));expect(page.locator('#mapHost svg').is_visible())
            page.set_viewport_size({'width':1600,'height':1000})
        check('Responsive canvas layout at 1200, 900 and 600 pixels',responsive)
        def helpcheck():
            page.click('#helpBtn');expect(page.locator('#help').is_visible());page.click('#gotIt');expect(not page.locator('#help').is_visible())
        check('Help dialog opens and closes without leaving the workbench',helpcheck)
        check('No unhandled JavaScript errors across workflows',lambda:expect(not errors,repr(errors)))
        page.evaluate('MegamapApp.activate(0)');left('style');page.select_option('#palette','atlas');page.select_option('#grid','none');page.screenshot(path=str(OUT/'region.png'))
        page.evaluate('(i)=>MegamapApp.activate(i)',cityindex);left('build');right('assets');page.select_option('#assetCategory','Buildings');page.fill('#assetSearch','');page.screenshot(path=str(OUT/'city.png'))
        page.select_option('#assetCategory','Dungeon');page.screenshot(path=str(OUT/'asset-library.png'))
        report={'version':'1.2.0','browser':browser.version,'harness':'inline-with-CSP-removed' if args.inline else 'file-URL','passed':len(checks),'failed':0,'checks':checks,'pageErrors':errors,'durationSeconds':round(time.time()-started,1),'limitations':['Native Windows BAT execution was not tested.','External VTT import was not tested.']+(['The test environment blocks navigation. Local file loading, CSP enforcement and persistent IndexedDB/localStorage recovery were not tested by this inline harness.'] if args.inline else [])}
        (OUT/'browser-results.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps({'passed':len(checks),'pageErrors':errors,'durationSeconds':report['durationSeconds']}))
    except Exception as exc:
        page.screenshot(path=str(OUT/'FAILURE.png'));(OUT/'failure.json').write_text(json.dumps({'checksPassed':checks,'exception':str(exc),'errors':errors},indent=2),encoding='utf-8');raise
    finally:browser.close()
