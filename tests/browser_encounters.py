"""Six-encounter workflows. Default: actual file:// with shipped CSP intact.
--inline is a local developer fallback and does not verify CSP or file navigation.
"""
from pathlib import Path
import argparse, json, re
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--inline',action='store_true')
parser.add_argument('--chromium',default=None)
parser.add_argument('--output',default=str(ROOT/'docs'/'qa-encounters'))
args=parser.parse_args();OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(name,condition):
    assert condition,name
    checks.append(name);print('PASS:',name,flush=True)
with sync_playwright() as p:
    kw={'headless':True,'args':['--no-sandbox']}
    if args.chromium:kw['executable_path']=args.chromium
    browser=p.chromium.launch(**kw)
    page=browser.new_page(viewport={'width':1600,'height':1000},accept_downloads=True)
    page.set_default_timeout(15000)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('dialog',lambda d:d.accept())
    try:
        if args.inline:
            html=(ROOT/'index.html').read_text(encoding='utf-8')
            html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
            html=re.sub(r'<link rel="stylesheet" href="([^"]+)">',lambda m:'<style>'+(ROOT/m[1]).read_text(encoding='utf-8')+'</style>',html)
            html=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>'+(ROOT/m[1]).read_text(encoding='utf-8')+'</script>',html)
            page.set_content(html,wait_until='load')
        else:page.goto((ROOT/'index.html').as_uri(),wait_until='load')
        page.wait_for_function('()=>window.MegamapApp && MegamapApp.getScene()')
        page.wait_for_selector('#busy',state='hidden')
        page.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close())")
        def language(lang):
            page.click('#settingsBtn');page.select_option('#setLanguage',lang);page.click('#settingsDone')
        def count():return page.evaluate('MegamapApp.getAtlas().maps.length')
        def scene():return page.evaluate('MegamapApp.getScene()')
        def pick(selector,value):
            field=page.locator(selector).first.locator('xpath=ancestor::div[contains(concat(" ",normalize-space(@class)," ")," wizard-field ")][1]')
            more=field.locator('.wizard-more-choices')
            if more.count() and not more.evaluate('(el)=>el.open'):more.locator('summary').click()
            field.locator('[data-wizard-value="'+value+'"]').click();page.wait_for_timeout(100)
        language('en')
        themes=['forest-road','mountain-path','marsh-causeway','coastal-cove','mansion','castle']
        for index,theme in enumerate(themes):
            before=count();page.click('[data-left="build"]')
            page.click('#newWizard');page.click('#wizardBody [data-mode="battle"]')
            pick('#preset',theme);page.fill('#seed','browser-'+theme)
            page.click('#wizardNext')
            outdoor=index<4
            check(theme+': correct preview',page.locator('[data-outdoor-preview]' if outdoor else '.battle-workspace').count()==1)
            check(theme+': room-free or 13-room program',page.locator('[data-zone-card]').count()==(0 if outdoor else 13))
            page.click('#wizardNext')
            if outdoor:
                pick('[data-opt="routeWidth"]','2.5')
                check(theme+': landscape step translated on demand','Landscape' in page.locator('#wizardTitle').inner_text())
                check(theme+': no room architecture controls',page.locator('[data-opt="condition"]').count()==0)
            else:
                pick('[data-opt="condition"]','abandoned')
            page.click('#wizardBack');page.click('#wizardNext')
            if outdoor:check(theme+': Back retains width',page.input_value('[data-opt="routeWidth"]')=='2.5')
            page.click('#wizardNext');page.click('#wizardNext')
            page.wait_for_function('(n)=>MegamapApp.getAtlas().maps.length===n+1',arg=before)
            page.wait_for_function('()=>!document.querySelector("#newWizardDialog").open')
            s=scene();check(theme+': generated correct map',s['options']['theme']==theme)
            check(theme+': settings restored in sidebar',page.locator('#leftPanel [data-opt="theme"]').input_value()==theme)
            if outdoor:check(theme+': generated no rooms or doors',not s['battle']['rooms'] and not any(f['type'] in ['room','portal'] for f in s['features']))
            else:check(theme+': all 13 rooms placed',len(s['battle']['rooms'])==13 and not s['battle']['diagnostics']['unplaced'])
            page.click('[data-left="export"]');page.select_option('#resolution','1024')
            for button,ext in [('#svgBtn','svg'),('#pngBtn','png'),('#vttBtn','dd2vtt')]:
                with page.expect_download(timeout=30000) as download:page.click(button)
                file=OUT/(theme+'-export.'+ext);download.value.save_as(file)
                check(theme+': '+ext+' export',file.stat().st_size>500)
                if ext=='dd2vtt':
                    data=json.loads(file.read_text());check(theme+': VTT door semantics',(len(data['portals'])==0) if outdoor else len(data['portals'])>0)
        language('it');page.click('[data-left="build"]');page.click('#newWizard');page.click('#wizardBody [data-mode="battle"]');pick('#preset','forest-road');page.click('#wizardNext');page.click('#wizardNext')
        check('Italian landscape label','Paesaggio' in page.locator('#wizardTitle').inner_text())
        check('Italian route width', 'Larghezza del percorso' in page.locator('#wizardBody').inner_text())
        page.click('#wizardRandomSection')
        check('Random outdoor fields stay valid',page.evaluate('Array.from(document.querySelectorAll("#wizardBody input[type=number]")).every(x=>x.checkValidity())'))
        page.screenshot(path=str(OUT/'italian-landscape-wizard.png'))
        page.set_viewport_size({'width':760,'height':850})
        check('Narrow wizard has no horizontal overflow',page.locator('#newWizardDialog').evaluate('(el)=>el.scrollWidth<=el.clientWidth+2'))
        page.screenshot(path=str(OUT/'narrow-landscape-wizard.png'));page.keyboard.press('Escape')
        page.set_viewport_size({'width':1600,'height':1000})
        check('Escape restores sidebar',page.locator('#leftPanel [data-opt="theme"]').count()==1)
        page.click('[data-right="assets"]');page.fill('#assetSearch','baldacchino')
        check('New asset searchable in Italian',page.locator('#assetPalette .asset-card').count()>0)
        with page.expect_download() as download:page.click('#saveBtn')
        atlas=OUT/'six-generated-atlas.megamap.json';download.value.save_as(atlas)
        page.set_input_files('#projectFile',str(atlas));page.wait_for_timeout(500)
        check('Saved atlas reopens with every new theme',set(themes).issubset(set(page.evaluate('MegamapApp.getAtlas().maps.map(s=>s.options.theme)'))))
        page.set_input_files('#projectFile',str(ROOT/'examples'/'Six-new-encounters.megamap.json'));page.wait_for_timeout(600)
        check('Bundled six-map atlas opens',count()==6)
        check('No unhandled browser errors',not errors)
        (OUT/'report.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'browser':browser.version,'inline':args.inline},indent=2),encoding='utf-8')
    except Exception:
        page.screenshot(path=str(OUT/'failure.png'));(OUT/'failure.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2));raise
    finally:browser.close()
