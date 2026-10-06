from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=Path(__file__).resolve().parent
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1100,'height':850})
    base='http://127.0.0.1:8094'
    assert context.request.post(base+'/login',form={'loginId':'owner','password':'qa-interpret-browser'},max_redirects=0).status==303
    client=context.request.post(base+'/clients',form={'displayName':'풀이 검증 고객','year':'1990','month':'5','day':'15','hour':'14','minute':'30','gender':'male','isLunar':'false','timeAccuracy':'exact','consentPurpose':'로컬 기능 검증','dataSubject':'self','enteredBy':'counselor'},max_redirects=0)
    path=client.headers['location'].split('?')[0]
    for module,form in [('tojeong',{'targetYear':'2026','leapMonthPolicy':'regular-month'}),('naming',{'mode':'recommend','surname':'김','surnameHanja':'金','school':'kangxi'})]:
        response=context.request.post(base+path+'/'+module,form=form,max_redirects=0)
        assert response.status==303, response.status
    session=context.request.post(base+path+'/sessions',max_redirects=0).headers['location']
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base+session)
    page.wait_for_load_state('networkidle')
    page.get_by_label('토정비결',exact=True).check()
    page.get_by_label('작명',exact=True).check()
    page.get_by_role('button',name='선택 주제 초안 생성').click()
    page.wait_for_load_state('networkidle')
    assert page.locator('.draft.auto').count()==2
    assert page.get_by_text('추천 기준:',exact=False).count()>0
    assert page.get_by_text('해설 상태:',exact=False).count()>0
    page.screenshot(path=str(out/'desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    page.get_by_label('토정비결',exact=True).scroll_into_view_if_needed()
    page.get_by_label('토정비결',exact=True).focus()
    page.keyboard.press('Tab')
    assert page.get_by_label('작명',exact=True).evaluate('(el)=>el===document.activeElement')
    page.screenshot(path=str(out/'mobile.png'),full_page=True)
    assert not errors,errors
    result={'checks':['Tojeong/naming topic labels and selection','two drafts without saju calculation','recommendation and unverified-content explanation shown','390px keyboard tab order','no browser errors']}
    (out/'browser.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))
    browser.close()
