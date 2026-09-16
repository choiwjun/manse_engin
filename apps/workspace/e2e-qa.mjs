// E2E QA — 실제 HTTP 서버를 띄워 전체 플로우를 검증한다.
// 실행: node e2e-qa.mjs  (테스트용 DB·포트 8090을 사용, 기존 데이터와 격리)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 8090;
const BASE = `http://localhost:${PORT}`;
const BOOTSTRAP_TOKEN = 'qa-token-123';
const OWNER_PW = 'qa-owner-pass-123';

const tmp = mkdtempSync(path.join(tmpdir(), 'myeong-qa-'));
const server = spawn(process.execPath, [fileURLToPath(new URL('./server.mjs', import.meta.url))], {
  env: { ...process.env, PORT: String(PORT), STORE_PATH: path.join(tmp, 'qa.sqlite'), MYEONG_TOKEN: BOOTSTRAP_TOKEN, MYEONG_PASSWORD: OWNER_PW },
  stdio: 'pipe',
});
server.stderr.on('data', (d) => process.stderr.write(`[srv] ${d}`));

let pass = 0, fail = 0;
const jar = new Map(); // name → cookie string
function cookies(name) { return jar.get(name) ?? ''; }
async function req(method, url, { body, session } = {}) {
  const headers = {};
  if (session) headers.cookie = cookies(session);
  if (body) headers['content-type'] = 'application/x-www-form-urlencoded';
  // 배열 값은 반복 키로 직렬화한다 (topics=a&topics=b)
  let encoded;
  if (body) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      for (const item of Array.isArray(v) ? v : [v]) p.append(k, item);
    }
    encoded = p.toString();
  }
  const res = await fetch(`${BASE}${url}`, {
    method, headers, redirect: 'manual',
    body: encoded,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie && session) {
    const kv = setCookie.split(';')[0];
    jar.set(session, `${jar.get(session) ? `${jar.get(session)}; ` : ''}${kv}`);
  }
  const text = await res.text();
  return { status: res.status, text, location: res.headers.get('location') ?? '' };
}
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${extra}`); }
}

await new Promise((r) => setTimeout(r, 1500));

try {
  console.log('== 인증 ==');
  check('비로그인 → 로그인 리다이렉트', (await req('GET', '/')).status === 303);
  const bad = await req('POST', '/login', { body: { loginId: 'owner', password: 'wrong' }, session: 'bad' });
  check('잘못된 비밀번호 → 401', bad.status === 401);
  const login = await req('POST', '/login', { body: { loginId: 'owner', password: OWNER_PW }, session: 'me' });
  check('owner 로그인 → 303', login.status === 303);
  check('로그인 후 대시보드 200', (await req('GET', '/', { session: 'me' })).status === 200);
  const boot = await req('POST', '/login', { body: { loginId: 'bootstrap', password: BOOTSTRAP_TOKEN }, session: 'boot' });
  check('bootstrap+토큰 로그인 → 303', boot.status === 303);

  console.log('== 고객·계산 ==');
  const mk = await req('POST', '/clients', { session: 'me', body: {
    displayName: 'QA고객', contact: '010-9999-0000',
    year: '1988', month: '7', day: '20', hour: '14', minute: '30', gender: 'female',
    isLunar: 'false', birthPlace: '서울', timeAccuracy: 'exact',
    consentPurpose: '사주 상담', dataSubject: 'self', enteredBy: 'counselor', intakePurpose: '직업 상담',
  }});
  check('고객 등록 → 303', mk.status === 303);
  const clientId = mk.location.split('/clients/')[1]?.split('?')[0];
  check('고객 ID 발급', /^cli_/.test(clientId ?? ''), mk.location);
  check('고객 페이지 200', (await req('GET', `/clients/${clientId}`, { session: 'me' })).status === 200);
  const calc = await req('POST', `/clients/${clientId}/calc`, { session: 'me' });
  check('명식 계산 → 303', calc.status === 303);
  const detail = await req('GET', `/clients/${clientId}`, { session: 'me' });
  check('스냅샷 "최신" 표시', detail.text.includes('최신'));

  console.log('== 세션·초안·검수 ==');
  const sess = await req('POST', `/clients/${clientId}/sessions`, { session: 'me' });
  const sessionId = sess.location.split('/sessions/')[1];
  check('세션 생성', /^ses_/.test(sessionId ?? ''), sess.location);
  const sessPage0 = await req('GET', `/sessions/${sessionId}`, { session: 'me' });
  check('세션 화면에 만세력표 렌더', sessPage0.text.includes('만세력표') && sessPage0.text.includes('class="ms"') && sessPage0.text.includes('지장간'));
  const dr = await req('POST', `/sessions/${sessionId}/drafts`, { session: 'me', body: { topics: ['career', 'wealth', 'year'] } });
  check('초안 생성 → 303', dr.status === 303);
  const sessPage = await req('GET', `/sessions/${sessionId}`, { session: 'me' });
  const approvePaths = [...sessPage.text.matchAll(/action="(\/drafts\/[^/]+\/approve)"/g)].map((m) => m[1]);
  check('초안 3건 생성', approvePaths.length === 3, `got ${approvePaths.length}`);
  for (const p of approvePaths) await req('POST', p, { session: 'me' });
  const sessPage2 = await req('GET', `/sessions/${sessionId}`, { session: 'me' });
  check('승인 완료 배지', (sessPage2.text.match(/검수 완료/g) ?? []).length >= 3);

  const rep = await req('POST', `/sessions/${sessionId}/report`, { session: 'me' });
  const reportId = rep.location.split('/reports/')[1];
  check('발행본 생성', /^rpt_/.test(reportId ?? ''), rep.location);
  const pub = await req('POST', `/reports/${reportId}/publish`, { session: 'me', body: { reviewerId: 'QA검수자', confirmations: ['warnings', 'phrases', 'privacy'] } });
  check('리포트 발행 → 303', pub.status === 303);
  check('인쇄 뷰 200 (발행본)', (await req('GET', `/reports/${reportId}/print`, { session: 'me' })).status === 200);

  const share = await req('POST', `/reports/${reportId}/links`, { session: 'me' });
  check('공유 링크 생성', share.status === 303);
  const repPage = await req('GET', `/reports/${reportId}`, { session: 'me' });
  const shareToken = repPage.text.match(/\/r\/(rpt_[a-z0-9]+)/)?.[1];
  check('공유 토큰 추출', !!shareToken);
  const pubPage = await req('GET', `/r/${shareToken}`);
  check('공개 리포트 200·검수 표기', pubPage.status === 200 && pubPage.text.includes('검수'));

  console.log('== 금칙어·검수 게이트 ==');
  // 금칙어 게이트는 도메인 테스트에서 검증됨 — 여기서는 미발행 리포트 인쇄 차단 확인
  const sess2 = await req('POST', `/clients/${clientId}/sessions`, { session: 'me' });
  const sid2 = sess2.location.split('/sessions/')[1];
  const rep2 = await req('POST', `/sessions/${sid2}/report`, { session: 'me' });
  const rid2 = rep2.location.split('/reports/')[1];
  check('미발행 리포트 인쇄 → 409', (await req('GET', `/reports/${rid2}/print`, { session: 'me' })).status === 409);

  console.log('== 사전 입력 링크 ==');
  await req('POST', '/intake', { session: 'me', body: { label: 'QA링크', ttlHours: '24' } });
  const intakePage = await req('GET', '/intake', { session: 'me' });
  const intakeToken = intakePage.text.match(/\/i\/(int_[a-z0-9]+)/)?.[1];
  check('사전입력 토큰 발급', !!intakeToken);
  check('공개 폼 200', (await req('GET', `/i/${intakeToken}`)).status === 200);
  const sub = await req('POST', `/i/${intakeToken}`, { body: {
    displayName: '포털고객', contact: '', year: '1995', month: '3', day: '8',
    hour: '', minute: '', gender: 'male', isLunar: 'false', birthPlace: '',
    timeAccuracy: 'unknown', intakePurpose: '연애', consent: 'yes',
  }});
  check('고객 제출 → 201', sub.status === 201);
  const clientList = await req('GET', '/', { session: 'me' });
  check('제출 고객 목록에 표시', clientList.text.includes('포털고객'));
  const linkId = intakePage.text.match(/\/intake\/(int_[a-z0-9-]+)\/revoke/)?.[1];
  await req('POST', `/intake/${linkId}/revoke`, { session: 'me' });
  check('철회된 링크 → 410', (await req('GET', `/i/${intakeToken}`)).status === 410);

  console.log('== 고객 포털 ==');
  await req('POST', `/clients/${clientId}/portal-links`, { session: 'me', body: { ttlHours: '24' } });
  const detail2 = await req('GET', `/clients/${clientId}`, { session: 'me' });
  const portalToken = detail2.text.match(/\/c\/(por_[a-z0-9]+)/)?.[1];
  check('포털 링크 발급', !!portalToken);
  const portal = await req('GET', `/c/${portalToken}`);
  check('포털 열람 200·본인 정보', portal.status === 200 && portal.text.includes('QA고객'));
  check('포털에 발행 리포트 링크', portal.text.includes('/r/rpt_'));
  const wd = await req('POST', `/c/${portalToken}/withdraw`);
  check('포털 동의 철회 → 303', wd.status === 303);
  check('철회 표기', (await req('GET', `/c/${portalToken}`)).text.includes('동의 철회됨'));

  console.log('== 예약·결제·리마인더·반복 ==');
  const svc = await req('POST', '/services', { session: 'me', body: { name: 'QA상담', durationMinutes: '60', price: '70000' } });
  check('서비스 등록', svc.status === 303);
  const svcPage = await req('GET', '/services', { session: 'me' });
  const svcId = svcPage.text.match(/svc_[a-z0-9-]+/)?.[0];
  const svcIdFromForm = svcPage.text.match(/value="(svc_[a-z0-9-]+)"/)?.[1] ?? svcId;
  const in48 = new Date(Date.now() + 20 * 3600e3).toISOString().slice(0, 16);
  const ap = await req('POST', '/appointments', { session: 'me', body: {
    clientId, serviceId: svcIdFromForm, scheduledAt: in48, channel: '전화',
  }});
  check('예약 등록 → 303', ap.status === 303);
  const apPage = await req('GET', '/appointments', { session: 'me' });
  const apptId = apPage.text.match(/id="(apt_[a-z0-9-]+)"/)?.[1];
  check('예약 표시', !!apptId);
  const dup = await req('POST', '/appointments', { session: 'me', body: {
    clientId, serviceId: svcIdFromForm, scheduledAt: in48, channel: '',
  }});
  check('중복 예약 경고 플래시', dup.location.includes('err='));
  // 예약 → 상담 시작 → 종료 플로우 (세션 자동 생성·예약 자동 완료)
  const start = await req('POST', `/appointments/${apptId}/start`, { session: 'me' });
  check('상담 시작 → 세션 화면', start.status === 303 && start.location.includes('/sessions/'));
  const liveId = start.location.split('/sessions/')[1];
  const live = await req('GET', `/sessions/${liveId}`, { session: 'me' });
  check('상담 화면: 진행중·만세력·타이머', live.text.includes('상담 진행 중') && live.text.includes('class="ms"') && live.text.includes('id="elapsed"'));
  const again = await req('POST', `/appointments/${apptId}/start`, { session: 'me' });
  check('상담 시작 재클릭 → 같은 세션', again.location.includes(liveId));
  await req('POST', `/sessions/${liveId}/transition`, { session: 'me', body: { to: 'review' } });
  const apAfter = await req('GET', '/appointments', { session: 'me' });
  check('상담 종료 → 예약 자동 완료', new RegExp(`id="${apptId}"[\\s\\S]*?badge[^>]*>완료`).test(apAfter.text));

  const remind = await req('POST', `/appointments/${apptId}/remind`, { session: 'me' });
  check('리마인더 기록 → 303', remind.status === 303);
  const audit1 = await req('GET', '/audit', { session: 'me' });
  check('appointment.remind 감사', audit1.text.includes('appointment.remind'));

  const rec = await req('POST', '/appointments/recurring', { session: 'me', body: {
    clientId, serviceId: svcIdFromForm, scheduledAt: '2026-10-01T10:00', freq: 'weekly', count: '4', counselorId: '',
  }});
  check('반복 예약 → 303', rec.status === 303);
  check('반복 배지 표시', (await req('GET', '/appointments', { session: 'me' })).text.includes('반복'));

  // 월 반복 말일 클램프 회귀 — 1/31 시작 시 3/3 오버플로 없이 2/28이어야 한다
  const mrec = await req('POST', '/appointments/recurring', { session: 'me', body: {
    clientId, serviceId: svcIdFromForm, scheduledAt: '2026-01-31T10:00', freq: 'monthly', count: '3', counselorId: '',
  }});
  check('월 반복 → 303', mrec.status === 303);
  const apPageM = await req('GET', '/appointments', { session: 'me' });
  check('월 반복 말일 클램프(2/28 표시·3/3 오버플로 없음)',
    apPageM.text.includes('2026. 2. 28.') && !apPageM.text.includes('2026. 3. 3.'));

  // 결제: 예약 → 결제 기록 → 수금 확인 → 환불
  const apPage2 = await req('GET', '/appointments', { session: 'me' });
  const payBtn = apPage2.text.match(/action="\/appointments\/(apt_[a-z0-9-]+)\/payment"/)?.[1];
  await req('POST', `/appointments/${payBtn}/payment`, { session: 'me', body: { amount: '70000' } });
  const apPage3 = await req('GET', '/appointments', { session: 'me' });
  const payId = apPage3.text.match(/\/payments\/(pay_[a-z0-9-]+)\/record/)?.[1];
  check('결제 기록 생성', !!payId);
  await req('POST', `/payments/${payId}/record`, { session: 'me', body: { externalTransactionId: 'qa-tx-1' } });
  const apPage4 = await req('GET', '/appointments', { session: 'me' });
  check('수금 확인 배지', apPage4.text.includes('수금 확인'));
  await req('POST', `/payments/${payId}/refund`, { session: 'me', body: { reason: 'QA 환불' } });
  check('환불 배지', (await req('GET', '/appointments', { session: 'me' })).text.includes('환불'));

  console.log('== 설정·계정·통계·export ==');
  const mkStaff = await req('POST', '/settings/counselors', { session: 'me', body: {
    displayName: 'QA직원', loginId: 'staff', password: 'staff-pass-123', role: 'counselor',
  }});
  check('직원 계정 생성', mkStaff.status === 303);
  const staffLogin = await req('POST', '/login', { body: { loginId: 'staff', password: 'staff-pass-123' }, session: 'staff' });
  check('직원 로그인 → 303', staffLogin.status === 303);
  const staffSettings = await req('POST', '/settings/counselors', { session: 'staff', body: {
    displayName: 'X', loginId: 'x1', password: 'x12345678', role: 'counselor',
  }});
  check('비소유자 계정 생성 차단 → 403', staffSettings.status === 403);
  check('비밀번호 변경', (await req('POST', '/settings/password', { session: 'staff', body: { password: 'staff-pass-999' } })).status === 303);
  check('새 비밀번호로 로그인', (await req('POST', '/login', { body: { loginId: 'staff', password: 'staff-pass-999' }, session: 's2' })).status === 303);

  // 비활성화된 계정의 기존 세션 즉시 무효화 (보안 회귀)
  const settingsPage = await req('GET', '/settings', { session: 'me' });
  const staffRow = settingsPage.text.match(/counselors\/(cn_[a-z0-9-]+)\/toggle/g) ?? [];
  // 직원 계정 id는 목록에서 loginId 'staff' 행과 짝지어야 하지만, QA 계정이 유일한 비소유자이므로 토글 경로 사용
  const togglePath = staffRow[0];
  check('직원 토글 경로 존재', !!togglePath);
  await req('POST', `/settings/${togglePath}`, { session: 'me' });
  check('비활성 후 직원 세션 무효 → /login', (await req('GET', '/', { session: 'staff' })).status === 303);

  check('통계 페이지 200', (await req('GET', '/stats', { session: 'me' })).status === 200);
  const exp = await req('GET', `/clients/${clientId}/export?for=client`, { session: 'me' });
  check('고객 export JSON', exp.status === 200 && JSON.parse(exp.text).scope === 'client');

  // owner 행위의 감사 actorRole이 올바르게 기록되는지 (회귀 — 이전엔 항상 'counselor')
  const auditPage = await req('GET', '/audit', { session: 'me' });
  check('owner 행위 actorRole=owner 기록', /<span class="muted">owner<\/span>/.test(auditPage.text));

  console.log(`\n=== 결과: ${pass} PASS / ${fail} FAIL ===`);
} finally {
  server.kill();
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(fail > 0 ? 1 : 0);
