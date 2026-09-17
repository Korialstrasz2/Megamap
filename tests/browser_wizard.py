"""Wizard workflows against the real app. Default: file:// with shipped CSP.
Use --inline only in restricted browser environments; it does NOT test CSP or
local-file navigation. Run: python tests/browser_wizard.py --output /tmp/wizard-qa
"""
from pathlib import Path
import argparse
import json
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--inline', action='store_true')
parser.add_argument('--chromium')
parser.add_argument('--output', default=str(ROOT / 'docs' / 'qa-wizard'))
args = parser.parse_args()
OUT = Path(args.output)
OUT.mkdir(parents=True, exist_ok=True)
checks, errors = [], []

def check(name, condition=True):
    assert condition, name
    checks.append(name)
    print('PASS:', name, flush=True)

with sync_playwright() as p:
    kwargs = {'headless': True, 'args': ['--no-sandbox']}
    if args.chromium:
        kwargs['executable_path'] = args.chromium
    browser = p.chromium.launch(**kwargs)
    page = browser.new_page(viewport={'width': 1600, 'height': 1000})
    page.set_default_timeout(15000)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('dialog', lambda d: d.accept())
    try:
        if args.inline:
            html = (ROOT / 'index.html').read_text(encoding='utf-8')
            html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]+>', '', html)
            html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: '<style>' + (ROOT / m[1]).read_text(encoding='utf-8') + '</style>', html)
            html = re.sub(r'<script src="([^"]+)"></script>', lambda m: '<script>' + (ROOT / m[1]).read_text(encoding='utf-8') + '</script>', html)
            page.set_content(html, wait_until='load')
        else:
            page.goto((ROOT / 'index.html').as_uri(), wait_until='load')
        page.wait_for_function('window.MegamapApp && MegamapApp.getScene()')
        page.wait_for_selector('#busy', state='hidden')
        page.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close())")
        check('Italian launch label', page.locator('#newWizard').inner_text() == 'Nuova procedura guidata')
        launch = page.locator('#newWizard').bounding_box()
        brand = page.locator('.brand').bounding_box()
        check('prominent button beside the title', launch['x'] >= brand['x'] + brand['width'] and launch['height'] >= 40)
        page.click('#settingsBtn')
        page.select_option('#setLanguage', 'en')
        page.click('#settingsDone')
        page.wait_for_function("document.querySelector('#newWizard').textContent==='New wizard'")

        def field(selector):
            return page.locator(selector).first.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " wizard-field ")][1]')

        def pick(selector, value):
            box = field(selector)
            more = box.locator('.wizard-more-choices')
            if more.count() and not more.evaluate('(x)=>x.open'):
                more.locator('summary').click()
            box.locator('[data-wizard-value="' + str(value) + '"]').click()
            page.wait_for_timeout(80)

        def open_wizard(mode):
            page.click('#newWizard')
            page.click('[data-mode="' + mode + '"]')
            page.wait_for_timeout(160)
            check(mode + ': original controls moved, not duplicated', page.locator('#generatorOptions').count() == 1 and page.locator('#wizardBody #generatorOptions').count() == 1)
            page.locator('#seed').fill('wizard-' + mode)
            page.wait_for_timeout(80)

        def finish():
            before = page.evaluate('MegamapApp.getAtlas().maps.length')
            page.click('#wizardNext')
            page.wait_for_function('!document.querySelector("#newWizardDialog").open')
            check('generation adds exactly one map', page.evaluate('MegamapApp.getAtlas().maps.length') == before + 1)
            check('sidebar restored without wizard wrappers', page.locator('#leftPanel #generatorOptions').count() == 1 and page.locator('.wizard-field').count() == 0)
            return page.evaluate('MegamapApp.getScene()')

        open_wizard('region')
        pick('#preset', 'valley')
        page.click('#wizardNext')
        check('existing section tabs hidden inside wizard', not page.locator('.opt-tabs').is_visible())
        pick('[data-opt="sizeKm"]', '100')
        exact = field('[data-opt="forest"]').locator('.wizard-field-controls input')
        exact.fill('1.4')
        page.click('#wizardNext')
        check('invalid exact value blocks navigation', page.locator('#wizardError').is_visible())
        exact.fill('0.65')
        page.click('#wizardNext')
        pick('[data-opt="settlements"]', '2')
        pick('[data-opt="poi"]', '0')
        page.click('#wizardBack')
        check('Back retains choices', page.locator('[data-opt="sizeKm"]').input_value() == '100')
        page.click('#wizardSkip')
        scene = finish()
        check('region settings reach generated scene', scene['options']['sizeKm'] == 100 and scene['options']['forest'] == .65 and scene['options']['settlements'] == 2 and scene['options']['poi'] == 0)

        for mode in ['local', 'city', 'battle']:
            open_wizard(mode)
            page.click('#wizardNext')
            count = page.locator('[data-opt-tab]').count()
            for index in range(count):
                page.click('#wizardRandomSection')
                page.wait_for_timeout(220)
                missing = page.locator('#generatorOptions').evaluate("root=>[...root.querySelectorAll('[data-opt],[data-subset],[data-zone],[data-zone-label],[data-zone-size],[data-zone-access],[data-zone-near]')].filter(x=>!x.closest('.wizard-field')?.querySelector('[data-wizard-random]')).length")
                check(mode + ': every setting has Random in step ' + str(index + 1), missing == 0)
                valid = page.locator('#generatorOptions').evaluate("root=>[...root.querySelectorAll('input[type=number],input[type=range]')].every(x=>x.checkValidity())")
                check(mode + ': section randomization respects ranges ' + str(index + 1), valid)
                if index < count - 1:
                    page.click('#wizardNext')
            chosen = page.locator('#generatorOptions').evaluate("root=>Object.fromEntries([...root.querySelectorAll('[data-opt]')].map(x=>[x.dataset.opt,x.type==='checkbox'?x.checked:['number','range'].includes(x.type)?Number(x.value):x.value]))")
            scene = finish()
            check(mode + ': correct generator selected', scene['mode'] == mode)
            check(mode + ': sidebar mirrors generated options', page.locator('[data-opt]').evaluate_all("xs=>xs.every(x=>{const v=MegamapApp.getScene().options[x.dataset.opt];return x.type==='checkbox'?x.checked===v:String(x.value)===String(v)})"))
            if mode != 'battle':
                check(mode + ': chosen settings retained', all(scene['options'].get(k) == v for k, v in chosen.items()))

        open_wizard('battle')
        pick('#preset', 'dwelling')
        page.click('#wizardNext')
        first = page.locator('[data-zone-card="0"]')
        first.locator('[data-zone-copy]').click()
        page.wait_for_timeout(160)
        page.locator('[data-zone-detail="1"]>summary').click()
        page.locator('[data-zone-label="1"]').fill('Wizard custom room')
        page.locator('[data-zone-label="1"]').press('Tab')
        pick('[data-zone-size="1"]', 'large')
        pick('[data-zone-access="1"]', 'private')
        page.screenshot(path=str(OUT / 'battle-planner.png'))
        page.click('#wizardNext')
        pick('[data-opt="entrySide"]', 'east')
        page.click('#wizardNext')
        pick('[data-opt="cols"]', '80')
        pick('[data-opt="rows"]', '80')
        scene = finish()
        check('custom room details survive generation', scene['options']['zoneDetails'][1]['label'] == 'Wizard custom room' and scene['options']['zoneDetails'][1]['size'] == 'large' and scene['options']['zoneDetails'][1]['access'] == 'private')
        check('architecture choice survives generation', scene['options']['entrySide'] == 'east')

        open_wizard('city')
        page.click('#wizardNext')
        pick('[data-opt="shape"]', 'hexagon')
        page.click('#wizardClose')
        check('closing retains settings without generation', page.locator('[data-opt="shape"]').input_value() == 'hexagon')
        check('source controls remain editable after close', page.locator('.wizard-native-choice').count() == 0)
        page.click('#newWizard')
        page.keyboard.press('Escape')
        check('Escape returns focus to launcher', page.locator('#newWizard').evaluate('(x)=>x===document.activeElement'))

        open_wizard('region')
        page.click('#wizardNext')
        page.click('#wizardNext')
        page.evaluate("document.querySelector('#generate').classList.add('atlas-full')")
        page.click('#wizardNext')
        check('full atlas refusal retains wizard', page.locator('#newWizardDialog').evaluate('(x)=>x.open') and page.locator('#wizardError').is_visible())
        page.evaluate("document.querySelector('#generate').classList.remove('atlas-full')")
        page.click('#wizardClose')

        page.click('#settingsBtn')
        page.select_option('#setLanguage', 'it')
        page.click('#settingsDone')
        page.click('#newWizard')
        check('Italian navigation after language switch', page.locator('#wizardNext').inner_text() == 'Avanti' and page.locator('#wizardRandomSection').inner_text() == 'Rendi casuale la sezione')
        page.screenshot(path=str(OUT / 'wizard-italian.png'))
        page.set_viewport_size({'width': 720, 'height': 900})
        check('wizard fits narrow viewport', page.locator('#newWizardDialog').evaluate('(x)=>x.getBoundingClientRect().width<=innerWidth'))
        page.screenshot(path=str(OUT / 'wizard-narrow.png'))
        page.click('#wizardClose')
        check('no unhandled browser errors', not errors)
        (OUT / 'report.json').write_text(json.dumps({'passed': len(checks), 'checks': checks, 'errors': errors, 'browser': browser.version, 'inline': args.inline}, indent=2), encoding='utf-8')
    except Exception:
        page.screenshot(path=str(OUT / 'failure.png'))
        (OUT / 'failure.json').write_text(json.dumps({'checks': checks, 'errors': errors}, indent=2), encoding='utf-8')
        raise
    finally:
        browser.close()
