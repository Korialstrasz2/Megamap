"""Architectural battle-map UI and export regression.
Requires Python + Playwright only for development. Omit --inline to test the
actual local-file launcher with CSP intact. --inline embeds local scripts/CSS
and removes CSP; it does not verify file navigation or storage persistence.
"""
from pathlib import Path
import argparse,json,re,time
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--inline',action='store_true');p.add_argument('--chromium',default=None);p.add_argument('--output',default=str(ROOT/'docs'/'qa-battle'));args=p.parse_args()
OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True);checks=[];errors=[];started=time.time()
def expect(value,message='Assertion failed'):
    if not value:raise AssertionError(message)
def check(name,fn):
    fn();checks.append({'name':name,'passed':True});print('PASS:',name,flush=True)
with sync_playwright() as p:
    opts={'headless':True,'args':['--no-sandbox']}
    if args.chromium:opts['executable_path']=args.chromium
    browser=p.chromium.launch(**opts);page=browser.new_page(viewport={'width':1500,'height':1000},accept_downloads=True);page.set_default_timeout(20000);page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
    if args.inline:
        html=(ROOT/'index.html').read_text(encoding='utf-8');html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
        html=re.sub(r'<link rel="stylesheet" href="([^"]+)">',lambda m:'<style>'+(ROOT/m[1]).read_text(encoding='utf-8')+'</style>',html)
        html=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>'+(ROOT/m[1]).read_text(encoding='utf-8')+'</script>',html)
        page.set_content(html,wait_until='load')
    else:page.goto((ROOT/'index.html').as_uri(),wait_until='load')
    def js(expr):return page.evaluate(expr)
    def build():
        count=js('MegamapApp.getAtlas().maps.length');page.click('#generate');page.wait_for_function('(n)=>MegamapApp.getAtlas().maps.length===n+1',arg=count);page.wait_for_selector('#busy',state='hidden')
    def expand():
        page.click('[data-zone-expand]');page.wait_for_selector('.zone-planner-dialog[open]')
    def close():
        page.keyboard.press('Escape');page.wait_for_selector('.zone-planner-dialog',state='detached')
    def download(button,name):
        with page.expect_download() as wait:page.click(button)
        path=OUT/name;wait.value.save_as(path);expect(path.stat().st_size>0);page.wait_for_selector('#busy',state='hidden');return path
    try:
        page.wait_for_selector('#mapHost svg');page.click('#settingsBtn');page.select_option('#setLanguage','en');page.click('#settingsDone');page.click('[data-mode="battle"]')
        def workspace():
            expect(page.locator('[data-zone]').count()==14);expand();expect(page.locator('[data-zone-card]').first.bounding_box()['height']>65);expect(page.locator('[data-zone-preview] svg').count()==1);page.screenshot(path=str(OUT/'planner-expanded.png'))
        check('Expandable planner has readable room cards and a real live blueprint',workspace)
        def catalogue():
            page.select_option('[data-zone-group]','all');page.fill('[data-zone-search]','pantry');expect(page.locator('[data-zone-insert]').count()==1);page.click('[data-zone-insert="pantry"]');expect(page.locator('[data-zone]').count()==15);page.click('[data-zone-up="14"]');expect(page.locator('[data-zone]').nth(13).input_value()=='pantry');page.click('[data-zone-copy="13"]');expect(page.locator('[data-zone]').count()==16);page.click('[data-zone-remove="14"]');expect(page.locator('[data-zone]').count()==15)
        check('Search, catalogue insertion, reorder, duplicate and remove work together',catalogue)
        def settings():
            page.locator('[data-zone-detail="3"] summary').click();page.fill('[data-zone-label="3"]','South kitchen & pantry');page.select_option('[data-zone-size="3"]','large');page.select_option('[data-zone-access="3"]','service');page.select_option('[data-zone-near="3"]','4');page.click('[data-zone-down="3"]');expect(page.locator('[data-zone-label="4"]').input_value()=='South kitchen & pantry');expect(page.locator('[data-zone-near="4"]').input_value()=='3');page.locator('[data-zone-drag="4"]').focus();page.keyboard.press('Alt+ArrowUp');close();build();d=js('MegamapApp.getScene().options.zoneDetails[3]');expect(d['label']=='South kitchen & pantry' and d['near']==4 and d['access']=='service')
        check('Per-room settings survive keyboard reorder and generation with adjacency remapped',settings)
        def home():
            page.select_option('[data-zone-template]','home');expect(page.locator('[data-zone]').count()==8);build();s=js('MegamapApp.getScene()');expect(s['options']['theme']=='dwelling' and s['options']['cols']==28);expect(s['battle']['generatorVersion']==2 and not s['battle']['diagnostics']['unplaced']);page.screenshot(path=str(OUT/'dwelling.png'))
        check('Household template applies its map dimensions and builds every room',home)
        def capacity():
            page.click('[data-zone-clear]');expect(page.locator('[data-zone]').count()==0);build();expect(js('MegamapApp.getScene().battle.rooms.length')==1);page.select_option('[data-zone-template]','home');expand()
            for _ in range(16):page.click('[data-zone-copy="0"]')
            expect(page.locator('[data-zone]').count()==24);expect(page.locator('[data-zone-add]').is_disabled());expect(page.locator('[data-zone-copy="0"]').is_disabled());page.click('[data-zone-fit]');expect('24 / 24' in page.locator('[data-zone-report]').inner_text());page.select_option('[data-zone-template]','monastery');close();build();expect(js('MegamapApp.getScene().battle.diagnostics.layout')=='axial');page.screenshot(path=str(OUT/'monastery.png'))
        check('Empty and 24-room programs, fit-to-program and axial monastery work',capacity)
        def exports():
            page.click('[data-left="export"]');page.select_option('#resolution','1024')
            svg=download('#svgBtn','monastery.svg').read_text();expect('data-battle-walls="architectural"' in svg and 'battle-tile' in svg and 'NaN' not in svg)
            download('#pngBtn','monastery-export.png');vtt=json.loads(download('#vttBtn','monastery.dd2vtt').read_text());expect(len(vtt['portals'])>5 and len(vtt['line_of_sight'])>5 and len(vtt['image'])>100)
            atlas=json.loads(download('#saveBtn','battle.megamap.json').read_text());expect(atlas['maps'][-1]['battle']['generatorVersion']==2);expect('zoneDetails' in atlas['maps'][-1]['options'])
        check('SVG, PNG, VTT door openings and editable atlas exports retain architecture',exports)
        def responsive():
            page.click('[data-left="build"]');expand();page.set_viewport_size({'width':540,'height':900});box=page.locator('.zone-planner-dialog').bounding_box();expect(box['x']>=0 and box['width']<=540);expect(page.locator('.zone-planner-dialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'));close();page.set_viewport_size({'width':1500,'height':1000})
        check('Expanded planner fits a narrow viewport and closes with Escape',responsive)
        def language():
            page.click('#settingsBtn');page.select_option('#setLanguage','it');page.click('#settingsDone');expand();expect(page.locator('.zone-planner-dialog h2').inner_text()=='Progettazione zone di battaglia');close();page.click('#settingsBtn');page.select_option('#setLanguage','en');page.click('#settingsDone');expect(page.locator('[data-zone-expand]').inner_text()=='Expand planner')
        check('New planner labels switch between Italian and English',language)
        expect(not errors,'JavaScript errors: '+str(errors))
        report={'passed':len(checks),'checks':checks,'pageErrors':errors,'browser':browser.version,'harness':'inline (CSP removed)' if args.inline else 'local-file (CSP intact)','durationSeconds':round(time.time()-started,1),'limitations':['No external VTT importer or Windows BAT execution tested.']}
        (OUT/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
    except Exception as e:
        page.screenshot(path=str(OUT/'failure.png'));(OUT/'failure.json').write_text(json.dumps({'error':str(e),'checks':checks,'pageErrors':errors},indent=2));raise
    finally:browser.close()
