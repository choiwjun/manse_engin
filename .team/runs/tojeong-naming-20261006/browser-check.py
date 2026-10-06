from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out = Path(__file__).resolve().parent
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1100, 'height': 850})
    base = 'http://127.0.0.1:8093'
    login = context.request.post(base+'/login',form={'loginId':'owner','password':'qa-personal-browser'},max_redirects=0)
    assert login.status == 303
    client = context.request.post(base+'/clients',form={'displayName':'브라우저 검증 고객','year':'1990','month':'5','day':'15','hour':'14','minute':'30','gender':'male','isLunar':'false','timeAccuracy':'exact','consentPurpose':'로컬 기능 검증','dataSubject':'self','enteredBy':'counselor'},max_redirects=0)
    assert client.status == 303
    path = client.headers['location'].split('?')[0]
    page = context.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base+path)
    page.wait_for_load_state('networkidle')
    assert page.get_by_role('button', name='개인 토정비결 계산').count()==1
    page.get_by_label('대상 연도 (필수)').fill('2026')
    page.get_by_role('button', name='개인 토정비결 계산').click()
    page.wait_for_load_state('networkidle')
    assert page.get_by_role('heading',name='토정비결 계산 결과').is_visible()
    assert page.get_by_text('해설 검증 대기',exact=False).count()==1
    recommendation = page.locator('form').filter(has=page.get_by_role('button',name='이름 후보 추천'))
    recommendation.get_by_label('한글 성 (필수)',exact=True).fill('김')
    recommendation.get_by_label('한자 성 (필수)',exact=True).fill('金')
    recommendation.get_by_role('button',name='이름 후보 추천').click()
    page.wait_for_load_state('networkidle')
    assert page.get_by_role('heading',name='작명 결과').is_visible()
    assert page.locator('.personal-tools article').count() == 6
    page.screenshot(path=str(out/'desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    page.get_by_role('heading',name='작명',exact=True).scroll_into_view_if_needed()
    page.screenshot(path=str(out/'mobile.png'),full_page=True)
    # Scope checks: all added visible controls have associated labels, and rows stack.
    missing=page.locator('.personal-tools input:not([type=hidden]), .personal-tools select').evaluate_all('(els)=>els.filter(e=>!e.labels?.length).map(e=>e.name)')
    assert not missing, missing
    directions=page.locator('.personal-tools .row').evaluate_all('(els)=>els.map(e=>getComputedStyle(e).flexDirection)')
    assert all(v=='column' for v in directions)
    page.locator('#rec-surname').focus()
    assert page.locator('#rec-surname').evaluate('(e)=>e===document.activeElement')
    page.keyboard.press('Tab')
    assert page.locator('#rec-surname-hanja').evaluate('(e)=>e===document.activeElement')
    assert not errors, errors
    report={'checks':['customer-specific Tojeong form/result','recommendation form and 6 candidates','all new visible controls labelled','390px stacked rows','keyboard tab order','no page errors'],'screenshots':['desktop.png','mobile.png']}
    (out/'browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False))
    browser.close()
