"""Arena and HQ rendering, control, save and export workflows.
Default: real file:// navigation with the shipped CSP. --inline is only a local
fallback; it explicitly removes CSP and must not be reported as file/CSP testing.
"""
from pathlib import Path
import argparse, json, re, time
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--inline',action='store_true');p.add_argument('--chromium');p.add_argument('--output',default=str(ROOT/'docs/qa-arena-hq'));args=p.parse_args()
OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(name,value):
    assert value,name
    checks.append(name);print('PASS:',name,flush=True)
with sync_playwright() as p:
    kw={'headless':True,'args':['--no-sandbox']}
    if args.chromium:kw['executable_path']=args.chromium
    browser=p.chromium.launch(**kw);page=browser.new_page(viewport={'width':1600,'height':1000},accept_downloads=True)
    page.set_default_timeout(20000);page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
    try:
        if args.inline:
            html=(ROOT/'index.html').read_text()
            html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
            html=re.sub(r'<link rel="stylesheet" href="([^"]+)">',lambda m:'<style>'+(ROOT/m[1]).read_text()+'</style>',html)
            html=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>'+(ROOT/m[1]).read_text()+'</script>',html)
            page.set_content(html,wait_until='load')
        else:page.goto((ROOT/'index.html').as_uri(),wait_until='load')
        page.wait_for_function('()=>window.MegamapApp && MegamapApp.getScene()')
        page.wait_for_selector('#busy',state='hidden');page.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close())")
        def language(lang):
            page.click('#settingsBtn');page.select_option('#setLanguage',lang);page.click('#settingsDone')
        def count():return page.evaluate('MegamapApp.getAtlas().maps.length')
        def scene():return page.evaluate('MegamapApp.getScene()')
        def pick(sel,value):
            field=page.locator(sel).first.locator('xpath=ancestor::div[contains(concat(" ",normalize-space(@class)," ")," wizard-field ")][1]')
            more=field.locator('.wizard-more-choices')
            if more.count() and not more.evaluate('(el)=>el.open'):more.locator('summary').click()
            field.locator('[data-wizard-value="'+value+'"]').click();page.wait_for_timeout(100)
        def exported(button,ext,name):
            with page.expect_download(timeout=45000) as d:page.click(button)
            path=OUT/(name+'.'+ext);d.value.save_as(path);check(name+' '+ext+' export',path.stat().st_size>500);return path
        language('en');before=count()
        page.click('#newWizard');page.click('#wizardBody [data-mode="battle"]');pick('#preset','arena');page.fill('#seed','colosseum-hq')
        page.click('#wizardNext')
        check('Arena has preview without invented rooms',page.locator('[data-arena-preview] svg').count()==1 and page.locator('[data-zone-card]').count()==0)
        check('HQ enabled by default in wizard',page.locator('[data-opt="hq"]').is_checked())
        pick('[data-opt="hq"]','false');check('HQ can be switched off in wizard',not page.locator('[data-opt="hq"]').is_checked())
        pick('[data-opt="hq"]','true');page.click('#wizardNext')
        check('Dedicated Arena layout section','Arena layout' in page.locator('#wizardTitle').inner_text())
        pick('[data-opt="arenaTiers"]','3');pick('[data-opt="arenaCover"]','0')
        page.click('#wizardBack');page.click('#wizardNext')
        check('Back keeps Arena controls',page.locator('[data-opt="arenaTiers"]').input_value()=='3')
        page.screenshot(path=str(OUT/'arena-wizard.png'))
        page.click('#wizardNext');page.click('#wizardNext')
        page.wait_for_function('(n)=>MegamapApp.getAtlas().maps.length===n+1',arg=before)
        page.wait_for_function('()=>!document.querySelector("#newWizardDialog").open')
        s=scene();check('Arena generated with chosen settings',s['options']['theme']=='arena' and s['battle']['arena']['tiers']==3 and s['battle']['arena']['coverPlaced']==0)
        check('HQ texture tiles in map',page.locator('#mapHost [data-hq="terrain"]').count()==1 and page.locator('#mapHost image[href^="data:image/png"]').count()>0)
        before_geo=page.evaluate('JSON.stringify(MegamapApp.getScene().features)');before_count=count()
        page.click('[data-left="style"]');check('Post-generation HQ flag on',page.locator('#hq').is_checked());page.uncheck('#hq')
        check('Standard renderer restored',page.locator('#mapHost [data-hq]').count()==0)
        check('Style toggle does not regenerate',count()==before_count and page.evaluate('JSON.stringify(MegamapApp.getScene().features)')==before_geo)
        check('HQ state synchronized to sidebar',not page.locator('[data-opt="hq"]').is_checked())
        page.click('#undo');check('Undo restores HQ',scene()['appearance']['hq'] is True)
        page.click('#redo');check('Redo restores standard',scene()['appearance']['hq'] is False)
        page.check('#hq');page.select_option('#grid','none');page.click('[data-left="export"]');page.select_option('#resolution','1024')
        for button,ext in [('#svgBtn','svg'),('#pngBtn','png'),('#webpBtn','webp'),('#vttBtn','dd2vtt')]:
            file=exported(button,ext,'arena-hq')
            if ext=='svg':check('SVG embeds materials, not remote assets','data:image/png;base64,' in file.read_text() and '<script' not in file.read_text())
            if ext=='dd2vtt':
                data=json.loads(file.read_text());check('Arena VTT has walls and no fake doors',len(data['line_of_sight'])>100 and not data['portals'])
        # Low/HQ PNGs are rendered from exactly the same geometry.
        page.click('[data-left="style"]');page.uncheck('#hq');page.click('[data-left="export"]');plain=exported('#pngBtn','png','arena-standard')
        check('HQ raster differs from standard',plain.read_bytes()!=(OUT/'arena-hq.png').read_bytes())
        page.click('[data-left="style"]');page.check('#hq')
        for theme in ['forest-road','mountain-path','marsh-causeway','coastal-cove','mansion','castle','dungeon','ice-cave']:
            page.click('[data-left="build"]');page.select_option('#preset',theme);page.fill('#seed','hq-'+theme);n=count();page.click('#generate')
            page.wait_for_function('(n)=>MegamapApp.getAtlas().maps.length===n+1',arg=n);page.wait_for_selector('#busy',state='hidden')
            check(theme+': HQ defaults on',scene()['appearance']['hq'] is True)
            check(theme+': material layer visible',page.locator('#mapHost [data-hq="terrain"]').count()==1)
            page.click('[data-left="style"]');page.select_option('#grid','none');page.click('[data-left="export"]')
            exported('#pngBtn','png',theme+'-hq')
        with page.expect_download() as d:page.click('#saveBtn')
        saved=OUT/'arena-hq-atlas.megamap.json';d.value.save_as(saved)
        a=json.loads(saved.read_text());check('HQ saved per map',all('hq' in s['appearance'] for s in a['maps'] if s['mode']=='battle'))
        page.set_input_files('#projectFile',str(saved));page.wait_for_timeout(600)
        check('Saved HQ survives reload',scene()['appearance']['hq'] is True)
        language('it');page.click('[data-left="build"]');page.click('#newWizard');pick('#preset','arena');page.click('#wizardNext')
        check('Italian HQ label','HQ · materiali dettagliati e illuminazione' in page.locator('#wizardBody').inner_text())
        page.click('#wizardNext');check('Italian Arena controls','Gradoni delle tribune' in page.locator('#wizardBody').inner_text())
        page.click('#wizardRandomSection');check('Random Arena numeric values valid',page.evaluate('Array.from(document.querySelectorAll("#wizardBody input[type=number]")).every(x=>x.checkValidity())'))
        page.screenshot(path=str(OUT/'arena-italian.png'));page.set_viewport_size({'width':760,'height':850})
        check('Arena wizard fits a narrow display',page.locator('#newWizardDialog').evaluate('(el)=>el.scrollWidth<=el.clientWidth+2'))
        page.screenshot(path=str(OUT/'arena-narrow.png'));page.keyboard.press('Escape')
        check('No unhandled JavaScript errors',not errors)
        (OUT/'report.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'browser':browser.version,'inline':args.inline},indent=2))
    except Exception:
        page.screenshot(path=str(OUT/'failure.png'));(OUT/'failure.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2));raise
    finally:browser.close()
