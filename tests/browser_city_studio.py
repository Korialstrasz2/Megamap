"""City Studio end-to-end acceptance.
Default opens the actual file:// entry point with its shipped CSP. --inline is
only a local sandbox fallback, strips CSP and is explicitly marked in reports.
"""
from pathlib import Path
import argparse, json, re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--inline',action='store_true');p.add_argument('--chromium');p.add_argument('--output',default=str(ROOT/'docs/qa-city-studio'));args=p.parse_args()
OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];remote=[]
def check(name,value):
    assert value,name
    checks.append(name);print('PASS:',name,flush=True)
with sync_playwright() as p:
    kw={'headless':True,'args':['--no-sandbox']}
    if args.chromium:kw['executable_path']=args.chromium
    browser=p.chromium.launch(**kw);page=browser.new_page(viewport={'width':1600,'height':1050},accept_downloads=True)
    page.set_default_timeout(45000);page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
    page.on('request',lambda r:remote.append(r.url) if r.url.startswith(('https://','http://')) else None)
    try:
        if args.inline:
            html=(ROOT/'index.html').read_text();html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
            html=re.sub(r'<link rel="stylesheet" href="([^"]+)">',lambda m:'<style>'+(ROOT/m[1]).read_text()+'</style>',html)
            html=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>'+(ROOT/m[1]).read_text()+'</script>',html)
            page.set_content(html,wait_until='load')
        else:page.goto((ROOT/'index.html').as_uri(),wait_until='load')
        page.wait_for_function('window.MegamapApp && MegamapApp.getScene()');page.wait_for_selector('#busy',state='hidden');page.evaluate('document.querySelectorAll("dialog[open]").forEach(d=>d.close())')
        def js(x,arg=None):return page.evaluate(x,arg)
        def left(x):page.click('[data-left="'+x+'"]')
        def language(x):page.click('#settingsBtn');page.select_option('#setLanguage',x);page.click('#settingsDone')
        def scene():return js('MegamapApp.getScene()')
        def count():return js('MegamapApp.getAtlas().maps.length')
        def build():
            n=count();page.click('#generate');page.wait_for_function('(n)=>MegamapApp.getAtlas().maps.length===n+1',arg=n);page.wait_for_selector('#busy',state='hidden')
        def preset(x):left('build');page.click('[data-mode="fantasy"]');page.select_option('#preset',x)
        def opt(key,value):
            sel='[data-opt="'+key+'"]'
            page.evaluate('''sel=>{const el=document.querySelector(sel),pane=el.closest('[data-opt-pane]');if(pane.hidden)document.querySelector('[data-opt-tab="'+pane.dataset.optPane+'"]').click();for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;}''',sel)
            el=page.locator(sel)
            if el.evaluate('el=>el.tagName')=='SELECT':el.select_option(str(value))
            elif el.get_attribute('type')=='checkbox':el.set_checked(bool(value))
            else:el.fill(str(value));el.press('Tab')
        def wizard_pick(sel,value):
            field=page.locator(sel).first.locator('xpath=ancestor::div[contains(concat(" ",normalize-space(@class)," ")," wizard-field ")][1]')
            more=field.locator('.wizard-more-choices')
            if more.count() and not more.evaluate('el=>el.open'):more.locator('summary').click()
            field.locator('[data-wizard-value="'+value+'"]').click();page.wait_for_timeout(80)
        def export(button,name):
            with page.expect_download(timeout=60000) as d:page.click(button)
            file=OUT/name;d.value.save_as(file);page.wait_for_selector('#busy',state='hidden');check(name+' downloads',file.stat().st_size>500);return file
        language('en');left('build')
        check('New Studio and legacy city are separate choices',page.locator('[data-mode="fantasy"]').count()==1 and page.locator('[data-mode="city"]').count()==1)
        preset('fishing');page.fill('#seed','landing-3')
        check('Ten curated fantasy presets',page.locator('#preset option').count()==11)
        check('Two main sections with advanced fields folded',page.locator('[data-opt-tab]').count()==2 and page.locator('details.city-exact[open]').count()==0)
        check('Recommended landing summary is explicit','four huts' in page.locator('#citySummary').inner_text().lower())
        build();s=scene()
        check('Exactly four huts and three small boats',s['cityStudio']['statistics']['buildings']==4 and s['cityStudio']['statistics']['boats']==3)
        check('No people or generated notes','population' not in s and all(not f.get('notes') for f in s['features']))
        check('HQ default on in current cartographic style',page.locator('#mapHost [data-city-ground="hq"]').count()==1)
        page.screenshot(path=str(OUT/'four-huts-studio.png'))
        before=js('JSON.stringify(MegamapApp.getScene().features)');left('style');page.uncheck('#hq')
        check('HQ can be disabled without changing geometry',page.locator('#mapHost [data-city-ground="standard"]').count()==1 and js('JSON.stringify(MegamapApp.getScene().features)')==before)
        check('Generator HQ state synchronized',not page.locator('[data-opt="hq"]').is_checked())
        page.click('#undo');check('Undo restores HQ',scene()['appearance']['hq'] is True);page.click('#redo');check('Redo restores standard',scene()['appearance']['hq'] is False);page.check('#hq')
        left('export');page.select_option('#resolution','1024');svg=export('#svgBtn','four-huts.svg');png=export('#pngBtn','four-huts.png');export('#webpBtn','four-huts.webp')
        text=svg.read_text();check('Standalone vector export has no external services','data-city-ground="hq"' in text and '<script' not in text and 'https://' not in text)
        check('VTT is not falsely offered for city scenes',page.locator('#vttBtn').is_disabled())
        preset('council');opt('rooftops',True);opt('underground',True);page.fill('#seed','qa-0');build();s=scene()
        check('Nordic settlement has relief, longhouses and a council hall',s['cityStudio']['ground']['relief']==155 and any(f.get('buildingKind')=='council-hall' for f in s['features']) and any(f.get('cityRoof')=='longhouse' for f in s['features']))
        check('Hillside architecture includes retaining structures',any(f.get('cityRole')=='retaining' for f in s['features']))
        roof=next(f for f in s['features'] if f.get('cityRole')=='roof-route');tunnel=next(f for f in s['features'] if f.get('cityRole')=='tunnel')
        before=js('JSON.stringify(MegamapApp.getScene().features)');left('style');page.select_option('#cityLevel','rooftops')
        check('Rooftop view reveals only compatible route overlays',page.locator('#mapHost [data-id="'+roof['id']+'"]').count()>0 and page.locator('#mapHost [data-id="'+tunnel['id']+'"]').count()==0)
        page.select_option('#cityLevel','underground');check('Underground view is a separate overlay',page.locator('#mapHost [data-id="'+tunnel['id']+'"]').count()>0)
        check('Changing city views preserves surface geometry',js('JSON.stringify(MegamapApp.getScene().features)')==before)
        page.select_option('#cityLevel','surface');page.screenshot(path=str(OUT/'council-hillside.png'))
        # Save/load the additive Studio data without procedural regeneration.
        saved=export('#saveBtn','studio-atlas.megamap.json');page.set_input_files('#projectFile',str(saved));page.wait_for_timeout(500)
        check('Atlas reload preserves Studio geometry and per-map HQ',js('JSON.stringify(MegamapApp.getScene().features)')==before and scene()['appearance']['hq'] is True)
        check('Reload returns to Studio rather than legacy controls',page.locator('[data-mode="fantasy"]').evaluate('el=>el.classList.contains("active")'))
        # Keep a locked building and regenerate only its neighborhood through UI.
        info=js('''()=>{const s=MegamapApp.getScene(),w=s.cityStudio.neighborhoods.find(w=>s.features.filter(f=>f.type==='building'&&f.ward===w.feature).length>8),b=s.features.find(f=>f.type==='building'&&f.ward===w.feature&&f.cityRole!=='civic');b.locked=true;b.label='Pinned';window.__locked=JSON.stringify(b);window.__ward=w.feature;window.__preRegen=JSON.stringify(s.features);MegamapApp.select([w.feature]);return {id:b.id,revision:w.revision};}''')
        page.select_option('#quarterProgram','noble');page.get_by_role('button',name='Regenerate this district',exact=True).click()
        check('Neighborhood program changes through the inspector',js('MegamapApp.getScene().features.find(f=>f.id===__ward).quarter')=='noble')
        check('Locked building retained exactly',js('(id)=>JSON.stringify(MegamapApp.getScene().features.find(f=>f.id===id))',info['id'])==js('__locked'))
        page.click('#undo');check('District regeneration is undoable',js('JSON.stringify(MegamapApp.getScene().features)===__preRegen'))
        # Real wizard shares the exact same controls; no separate fake preview.
        language('it');left('build');page.click('#newWizard');page.click('#wizardBody [data-mode="fantasy"]');wizard_pick('#preset','river-capital');page.click('#wizardNext')
        check('City wizard translated into Italian','Insediamento' in page.locator('#wizardTitle').inner_text() and 'Capitale imperiale' in page.locator('#citySummary').inner_text())
        check('HQ control exists in wizard',page.locator('#wizardBody [data-opt="hq"]').count()==1)
        page.screenshot(path=str(OUT/'city-wizard-italian.png'));page.set_viewport_size({'width':760,'height':850})
        check('Wizard fits a narrow screen',page.locator('#newWizardDialog').evaluate('el=>el.scrollWidth<=el.clientWidth+2'))
        page.set_viewport_size({'width':1600,'height':1050});page.click('#wizardNext');check('Customization is a separate optional step','Personalizza' in page.locator('#wizardTitle').inner_text())
        page.click('#wizardNext')  # Optional wizard-only painted plan; disabled by default.
        n=count();page.click('#wizardNext');page.wait_for_function('(n)=>MegamapApp.getAtlas().maps.length===n+1',arg=n);page.wait_for_selector('#busy',state='hidden');page.wait_for_function('!document.querySelector("#newWizardDialog").open')
        s=scene();check('Imperial capital generated from wizard with an armada',s['cityStudio']['statistics']['buildings']>900 and s['cityStudio']['statistics']['boats']==18)
        check('Palace is a real compound',any(f.get('cityRole')=='civic' and f.get('cityForm')=='court' for f in s['features']))
        language('en');left('style');page.select_option('#palette','parchment');page.screenshot(path=str(OUT/'golden-river-capital.png'));left('export');page.select_option('#resolution','2048');export('#pngBtn','golden-river-hq.png')
        # Other radically different sites work through the sidebar without advanced input.
        for choice in ['grove','crater','oasis','canal','citadel','colossus']:
            preset(choice);page.fill('#seed','studio-'+choice);build();s=scene()
            check(choice+' preset produces editable geometry',s['cityStudio']['statistics']['buildings']>50 and s['mode']=='city')
            page.screenshot(path=str(OUT/(choice+'.png')))
        preset('fishing');opt('landscape','plain');opt('boatCount',3);build()
        check('Conflicting water settings explain omitted boats',scene()['cityStudio']['statistics']['boats']==0 and 'No navigable water' in page.locator('#mapWarnings').inner_text())
        # Legacy remains genuinely independent and usable.
        left('build');page.click('[data-mode="city"]');check('Legacy shape and quarter controls are retained',page.locator('[data-opt="shape"] option').count()==12)
        page.select_option('#preset','river');build();check('Legacy generation remains the original engine',not scene().get('cityStudio') and 'shapeGuidance' in scene()['options'])
        check('No runtime network requests',not remote);check('No unhandled JavaScript exceptions',not errors)
        (OUT/'report.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'remoteRequests':remote,'browser':browser.version,'inline':args.inline},indent=2))
    except Exception:
        page.screenshot(path=str(OUT/'failure.png'));(OUT/'failure.json').write_text(json.dumps({'checks':checks,'errors':errors,'remoteRequests':remote},indent=2));raise
    finally:browser.close()
