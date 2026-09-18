"""Wizard-only semantic painting and housing acceptance. Default is real file/CSP.
--inline is a declared sandbox fallback, not local-file security verification.
"""
from pathlib import Path
import argparse,json,re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
a=argparse.ArgumentParser();a.add_argument('--inline',action='store_true');a.add_argument('--chromium');a.add_argument('--output',default=str(ROOT/'docs/qa-city-paint'));args=a.parse_args();OUT=Path(args.output);OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];remote=[]
def check(name,value):
 assert value,name
 checks.append(name);print('PASS:',name,flush=True)
with sync_playwright() as pw:
 launch={'headless':True,'args':['--no-sandbox']}
 if args.chromium:launch['executable_path']=args.chromium
 browser=pw.chromium.launch(**launch);page=browser.new_page(viewport={'width':1440,'height':1100},accept_downloads=True);page.set_default_timeout(45000)
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:remote.append(r.url) if r.url.startswith(('http://','https://')) else None);page.on('dialog',lambda d:d.accept())
 try:
  if args.inline:
   html=(ROOT/'index.html').read_text();html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>','',html)
   html=re.sub(r'<link rel="stylesheet" href="([^"]+)">',lambda m:'<style>'+(ROOT/m[1]).read_text()+'</style>',html)
   html=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>'+(ROOT/m[1]).read_text()+'</script>',html);page.set_content(html,wait_until='load')
  else:page.goto((ROOT/'index.html').as_uri(),wait_until='load')
  page.wait_for_function('window.MegamapApp && MegamapApp.getScene()');page.wait_for_selector('#busy',state='hidden');page.evaluate('document.querySelectorAll("dialog[open]").forEach(d=>d.close())')
  js=page.evaluate
  page.click('#settingsBtn');page.select_option('#setLanguage','en');page.click('#settingsDone');page.click('[data-left="build"]');page.click('[data-mode="fantasy"]');page.select_option('#preset','market');page.fill('#seed','paint-browser')
  check('Paint controls not present in sidebar',not page.locator('#cityPaintStep').is_visible() and page.locator('#generatorOptions #cityPaintCanvas').count()==0)
  page.click('#newWizard');page.click('#wizardNext');page.click('#wizardNext')
  # Pick a climate through the wizard's existing button controls.
  page.locator('[data-wizard-field="opt:climate"] [data-wizard-value="cold"]').click()
  page.click('#wizardNext');page.wait_for_selector('#cityPaintCanvas',state='visible')
  check('Paint is a separate City Studio wizard step',page.locator('#wizardTitle').inner_text()=='Paint a city plan')
  check('Disabled by default with labeled brushes',not page.is_checked('#cityPaintEnabled') and page.locator('[data-brush]').count()==21)
  page.click('#cityPaintExample');page.wait_for_timeout(150)
  check('Example enables the draft and has semantic strokes',page.is_checked('#cityPaintEnabled') and js('MegamapCityPaint.currentPlan().strokes.length')==11)
  # Actual pointer painting, capture, undo, redo and per-layer erase.
  def draw(role,points,width=100):
   if page.locator("#cityPaintDetailed").count():page.locator("#cityPaintDetailed").evaluate("el=>el.open=true")
   page.click('[data-brush="'+role+'"]');page.locator('#cityPaintSize').evaluate('(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}));}',width)
   canvas=page.locator('#cityPaintCanvas');canvas.scroll_into_view_if_needed();b=canvas.bounding_box()
   at=lambda p:(b['x']+b['width']*p[0]/1000,b['y']+b['height']*p[1]/1000)
   page.mouse.move(*at(points[0]));page.mouse.down()
   for point in points[1:]:page.mouse.move(*at(point),steps=8)
   page.mouse.up();page.wait_for_timeout(120)
  draw('temple',[(700,170),(770,180)],100)
  draft=js('JSON.stringify(MegamapCityPaint.currentPlan())');check('Pointer drag records the selected district role',js('MegamapCityPaint.currentPlan().strokes.at(-1).role')=='temple')
  page.click('#cityPaintUndo');check('Undo removes one complete stroke',js('MegamapCityPaint.currentPlan().strokes.length')==11)
  page.click('#cityPaintRedo');check('Redo restores the exact stroke',js('JSON.stringify(MegamapCityPaint.currentPlan())')==draft)
  page.click('#cityPaintEraser');page.locator('#cityPaintCanvas').focus();page.keyboard.press('Space');page.wait_for_timeout(100)
  check('Keyboard erase operates on districts only',js('MegamapCityPaint.currentPlan().strokes.at(-1).role')=='erase-districts');page.click('#cityPaintUndo')
  page.click('#wizardBack');page.click('#wizardNext');check('Back navigation preserves the draft',js('JSON.stringify(MegamapCityPaint.currentPlan())')==draft)
  page.screenshot(path=str(OUT/'painted-city-wizard.png'))
  n=js('MegamapApp.getAtlas().maps.length');page.click('#cityPaintPreviewButton');page.wait_for_selector('#cityPaintPreview svg',state='visible')
  check('Preview renders generated content without adding an atlas map',js('MegamapApp.getAtlas().maps.length')==n and page.locator('#cityPaintPreview [data-housing-climate="cold"]').count()>0)
  page.screenshot(path=str(OUT/'painted-city-preview.png'));page.click('#cityPaintBack')
  page.click('#wizardClose');check('Closing hides the painter and clears its generation gate',not page.locator('#cityPaintStep').is_visible() and js('MegamapCityPaint.currentPlan()') is None)
  # Normal sidebar generation must not use the pending sketch.
  page.click('#generate');page.wait_for_function('(n)=>MegamapApp.getAtlas().maps.length===n+1',arg=n);page.wait_for_selector('#busy',state='hidden')
  check('Sidebar generation remains unpainted',not js('MegamapApp.getScene().cityStudio.paintPlan || null'))
  page.click('#newWizard');page.click('#wizardNext');page.click('#wizardNext');page.click('#wizardNext')
  check('Reopening the wizard retains its independent draft',js('JSON.stringify(MegamapCityPaint.currentPlan())')==draft)
  n=js('MegamapApp.getAtlas().maps.length');page.click('#wizardNext');page.wait_for_function('(n)=>MegamapApp.getAtlas().maps.length===n+1',arg=n);page.wait_for_selector('#busy',state='hidden');page.wait_for_function('!document.querySelector("#newWizardDialog").open')
  s=js('MegamapApp.getScene()');check('Finish generates from the exact draft',s['options']['cityPlan']==json.loads(draft) and s['options']['climate']=='cold')
  check('Different painted housing tiers receive different buildings',any(f.get('cityWealth')=='affluent' for f in s['features']) and any(f.get('cityWealth')=='modest' for f in s['features']))
  check('No generated inhabitants or narrative',not s.get('population') and all(not f.get('notes') for f in s['features']))
  before=js('JSON.stringify(MegamapApp.getScene().features)')
  page.click('[data-left="style"]');page.uncheck('#hq');page.check('#hq');check('HQ switches without altering the painted layout',js('JSON.stringify(MegamapApp.getScene().features)')==before)
  page.click('#city25Open');page.wait_for_selector('#city25Host svg',state='visible');check('Painted scenes support the retained 2.5D viewer',page.locator('#city25Host [data-wall-face]').count()>0);page.screenshot(path=str(OUT/'painted-city-25d.png'));page.click('#city25Close')
  def export(selector,name):
   with page.expect_download(timeout=60000) as d:page.click(selector)
   path=OUT/name;d.value.save_as(path);page.wait_for_selector('#busy',state='hidden');return path
  saved=export('#saveBtn','Painted-City.megamap.json');page.set_input_files('#projectFile',str(saved));page.wait_for_timeout(500)
  check('Save/load preserves painted geometry and strokes',js('JSON.stringify(MegamapApp.getScene().features)')==before and js('JSON.stringify(MegamapApp.getScene().options.cityPlan)')==draft)
  page.click('[data-left="export"]');page.select_option('#resolution','2048');image=export('#pngBtn','painted-city-hq.png');svg=export('#svgBtn','painted-city.svg');check('PNG and standalone SVG export painted cities',image.stat().st_size>2000 and '<script' not in svg.read_text())
  # Translations, narrow viewport and avoiding a plan in other wizard types.
  page.click('#settingsBtn');page.select_option('#setLanguage','it');page.click('#settingsDone');page.click('#newWizard');page.click('#wizardNext');page.click('#wizardNext');page.click('#wizardNext')
  check('Italian paint step and brush labels',page.locator('#wizardTitle').inner_text()=='Dipingi una pianta urbana' and 'Abitazioni modeste' in page.locator('[data-brush="slums"]').inner_text())
  page.set_viewport_size({'width':650,'height':920});page.wait_for_timeout(180);check('Painter fits a narrow viewport',page.locator('#newWizardDialog').evaluate('el=>el.scrollWidth<=el.clientWidth+2'));page.screenshot(path=str(OUT/'painted-city-mobile-it.png'))
  page.click('#cityPaintClear');check('Clear removes the plan',not js('MegamapCityPaint.currentPlan().strokes.length'));page.click('#cityPaintUndo');check('Clear is undoable',js('JSON.stringify(MegamapCityPaint.currentPlan())')==draft)
  page.click('#wizardClose');page.set_viewport_size({'width':1440,'height':1100});page.click('[data-left="build"]');page.click('[data-mode="city"]');page.click('#newWizard');page.click('#wizardNext');page.click('#wizardNext');page.click('#wizardNext');check('Legacy wizard does not acquire the painter',not page.locator('#cityPaintStep').is_visible() and page.locator('#wizardNext').inner_text()=='Genera mappa');page.click('#wizardClose')
  check('No unhandled JavaScript exceptions',not errors);check('No runtime network requests',not remote)
  (OUT/'report.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'remoteRequests':remote,'browser':browser.version,'inline':args.inline},indent=2))
 except Exception:
  page.screenshot(path=str(OUT/'failure.png'));(OUT/'failure.json').write_text(json.dumps({'checks':checks,'errors':errors,'remoteRequests':remote},indent=2));raise
 finally:browser.close()
