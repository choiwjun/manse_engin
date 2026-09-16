// 서버렌더 HTML 뷰 — 외부 프레임워크 없음. 모든 사용자 입력은 esc()로 이스케이프한다.
import { TOPICS, topicLabel } from './engine-adapter.mjs';

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const CSS = `
  :root { --line:#e2e2e2; --ink:#1f2933; --muted:#6b7280; --accent:#334155; }
  * { box-sizing:border-box; }
  body { font-family:'Pretendard','Apple SD Gothic Neo',sans-serif; color:var(--ink); margin:0; background:#f7f7f5; }
  main { max-width:960px; margin:0 auto; padding:24px 20px 64px; }
  header.top { background:var(--accent); color:#fff; padding:14px 20px; }
  header.top a { color:#fff; text-decoration:none; margin-right:16px; font-size:14px; }
  header.top .brand { font-weight:700; font-size:16px; }
  h1 { font-size:22px; margin:0 0 16px; } h2 { font-size:17px; margin:28px 0 10px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:10px; padding:16px; margin-bottom:14px; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th,td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { color:var(--muted); font-weight:600; font-size:12px; }
  label { display:block; font-size:13px; color:var(--muted); margin:10px 0 4px; }
  input,select,textarea { width:100%; padding:8px 10px; border:1px solid var(--line); border-radius:6px; font-size:14px; font-family:inherit; }
  textarea { min-height:110px; }
  input[type=checkbox]{width:auto;}
  .row { display:flex; gap:12px; } .row>* { flex:1; }
  button,.btn { display:inline-block; background:var(--accent); color:#fff; border:0; border-radius:6px; padding:8px 14px; font-size:14px; cursor:pointer; text-decoration:none; }
  .btn.secondary,button.secondary { background:#fff; color:var(--accent); border:1px solid var(--accent); }
  .btn.danger,button.danger { background:#b91c1c; }
  .btn.small,button.small { padding:4px 10px; font-size:12px; }
  form.inline { display:inline; }
  .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; background:#eef2f7; color:var(--accent); }
  .badge.warn { background:#fef3c7; color:#92400e; }
  .badge.ok { background:#dcfce7; color:#166534; }
  .badge.gray { background:#f3f4f6; color:#4b5563; }
  .muted { color:var(--muted); font-size:13px; }
  .warn { color:#92400e; } .err { color:#b91c1c; }
  .flash { padding:10px 14px; border-radius:8px; margin-bottom:14px; font-size:14px; }
  .flash.error { background:#fee2e2; color:#991b1b; }
  .flash.ok { background:#dcfce7; color:#166534; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; }
  pre.mono { font-family:ui-monospace,monospace; font-size:12px; background:#f3f4f6; padding:10px; border-radius:6px; white-space:pre-wrap; word-break:break-all; }
  .draft { border-left:3px solid var(--line); }
  .draft.approved { border-left-color:#16a34a; }
  .draft.excluded { border-left-color:#b91c1c; opacity:.6; }
  .draft.auto { border-left-color:#f59e0b; }
  .section-body p { margin:.4em 0; line-height:1.7; }
  footer.foot { margin-top:32px; font-size:12px; color:var(--muted); }
  .ms { width:100%; border-collapse:collapse; text-align:center; table-layout:fixed; }
  .ms th,.ms td { border:1px solid var(--line); padding:4px 2px; text-align:center; }
  .ms th { background:#f8fafc; }
  .ms .ganji { font-size:30px; font-weight:700; font-family:'Noto Serif KR','Nanum Myeongjo',serif; line-height:1.15; }
  .ms .sipsin { font-size:11px; color:var(--muted); }
  .ms td.daycol { background:#fefce8; }
  .ms th.daycol { background:#fef9c3; }
  .daeun { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .daeun .du { border:1px solid var(--line); border-radius:6px; padding:4px 8px; font-size:13px; text-align:center; min-width:52px; }
  .daeun .du.cur { border-color:var(--accent); background:#eef2f7; font-weight:700; }
  .daeun .du .age { display:block; font-size:11px; color:var(--muted); }
  .ms-meta { display:flex; flex-wrap:wrap; gap:14px 26px; font-size:13px; margin-top:10px; }
  .ms-meta b { color:var(--muted); font-weight:600; margin-right:4px; }
  @media print {
    header.top, form, .no-print, footer.foot { display:none !important; }
    body { background:#fff; } .card { border:0; padding:0; }
    main { max-width:100%; padding:0; }
  }
`;

export function layout({ title, brand, body, flash }) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
<body>
<header class="top">
  <span class="brand">${esc(brand ?? 'MYEONG 워크스페이스')}</span>
  <nav style="display:inline-block;margin-left:24px">
    <a href="/">고객</a>
    <a href="/appointments">예약</a>
    <a href="/services">서비스</a>
    <a href="/intake">사전 입력</a>
    <a href="/stats">통계</a>
    <a href="/audit">감사 로그</a>
    <a href="/settings">설정</a>
  </nav>
  <a href="/logout" style="float:right">로그아웃</a>
</header>
<main>
${flash ? `<div class="flash ${flash.kind}">${esc(flash.text)}</div>` : ''}
${body}
</main>
</body>
</html>`;
}

export function publicLayout({ title, body }) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>${CSS}
  body { background:#fff; }
  main { max-width:720px; }
  .pub-head { border-bottom:2px solid var(--ink); padding-bottom:16px; margin-bottom:24px; }
</style>
</head>
<body><main>${body}</main></body>
</html>`;
}

export function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? esc(iso) : d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
}

const CLIENT_STATUS = { active: '활성', archived: '보관', deletion_requested: '삭제 요청', erased: '삭제됨' };
const SESSION_STATUS = { planned: '준비 전', prepared: '준비 완료', in_progress: '상담 중', review: '정리·검수', delivered: '전달 완료', archived: '보관' };
const APPOINTMENT_STATUS = { requested: '요청', confirmed: '확정', completed: '완료', cancelled: '취소', no_show: '노쇼' };
const PAYMENT_STATUS = { unpaid: '미수금', recorded: '수금 확인', refunded: '환불' };
const DRAFT_STATE = { auto: '자동 초안', edited: '수정됨', approved: '검수 완료', excluded: '제외' };
const REPORT_STATUS = { draft: '작성 중', published: '발행됨', revoked: '철회됨' };

export const labels = { CLIENT_STATUS, SESSION_STATUS, APPOINTMENT_STATUS, PAYMENT_STATUS, DRAFT_STATE, REPORT_STATUS };

function badge(text, kind = '') {
  return `<span class="badge ${kind}">${esc(text)}</span>`;
}

function textToHtml(text) {
  return String(text).split(/\n+/).filter(Boolean).map((l) => `<p>${esc(l)}</p>`).join('');
}

// ---------- 고객 목록 / 대시보드 ----------

export function dashboardPage({ clients, appointments, services, todayAppts, reminders = [] }) {
  const reminderRows = reminders.map((a) => {
    const client = clients.find((c) => c.id === a.clientId);
    const svc = services.find((s) => s.id === a.serviceId);
    return `<tr><td><strong>${fmtDate(a.scheduledAt)}</strong></td><td>${esc(client?.displayName ?? '')}</td>
      <td>${esc(svc?.name ?? '')}</td><td class="muted">${esc(client?.contact ?? '연락처 없음')}</td>
      <td><form class="inline" method="post" action="/appointments/${a.id}/remind"><button class="small secondary" type="submit">리마인더 발송 기록</button></form></td></tr>`;
  }).join('');
  const rows = clients.map((c) => `
    <tr>
      <td><a href="/clients/${c.id}"><strong>${esc(c.displayName)}</strong></a></td>
      <td>${esc(c.contact ?? '-')}</td>
      <td>${c.birth ? `${c.birth.year}-${String(c.birth.month).padStart(2, '0')}-${String(c.birth.day).padStart(2, '0')}${c.birth.hour == null ? ' (시간 미상)' : ''}` : '(삭제됨)'}</td>
      <td>${badge(CLIENT_STATUS[c.status] ?? c.status, c.status === 'active' ? 'ok' : 'gray')}</td>
      <td class="muted">${fmtDate(c.createdAt)}</td>
    </tr>`).join('');
  const apptRows = todayAppts.map((a) => {
    const client = clients.find((c) => c.id === a.clientId);
    const svc = services.find((s) => s.id === a.serviceId);
    return `<tr><td>${fmtDate(a.scheduledAt)}</td><td>${esc(client?.displayName ?? a.clientId)}</td>
      <td>${esc(svc?.name ?? '')}</td><td>${badge(APPOINTMENT_STATUS[a.status])}</td>
      <td><form class="inline" method="post" action="/appointments/${a.id}/start"><button class="small" type="submit">상담 시작</button></form>
      <a class="btn small secondary" href="/appointments#${a.id}">관리</a></td></tr>`;
  }).join('');
  return `
<h1>워크스페이스</h1>
<div class="card">
  <a class="btn" href="/clients/new">+ 새 고객</a>
  <a class="btn secondary" href="/appointments">예약 관리</a>
</div>
<h2>48시간 내 예약 — 리마인더</h2>
<div class="card">${reminderRows ? `<table><tr><th>일시</th><th>고객</th><th>서비스</th><th>연락처</th><th></th></tr>${reminderRows}</table>` : '<p class="muted">48시간 내 예약이 없습니다.</p>'}</div>
<h2>다가오는 예약</h2>
<div class="card">${apptRows ? `<table>${apptRows}</table>` : '<p class="muted">예약이 없습니다.</p>'}</div>
<h2>고객 (${clients.length})</h2>
<div class="card">
<table>
<tr><th>이름</th><th>연락처</th><th>생년월일</th><th>상태</th><th>등록</th></tr>
${rows || '<tr><td colspan="5" class="muted">고객이 없습니다.</td></tr>'}
</table>
</div>`;
}

// ---------- 고객 등록 ----------

export function clientNewPage() {
  return `
<h1>새 고객</h1>
<form class="card" method="post" action="/clients">
  <div class="row">
    <div><label>이름 *</label><input name="displayName" required></div>
    <div><label>연락처</label><input name="contact"></div>
  </div>
  <h2>출생 정보</h2>
  <div class="row">
    <div><label>년 *</label><input name="year" type="number" required></div>
    <div><label>월 *</label><input name="month" type="number" min="1" max="12" required></div>
    <div><label>일 *</label><input name="day" type="number" min="1" max="31" required></div>
  </div>
  <div class="row">
    <div><label>시 (모르면 비움)</label><input name="hour" type="number" min="0" max="23"></div>
    <div><label>분</label><input name="minute" type="number" min="0" max="59"></div>
    <div><label>성별 *</label><select name="gender"><option value="male">남</option><option value="female">여</option></select></div>
  </div>
  <div class="row">
    <div><label>달력 *</label><select name="isLunar"><option value="false">양력</option><option value="true">음력</option></select>
      <label style="margin-top:6px"><input type="checkbox" name="isLeapMonth" value="true"> 음력 윤달</label></div>
    <div><label>출생지</label><input name="birthPlace"></div>
    <div><label>시간 정확도 *</label><select name="timeAccuracy">
      <option value="exact">정확</option><option value="approximate">대략</option><option value="unknown">미상</option>
    </select></div>
  </div>
  <h2>동의·상담 정보</h2>
  <label>개인정보 수집 목적 *</label><input name="consentPurpose" required placeholder="예: 사주 상담 제공">
  <div class="row">
    <div><label>데이터 주체</label><select name="dataSubject"><option value="self">본인</option><option value="minor">미성년자</option><option value="other">기타</option></select></div>
    <div><label>입력자</label><select name="enteredBy"><option value="counselor">상담사 대리</option><option value="client">고객 직접</option><option value="guardian">법정대리인</option></select></div>
  </div>
  <label>상담 목적</label><input name="intakePurpose" placeholder="예: 이직 시기 상담">
  <label>예약 메모</label><input name="intakeMemo">
  <div style="margin-top:16px"><button type="submit">등록</button></div>
</form>`;
}

// ---------- 고객 상세 ----------

export function clientDetailPage({ client, snapshots, staleMap, sessions, timeline, portalLinks = [], shareBase = '' }) {
  const portalRows = portalLinks.map((l) => `
    <tr>
      <td class="mono muted"><a href="${shareBase}/c/${l.token}" target="_blank">${esc(l.token.slice(0, 18))}…</a></td>
      <td>${fmtDate(l.expiresAt)}</td>
      <td>${l.revokedAt ? badge('철회됨', 'gray') : badge('활성', 'ok')}</td>
      <td>${l.views.length}회</td>
      <td>${!l.revokedAt ? `<form class="inline" method="post" action="/clients/${client.id}/portal-links/${l.id}/revoke"><button class="small secondary">철회</button></form>` : ''}</td>
    </tr>`).join('');
  const b = client.birth;
  const snapRows = snapshots.map((s) => `
    <tr>
      <td class="mono">${esc(s.id.slice(0, 18))}…</td>
      <td>${esc(s.envelope.moduleId)}</td>
      <td>${fmtDate(s.envelope.calculatedAt)}</td>
      <td>${esc(s.envelope.engineVersion)}</td>
      <td>${s.envelope.warnings.map((w) => badge(w.code, 'warn')).join(' ') || '-'}</td>
      <td>${staleMap.get(s.id) ? badge('재계산 필요', 'warn') : badge('최신', 'ok')}</td>
    </tr>`).join('');
  const sessRows = sessions.map((s) => `
    <tr>
      <td><a href="/sessions/${s.id}">${esc(s.id.slice(0, 14))}…</a></td>
      <td>${badge(SESSION_STATUS[s.status])}</td>
      <td>${fmtDate(s.createdAt)}</td>
      <td class="muted">${s.notes.length}개 메모</td>
    </tr>`).join('');
  const timelineRows = timeline.entries.map((e) => `<tr><td>${fmtDate(e.at)}</td><td>${esc(e.type)}</td><td class="mono muted">${esc(e.id.slice(0, 18))}…</td></tr>`).join('');
  return `
<h1>${esc(client.displayName)} ${badge(CLIENT_STATUS[client.status] ?? client.status)}</h1>
<div class="card">
  <div class="row">
    <div><span class="muted">연락처</span><br>${esc(client.contact ?? '-')}</div>
    <div><span class="muted">생년월일시</span><br>${b ? `${b.year}-${b.month}-${b.day} ${b.hour ?? '??'}:${b.minute ?? '??'} (${b.isLunar ? '음력' : '양력'})` : '삭제됨'}</div>
    <div><span class="muted">출생지</span><br>${esc(b?.birthPlace ?? '-')}</div>
    <div><span class="muted">시간 정확도</span><br>${esc(client.timeAccuracy)}</div>
  </div>
  <div class="row" style="margin-top:12px">
    <div><span class="muted">수집 목적</span><br>${esc(client.consent.purpose)}${client.consent.withdrawnAt ? ` <span class="warn">(철회 ${fmtDate(client.consent.withdrawnAt)})</span>` : ''}</div>
    <div><span class="muted">상담 목적</span><br>${esc(client.intake.purpose ?? '-')}</div>
    <div><span class="muted">메모</span><br>${esc(client.intake.memo ?? '-')}</div>
  </div>
</div>
<div class="card">
  <form class="inline" method="post" action="/clients/${client.id}/calc"><button type="submit">명식 계산 실행</button></form>
  <form class="inline" method="post" action="/clients/${client.id}/sessions" style="margin-left:8px"><button type="submit" class="secondary">상담 시작 (세션 생성)</button></form>
  <form class="inline" method="post" action="/clients/${client.id}/archive" style="margin-left:8px"><button type="submit" class="secondary">${client.status === 'archived' ? '보관 해제' : '보관'}</button></form>
  <form class="inline" method="post" action="/clients/${client.id}/deletion" style="margin-left:8px" onsubmit="return confirm('삭제 요청을 접수할까요?')"><button type="submit" class="danger">삭제 요청 접수</button></form>
  ${client.deletionRequest?.status === 'pending' ? `<form class="inline" method="post" action="/clients/${client.id}/erasure" style="margin-left:8px" onsubmit="return confirm('식별 정보를 삭제 처리합니다. 되돌릴 수 없습니다.')"><button type="submit" class="danger">삭제 처리 실행</button></form>` : ''}
  <a href="/clients/${client.id}/export?for=client" style="margin-left:8px;font-size:13px">고객 열람 export</a>
  <a href="/clients/${client.id}/export?for=counselor" style="margin-left:8px;font-size:13px">상담사 export</a>
</div>
<h2>고객 포털 링크</h2>
<div class="card">
  <form method="post" action="/clients/${client.id}/portal-links" class="row">
    <div><label>유효 시간</label><input name="ttlHours" type="number" value="720"></div>
    <div style="align-self:end"><button type="submit">포털 링크 생성</button></div>
    <div class="muted" style="align-self:end;font-size:13px">고객이 본인 정보 열람·동의 철회·삭제 요청을 할 수 있는 링크</div>
  </form>
  <table><tr><th>링크</th><th>만료</th><th>상태</th><th>열람</th><th></th></tr>
  ${portalRows || '<tr><td colspan="5" class="muted">포털 링크 없음</td></tr>'}</table>
</div>
<h2>계산 스냅샷</h2>
${(() => { const s = snapshots.find((x) => x.envelope.moduleId === 'saju'); return s ? `<div class="card">${sajuChart(s.envelope.result)}</div>` : ''; })()}
<div class="card"><table><tr><th>ID</th><th>모듈</th><th>계산 시각</th><th>엔진</th><th>경고</th><th>상태</th></tr>${snapRows || '<tr><td colspan="6" class="muted">스냅샷 없음 — 명식 계산을 실행하세요.</td></tr>'}</table></div>
<h2>상담 세션</h2>
<div class="card"><table><tr><th>세션</th><th>상태</th><th>생성</th><th>메모</th></tr>${sessRows || '<tr><td colspan="4" class="muted">세션 없음</td></tr>'}</table></div>
<h2>타임라인</h2>
<div class="card"><table><tr><th>시각</th><th>유형</th><th>ID</th></tr>${timelineRows || '<tr><td colspan="3" class="muted">이력 없음</td></tr>'}</table></div>`;
}

// ---------- 만세력표 ----------

// 오행 색상 — 목=청록, 화=적, 토=황, 금=백(회청), 수=흑청
const OHAENG_COLOR = { 목: '#15803d', 화: '#c62828', 토: '#b8860b', 금: '#64748b', 수: '#1e3a8a' };
const GAN_OHAENG = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' };
const JI_OHAENG = { 子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화', 午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수' };
const JIJI_HANJA_KO = { 子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해' };
const GAN_HANJA_KO = { 甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계' };

function msCell(ch, table, extra = '') {
  if (!ch) return '<span class="muted">—</span>';
  const color = OHAENG_COLOR[table[ch]] ?? 'inherit';
  const ko = (table === GAN_OHAENG ? GAN_HANJA_KO : JIJI_HANJA_KO)[ch] ?? '';
  return `<span class="ganji" style="color:${color}">${ch}</span><br><span class="sipsin">${ko}${extra}</span>`;
}

// SajuResult → 만세력표 HTML. 열 순서는 시·일·월·년(일주 강조).
export function sajuChart(r) {
  if (!r?.palja) return '<p class="muted">명식 데이터가 없습니다.</p>';
  const POS = [
    { gan: 'hourGan', ji: 'hourJi', label: '시주' },
    { gan: 'dayGan', ji: 'dayJi', label: '일주', day: true },
    { gan: 'monthGan', ji: 'monthJi', label: '월주' },
    { gan: 'yearGan', ji: 'yearJi', label: '년주' },
  ];
  const sinsalAt = (pos) => (r.sinsal ?? []).filter((s) => s.position === pos).map((s) => esc(s.name)).join('<br>') || '—';
  const jijangganAt = (pos) => (r.jijanggan?.[pos] ?? []).join(' ') || '—';
  const row = (label, fn, cls = 'sipsin') =>
    `<tr><th>${label}</th>${POS.map((p) => `<td class="${cls} ${p.day ? 'daycol' : ''}">${fn(p)}</td>`).join('')}</tr>`;
  const daeunCells = (r.daeun ?? []).map((d) =>
    `<span class="du ${d.isCurrent ? 'cur' : ''}"><span class="ganji-sm" style="color:${OHAENG_COLOR[JI_OHAENG[d.ji]] ?? 'inherit'};font-weight:700">${d.gan}${d.ji}</span><span class="age">${d.age}세${d.isCurrent ? ' · 현재' : ''}</span></span>`,
  ).join('');
  const rels = (r.jijiRelations ?? []).map((j) => `${esc(j.type)} ${j.jijis.map(esc).join('·')} — ${esc(j.description)}`).join('<br>');
  const strength = r.strengthAssessment;
  const deuk = strength ? ['득령', '득지', '득세'].filter((_, i) => [strength.deukryeong, strength.deukji, strength.deukse][i]).join('·') || '없음' : '';
  const naeum = r.naeum?.day ? `${esc(r.naeum.day.name)}(${esc(r.naeum.day.hanja)})` : '';
  return `
<table class="ms">
  <tr><th style="width:64px"></th>${POS.map((p) => `<th class="${p.day ? 'daycol' : ''}">${p.label}</th>`).join('')}</tr>
  ${row('십신', (p) => p.day ? '<b>일간</b>' : esc(r.sipsin?.[p.gan] ?? '') || '—')}
  <tr><th>천간</th>${POS.map((p) => `<td class="${p.day ? 'daycol' : ''}">${msCell(r.palja[p.gan], GAN_OHAENG)}</td>`).join('')}</tr>
  <tr><th>지지</th>${POS.map((p) => `<td class="${p.day ? 'daycol' : ''}">${msCell(r.palja[p.ji], JI_OHAENG)}</td>`).join('')}</tr>
  ${row('십신', (p) => esc(r.sipsin?.[p.ji] ?? '') || '—')}
  ${row('지장간', jijangganAt)}
  ${row('운성', (p) => esc(r.unsung?.[p.ji] ?? '') || '—')}
  ${row('신살', (p) => sinsalAt(p.ji))}
</table>
<div class="ms-meta">
  ${r.gyeokguk?.name ? `<span><b>격국</b>${esc(r.gyeokguk.name)}${r.gyeokguk.confidence ? ` <span class="badge ${r.gyeokguk.confidence === '확정' ? 'ok' : 'warn'}">${esc(r.gyeokguk.confidence)}</span>` : ''}</span>` : ''}
  ${r.yongsin ? `<span><b>용신</b>${esc(r.yongsin.yongsin)} · <b>기신</b>${esc(r.yongsin.gisin)}</span>` : ''}
  ${strength ? `<span><b>강약</b>${esc(strength.label)}(${strength.score}) · ${deuk}</span>` : ''}
  ${r.gongmang?.length ? `<span><b>공망</b>${r.gongmang.map(esc).join(' ')}</span>` : ''}
  ${r.seun ? `<span><b>세운</b>${esc(r.seun.gan)}${esc(r.seun.ji)}</span>` : ''}
  ${r.wolun ? `<span><b>월운</b>${esc(r.wolun.gan)}${esc(r.wolun.ji)}</span>` : ''}
  ${naeum ? `<span><b>일주 납음</b>${naeum}</span>` : ''}
</div>
${rels ? `<p class="muted" style="margin-top:8px">지지 관계: ${rels}</p>` : ''}
${daeunCells ? `<div class="daeun">${daeunCells}</div>` : ''}`;
}

// ---------- 세션 작업 화면 ----------

export function sessionPage({ session, client, snapshot, drafts, reports, stale, appointment }) {
  // 상태별 주 행동 — 상담사는 다음 단계 버튼 하나만 누르면 된다.
  const PRIMARY = {
    planned: { to: 'prepared', label: '준비 완료 — 상담 대기' },
    prepared: { to: 'in_progress', label: '▶ 상담 시작' },
    in_progress: { to: 'review', label: '■ 상담 종료 — 정리·검수로' },
    review: { to: 'delivered', label: '고객에게 전달 완료' },
    delivered: { to: 'archived', label: '세션 보관' },
  };
  const nextMap = {
    planned: ['prepared', 'archived'],
    prepared: ['in_progress', 'archived'],
    in_progress: ['review'],
    review: ['delivered', 'in_progress'],
    delivered: ['archived'],
    archived: [],
  };
  const primary = PRIMARY[session.status];
  const primaryBtn = primary
    ? `<form class="inline" method="post" action="/sessions/${session.id}/transition"><input type="hidden" name="to" value="${primary.to}"><button type="submit" style="font-size:15px;padding:10px 20px">${primary.label}</button></form>` : '';
  const secondaryBtns = (nextMap[session.status] ?? []).filter((to) => to !== primary?.to).map((to) =>
    `<form class="inline" method="post" action="/sessions/${session.id}/transition"><input type="hidden" name="to" value="${to}"><button type="submit" class="secondary">${SESSION_STATUS[to]}로</button></form>`,
  ).join(' ');
  const actionBar = `<div class="card" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">${primaryBtn}${secondaryBtns || ''}
    ${session.status === 'in_progress' && session.startedAt ? `<span class="muted" id="elapsed" style="margin-left:auto;font-size:15px"></span>` : ''}</div>`;
  const timerScript = session.status === 'in_progress' && session.startedAt ? `<script>
    (function(){var t0=${new Date(session.startedAt).getTime()};var el=document.getElementById('elapsed');
    function tick(){var s=Math.max(0,Math.floor((Date.now()-t0)/1000));el.textContent='상담 경과 '+Math.floor(s/60)+'분 '+(s%60)+'초';}
    tick();setInterval(tick,1000);})();</script>` : '';
  const topicChecks = TOPICS.map((t) => `<label style="display:inline-block;margin-right:14px"><input type="checkbox" name="topics" value="${t.id}"> ${esc(t.label)}</label>`).join('');
  const draftCards = drafts.map((d) => {
    const finalText = d.edit?.text ?? d.auto.text;
    return `
<div class="card draft ${d.state}">
  <strong>${esc(d.topic)}</strong>
  ${badge(DRAFT_STATE[d.state], d.state === 'approved' ? 'ok' : d.state === 'excluded' ? 'gray' : 'warn')}
  ${badge(d.visibility === 'customer' ? '고객용' : '내부용', 'gray')}
  <span class="muted">엔진 ${esc(d.auto.engineVersion)} · 생성 ${fmtDate(d.auto.generatedAt)}</span>
  <div class="section-body" style="margin-top:8px">${textToHtml(finalText)}</div>
  ${d.auto.basisRefs.length ? `<p class="muted">근거: ${d.auto.basisRefs.map(esc).join(', ')}</p>` : ''}
  ${d.state === 'approved' ? `<p class="muted">검수: ${esc(d.reviewedBy)} · ${fmtDate(d.reviewedAt)}</p>` : ''}
  ${d.state !== 'excluded' ? `
  <details><summary class="muted" style="cursor:pointer">수정</summary>
    <form method="post" action="/drafts/${d.id}/edit">
      <textarea name="text">${esc(finalText)}</textarea>
      <button type="submit" class="small">수정 저장</button>
    </form>
  </details>` : ''}
  <div style="margin-top:8px">
    ${d.state === 'auto' || d.state === 'edited' ? `<form class="inline" method="post" action="/drafts/${d.id}/approve"><button type="submit" class="small">검수 승인</button></form>` : ''}
    ${d.state !== 'excluded' ? `<form class="inline" method="post" action="/drafts/${d.id}/exclude"><button type="submit" class="small secondary">제외</button></form>` : ''}
    <form class="inline" method="post" action="/drafts/${d.id}/visibility">
      <input type="hidden" name="visibility" value="${d.visibility === 'customer' ? 'internal' : 'customer'}">
      <button type="submit" class="small secondary">${d.visibility === 'customer' ? '내부로 전환' : '고객용으로 전환'}</button>
    </form>
  </div>
</div>`;
  }).join('');
  const reportRows = reports.map((r) => `
    <tr><td><a href="/reports/${r.id}">v${r.version}</a></td><td>${badge(REPORT_STATUS[r.status], r.status === 'published' ? 'ok' : '')}</td>
    <td>${r.sections ?? r.renderInput.sections.length}개 섹션</td><td>${fmtDate(r.createdAt)}</td></tr>`).join('');
  const inProgress = session.status === 'in_progress';
  const chartCard = `<h2>만세력표</h2>
<div class="card">${snapshot
    ? `${sajuChart(snapshot.envelope.result)}
       <p class="muted" style="margin-top:10px"><span class="mono">${esc(snapshot.id)}</span> · 엔진 ${esc(snapshot.envelope.engineVersion)} · ${fmtDate(snapshot.envelope.calculatedAt)}</p>
       ${snapshot.envelope.warnings.map((w) => `<div class="warn" style="margin-top:6px">⚠ ${esc(w.message)}</div>`).join('')}`
    : '<span class="muted">명식이 없습니다 — 고객 화면에서 명식 계산을 먼저 실행하세요.</span>'}</div>`;
  const notesCard = `<h2>내부 메모 (고객 리포트에 포함되지 않음)</h2>
<div class="card">
  ${session.notes.map((n) => `<p>${badge(n.phase, 'gray')} ${esc(n.text)} <span class="muted">${fmtDate(n.updatedAt)}</span></p>`).join('') || '<p class="muted">메모 없음</p>'}
  <form method="post" action="/sessions/${session.id}/notes">
    <div class="row">
      <div><select name="phase"><option value="before" ${session.status === 'planned' || session.status === 'prepared' ? 'selected' : ''}>상담 전</option><option value="during" ${inProgress ? 'selected' : ''}>상담 중</option><option value="after">상담 후</option></select></div>
      <div style="flex:3"><input name="text" required placeholder="${inProgress ? '상담 중 메모 — 고객이 말한 포인트' : '내부 메모'}"></div>
    </div>
    <div style="margin-top:8px"><button type="submit" class="small">메모 추가</button></div>
  </form>
</div>`;
  const draftsFormCard = `<h2>자동 초안 생성</h2>
<div class="card">
  <form method="post" action="/sessions/${session.id}/drafts">
    ${topicChecks}
    <div style="margin-top:10px"><button type="submit">선택 주제 초안 생성</button></div>
  </form>
</div>`;
  const draftSection = `<h2>해석 초안 (${drafts.length})</h2>
${draftCards || '<div class="card muted">초안이 없습니다.</div>'}`;
  const outcomeCard = `<h2>상담 결과 정리</h2>
<div class="card">
  <form method="post" action="/sessions/${session.id}/outcome">
    <label>핵심 요약</label><textarea name="summary">${esc(session.summary ?? '')}</textarea>
    <label>후속 메모 (재방문 포인트·다음 상담 제안)</label><input name="followUp" value="${esc(session.followUp ?? '')}">
    <div style="margin-top:8px"><button type="submit" class="small">저장</button></div>
  </form>
</div>`;
  const reportCard = `<h2>리포트 버전</h2>
<div class="card">
  <form class="inline" method="post" action="/sessions/${session.id}/report"><button type="submit">검수된 초안으로 발행본 작성</button></form>
  <table style="margin-top:10px"><tr><th>버전</th><th>상태</th><th>섹션</th><th>생성</th></tr>${reportRows || '<tr><td colspan="4" class="muted">리포트 없음</td></tr>'}</table>
</div>`;
  // 상담 중: 만세력·메모·초안 순. 정리·검수: 요약→초안→발행본 순. 그 외 기본 순서.
  const flow = inProgress
    ? chartCard + notesCard + draftsFormCard + draftSection + outcomeCard + reportCard
    : session.status === 'review'
      ? outcomeCard + draftSection + draftsFormCard + reportCard + chartCard + notesCard
      : chartCard + notesCard + draftsFormCard + draftSection + outcomeCard + reportCard;
  return `
<h1>상담 세션 ${badge(SESSION_STATUS[session.status], inProgress ? 'ok' : '')}</h1>
<p class="muted">고객: <a href="/clients/${client.id}">${esc(client.displayName)}</a>${client.intake.purpose ? ` · 목적: ${esc(client.intake.purpose)}` : ''}
${appointment ? ` · 예약 ${fmtDate(appointment.scheduledAt)}` : ''} · 생성 ${fmtDate(session.createdAt)} · 시작 ${fmtDate(session.startedAt)} · 종료 ${fmtDate(session.endedAt)}</p>
${stale ? `<div class="flash error">출생정보가 명식 계산 후 수정됐습니다. 재계산이 필요합니다.</div>` : ''}
${inProgress ? '<div class="flash ok">상담 진행 중 — 만세력표를 보며 풀이하고, 아래에 상담 중 메모를 남기세요. 끝나면 "상담 종료"를 누르세요.</div>' : ''}
${session.status === 'review' ? '<div class="flash ok">상담이 끝났습니다 — 요약을 정리하고 초안을 검수해 발행본을 만드세요.</div>' : ''}
${actionBar}
${timerScript}
${flow}`;
}

// ---------- 리포트 ----------

function reportBodyHtml(report, counselor) {
  const sections = report.renderInput.sections.map((s) =>
    `<section style="margin-bottom:20px"><h2>${esc(s.topic)}</h2><div class="section-body">${textToHtml(s.text)}</div></section>`,
  ).join('');
  return `
<div class="pub-head">
  <h1>${esc(report.renderInput.title ?? `${counselor.brand.name} 상담 리포트`)}</h1>
  <p class="muted">v${report.version} · ${esc(counselor.brand.name)}${counselor.brand.contact ? ` · ${esc(counselor.brand.contact)}` : ''}</p>
  ${report.status === 'published' ? `<p>${badge('상담사 검수 완료', 'ok')} ${esc(report.reviewerId ?? '')} · ${fmtDate(report.reviewedAt)}</p>` : `<p>${badge('미발행 초안', 'warn')}</p>`}
</div>
${sections || '<p class="muted">섹션 없음</p>'}
<footer class="foot">
  <p>본 리포트는 전통 명리 해석을 정리한 참고 자료이며, 건강·재정·법률 등 중요한 결정은 해당 분야 전문가와 상담하세요.</p>
  <p>엔진 버전: ${report.renderInput.engineVersions.map(esc).join(', ') || '-'} · 생성 ${fmtDate(report.renderInput.generatedAt)}</p>
</footer>`;
}

export function reportPage({ report, counselor, links, shareBase }) {
  const linkRows = links.map((l) => `
    <tr>
      <td class="mono muted">${esc(l.token.slice(0, 20))}…</td>
      <td>${fmtDate(l.expiresAt)}</td>
      <td>${l.revokedAt ? badge('철회됨', 'gray') : badge('활성', 'ok')}</td>
      <td>${l.views.length}회</td>
      <td>
        ${!l.revokedAt ? `<form class="inline" method="post" action="/links/${l.id}/revoke"><button class="small secondary" type="submit">철회</button></form>` : ''}
        <a class="btn small secondary" href="${shareBase}/r/${l.token}" target="_blank">열기</a>
      </td>
    </tr>`).join('');
  return `
<h1>리포트 v${report.version} ${badge(REPORT_STATUS[report.status], report.status === 'published' ? 'ok' : '')}</h1>
<div class="card">
  ${report.status === 'draft' ? `
  <form method="post" action="/reports/${report.id}/publish">
    <label>검수자 *</label><input name="reviewerId" required placeholder="검수한 상담사 이름">
    <label><input type="checkbox" name="confirmations" value="warnings"> 계산 경고·시간 불확실성을 확인했다</label>
    <label><input type="checkbox" name="confirmations" value="phrases"> 보증성 표현이 없음을 확인했다</label>
    <label><input type="checkbox" name="confirmations" value="privacy"> 내부 메모·미검수 문장이 없음을 확인했다</label>
    <div style="margin-top:10px"><button type="submit">발행</button></div>
  </form>` : ''}
  ${report.status === 'published' ? `
  <form class="inline" method="post" action="/reports/${report.id}/links"><button type="submit">공유 링크 생성 (72시간)</button></form>
  <a class="btn secondary" href="/reports/${report.id}/print" target="_blank" style="margin-left:8px">인쇄/PDF</a>
  <form class="inline" method="post" action="/reports/${report.id}/revoke" style="margin-left:8px" onsubmit="return confirm('발행을 철회할까요? 기존 링크가 모두 끊깁니다.')"><button type="submit" class="danger">발행 철회</button></form>` : ''}
</div>
<h2>공유 링크</h2>
<div class="card"><table><tr><th>토큰</th><th>만료</th><th>상태</th><th>열람</th><th></th></tr>${linkRows || '<tr><td colspan="5" class="muted">링크 없음</td></tr>'}</table></div>
<h2>미리보기</h2>
<div class="card">${reportBodyHtml(report, counselor)}</div>`;
}

export function publicReportPage({ report, counselor }) {
  return publicLayout({ title: report.renderInput.title ?? '상담 리포트', body: reportBodyHtml(report, counselor) });
}

// ---------- 예약 / 서비스 / 감사 ----------

export function appointmentsPage({ appointments, clients, services, payments, counselors = [] }) {
  const clientName = (id) => clients.find((c) => c.id === id)?.displayName ?? id;
  const svcName = (id) => services.find((s) => s.id === id)?.name ?? id;
  const counselorName = (id) => counselors.find((c) => c.id === id)?.displayName ?? '-';
  const rows = appointments.map((a) => {
    const pay = payments.find((p) => p.appointmentId === a.id);
    const next = { requested: ['confirmed', 'cancelled'], confirmed: ['completed', 'cancelled', 'no_show'] }[a.status] ?? [];
    return `<tr id="${a.id}">
      <td>${fmtDate(a.scheduledAt)}${a.seriesId ? '<br><span class="badge gray">반복</span>' : ''}</td>
      <td><a href="/clients/${a.clientId}">${esc(clientName(a.clientId))}</a></td>
      <td>${esc(svcName(a.serviceId))}<br><span class="muted">${esc(counselorName(a.counselorId))}</span></td>
      <td>${badge(APPOINTMENT_STATUS[a.status])}${a.cancelReason ? `<br><span class="muted">${esc(a.cancelReason)}</span>` : ''}</td>
      <td>${pay ? `${badge(PAYMENT_STATUS[pay.status])} ${pay.amount.toLocaleString()}${pay.currency === 'KRW' ? '원' : pay.currency}${pay.externalTransactionId ? `<br><span class="muted">${esc(pay.externalTransactionId)}</span>` : ''}` : '<span class="muted">-</span>'}</td>
      <td>
        ${a.status === 'requested' || a.status === 'confirmed' ? `<form class="inline" method="post" action="/appointments/${a.id}/start"><button class="small" type="submit">상담 시작</button></form> ` : ''}
        ${next.map((to) => `<form class="inline" method="post" action="/appointments/${a.id}/transition">
          <input type="hidden" name="to" value="${to}">
          ${to === 'cancelled' ? `<input type="hidden" name="reason" value="상담사 취소">` : ''}
          <button class="small secondary" type="submit">${APPOINTMENT_STATUS[to]}</button></form>`).join(' ')}
        ${!pay ? `<form class="inline" method="post" action="/appointments/${a.id}/payment"><input type="hidden" name="amount" value="0"><button class="small secondary" type="submit">결제 기록</button></form>` : ''}
        ${pay?.status === 'unpaid' ? `<form class="inline" method="post" action="/payments/${pay.id}/record">
          <input name="externalTransactionId" placeholder="외부 거래 ID" required style="width:130px;display:inline-block">
          <button class="small" type="submit">수금 확인</button></form>` : ''}
        ${pay?.status === 'recorded' ? `<form class="inline" method="post" action="/payments/${pay.id}/refund">
          <input name="reason" placeholder="환불 사유" required style="width:110px;display:inline-block">
          <button class="small danger" type="submit">환불</button></form>` : ''}
      </td>
    </tr>`;
  }).join('');
  const svcOptions = services.map((s) => `<option value="${s.id}">${esc(s.name)} (${s.durationMinutes}분)</option>`).join('');
  const clientOptions = clients.map((c) => `<option value="${c.id}">${esc(c.displayName)}</option>`).join('');
  const counselorOptions = ['<option value="">(미배정)</option>', ...counselors.map((c) => `<option value="${c.id}">${esc(c.displayName)}</option>`)].join('');
  return `
<h1>예약</h1>
<div class="card">
  <form method="post" action="/appointments" class="row">
    <div><label>고객</label><select name="clientId">${clientOptions}</select></div>
    <div><label>서비스</label><select name="serviceId">${svcOptions}</select></div>
    <div><label>일시</label><input name="scheduledAt" type="datetime-local" required></div>
    <div><label>담당</label><select name="counselorId">${counselorOptions}</select></div>
    <div><label>채널</label><input name="channel" placeholder="전화·카톡·대면"></div>
    <div style="align-self:end"><button type="submit">예약 등록</button></div>
  </form>
</div>
<div class="card">
  <form method="post" action="/appointments/recurring" class="row">
    <div><label>고객</label><select name="clientId">${clientOptions}</select></div>
    <div><label>서비스</label><select name="serviceId">${svcOptions}</select></div>
    <div><label>첫 일시</label><input name="scheduledAt" type="datetime-local" required></div>
    <div><label>반복</label><select name="freq"><option value="weekly">매주</option><option value="biweekly">격주</option><option value="monthly">매월</option></select></div>
    <div><label>횟수</label><input name="count" type="number" min="2" max="52" value="4"></div>
    <div><label>담당</label><select name="counselorId">${counselorOptions}</select></div>
    <div style="align-self:end"><button type="submit">반복 예약</button></div>
  </form>
</div>
<div class="card"><table>
<tr><th>일시</th><th>고객</th><th>서비스</th><th>상태</th><th>결제</th><th>작업</th></tr>
${rows || '<tr><td colspan="6" class="muted">예약이 없습니다.</td></tr>'}
</table></div>`;
}

export function servicesPage({ services }) {
  const rows = services.map((s) => `<tr>
    <td>${esc(s.name)}</td><td>${s.durationMinutes}분</td>
    <td>${s.displayPrice ? `${s.displayPrice.amount.toLocaleString()}${s.displayPrice.currency === 'KRW' ? '원' : s.displayPrice.currency}` : '-'}</td>
    <td>${esc(s.cancelPolicy ?? '-')}</td>
    <td>${badge(s.active ? '활성' : '비활성', s.active ? 'ok' : 'gray')}</td>
    <td><form class="inline" method="post" action="/services/${s.id}/toggle"><button class="small secondary">${s.active ? '비활성화' : '활성화'}</button></form></td>
  </tr>`).join('');
  return `
<h1>서비스 카탈로그</h1>
<div class="card">
  <form method="post" action="/services" class="row">
    <div><label>이름</label><input name="name" required></div>
    <div><label>소요(분)</label><input name="durationMinutes" type="number" required></div>
    <div><label>표시 가격(원)</label><input name="price" type="number"></div>
    <div><label>취소 정책</label><input name="cancelPolicy"></div>
    <div style="align-self:end"><button type="submit">등록</button></div>
  </form>
</div>
<div class="card"><table><tr><th>이름</th><th>소요</th><th>가격</th><th>취소 정책</th><th>상태</th><th></th></tr>${rows}</table></div>`;
}

export function auditPage({ events }) {
  const rows = events.map((e) => `<tr>
    <td>${fmtDate(e.at)}</td><td>${esc(e.actorId)}<br><span class="muted">${esc(e.actorRole)}</span></td>
    <td>${esc(e.action)}</td><td>${esc(e.targetType)}<br><span class="mono muted">${esc(e.targetId.slice(0, 18))}…</span></td>
    <td>${badge(e.result, e.result === 'success' ? 'ok' : 'warn')}</td>
  </tr>`).join('');
  return `
<h1>감사 로그</h1>
<div class="card"><table><tr><th>시각</th><th>행위자</th><th>행위</th><th>대상</th><th>결과</th></tr>${rows || '<tr><td colspan="5" class="muted">이벤트 없음</td></tr>'}</table></div>`;
}

// ---------- 사전 입력 링크 / 설정 ----------

export function intakeLinksPage({ links, base }) {
  const rows = links.map((l) => `
    <tr>
      <td>${esc(l.label ?? '-')}</td>
      <td class="mono muted"><a href="${base}/i/${l.token}" target="_blank">${esc(l.token.slice(0, 18))}…</a></td>
      <td>${fmtDate(l.expiresAt)}</td>
      <td>${l.revokedAt ? badge('철회됨', 'gray') : badge('활성', 'ok')}</td>
      <td>${l.submissions.length}건</td>
      <td>${!l.revokedAt ? `<form class="inline" method="post" action="/intake/${l.id}/revoke"><button class="small secondary">철회</button></form>` : ''}</td>
    </tr>`).join('');
  return `
<h1>고객 사전 입력 링크</h1>
<p class="muted">고객에게 링크를 전달하면 고객이 직접 출생정보·상담 목적을 입력합니다 (enteredBy=client로 기록).</p>
<div class="card">
  <form method="post" action="/intake" class="row">
    <div style="flex:2"><label>용도 메모</label><input name="label" placeholder="예: 9월 예약 고객"></div>
    <div><label>유효 시간</label><input name="ttlHours" type="number" value="168"></div>
    <div style="align-self:end"><button type="submit">링크 생성</button></div>
  </form>
</div>
<div class="card"><table><tr><th>메모</th><th>링크</th><th>만료</th><th>상태</th><th>제출</th><th></th></tr>
${rows || '<tr><td colspan="6" class="muted">링크가 없습니다.</td></tr>'}</table></div>`;
}

export function publicIntakePage({ link }) {
  const body = `
<div class="pub-head"><h1>상담 사전 정보 입력</h1><p class="muted">${esc(link.label ?? '')}</p></div>
<form class="card" method="post" action="/i/${link.token}">
  <div class="row">
    <div><label>이름 *</label><input name="displayName" required></div>
    <div><label>연락처</label><input name="contact" placeholder="전화번호 또는 이메일"></div>
  </div>
  <h2>출생 정보</h2>
  <div class="row">
    <div><label>년 *</label><input name="year" type="number" required></div>
    <div><label>월 *</label><input name="month" type="number" min="1" max="12" required></div>
    <div><label>일 *</label><input name="day" type="number" min="1" max="31" required></div>
  </div>
  <div class="row">
    <div><label>시 (모르면 비움)</label><input name="hour" type="number" min="0" max="23"></div>
    <div><label>분</label><input name="minute" type="number" min="0" max="59"></div>
    <div><label>성별 *</label><select name="gender"><option value="male">남</option><option value="female">여</option></select></div>
  </div>
  <div class="row">
    <div><label>달력 *</label><select name="isLunar"><option value="false">양력</option><option value="true">음력</option></select>
      <label style="margin-top:6px"><input type="checkbox" name="isLeapMonth" value="true"> 음력 윤달</label></div>
    <div><label>출생지</label><input name="birthPlace" placeholder="예: 서울"></div>
    <div><label>시간 정확도 *</label><select name="timeAccuracy">
      <option value="exact">정확히 앎</option><option value="approximate">대략 앎</option><option value="unknown">모름</option>
    </select></div>
  </div>
  <label>상담하고 싶은 내용</label><textarea name="intakePurpose" placeholder="예: 이직 시기, 연애운"></textarea>
  <label style="margin-top:12px"><input type="checkbox" name="consent" value="yes" required> 상담 제공을 위해 위 정보를 수집·이용하는 것에 동의합니다 *</label>
  <div style="margin-top:14px"><button type="submit">제출</button></div>
</form>
<footer class="foot">제출된 정보는 상담 준비 목적으로만 사용되며, 삭제·열람을 요청할 수 있습니다.</footer>`;
  return publicLayout({ title: '사전 정보 입력', body });
}

export function intakeDonePage() {
  return publicLayout({
    title: '제출 완료',
    body: '<div class="card"><h1>제출됐습니다</h1><p>입력해 주신 정보는 상담사에게 전달됐습니다. 상담 일정에 맞춰 준비됩니다.</p></div>',
  });
}

export function settingsPage({ counselor, workspace, counselors = [], isOwner = false }) {
  const b = counselor.brand;
  const counselorRows = counselors.map((c) => `
    <tr>
      <td>${esc(c.displayName)}</td>
      <td class="mono">${esc(c.loginId ?? '-')}</td>
      <td>${badge(c.role === 'owner' ? '소유자' : '상담사', c.role === 'owner' ? 'ok' : '')}</td>
      <td>${badge(c.active ? '활성' : '비활성', c.active ? 'ok' : 'gray')}</td>
      <td>${isOwner && c.id !== counselor.id ? `<form class="inline" method="post" action="/settings/counselors/${c.id}/toggle"><button class="small secondary">${c.active ? '비활성화' : '활성화'}</button></form>` : ''}</td>
    </tr>`).join('');
  return `
<h1>브랜드 설정</h1>
<form class="card" method="post" action="/settings">
  <div class="row">
    <div><label>상담사 이름</label><input name="displayName" value="${esc(counselor.displayName)}"></div>
    <div><label>브랜드명 (리포트·공유 페이지 표시)</label><input name="brandName" value="${esc(b.name)}"></div>
  </div>
  <div class="row">
    <div><label>연락처</label><input name="brandContact" value="${esc(b.contact ?? '')}"></div>
    <div><label>로고 URL</label><input name="brandLogo" value="${esc(b.logoUrl ?? '')}"></div>
    <div><label>브랜드 색상</label><input name="brandColor" value="${esc(b.color ?? '')}" placeholder="#334155"></div>
  </div>
  <label>서명</label><input name="brandSignature" value="${esc(b.signature ?? '')}">
  <div style="margin-top:14px"><button type="submit">저장</button></div>
</form>
<h2>내 비밀번호 변경</h2>
<form class="card" method="post" action="/settings/password">
  <div class="row">
    <div><label>새 비밀번호</label><input name="password" type="password" required minlength="8"></div>
    <div style="align-self:end"><button type="submit">변경</button></div>
  </div>
</form>
<h2>상담사 계정</h2>
<div class="card"><table><tr><th>이름</th><th>로그인 ID</th><th>역할</th><th>상태</th><th></th></tr>${counselorRows}</table></div>
${isOwner ? `
<div class="card">
  <form method="post" action="/settings/counselors" class="row">
    <div><label>이름</label><input name="displayName" required></div>
    <div><label>로그인 ID</label><input name="loginId" required></div>
    <div><label>비밀번호</label><input name="password" type="password" required minlength="8"></div>
    <div><label>역할</label><select name="role"><option value="counselor">상담사</option><option value="owner">소유자</option></select></div>
    <div style="align-self:end"><button type="submit">계정 추가</button></div>
  </form>
</div>` : ''}
<div class="card muted">워크스페이스: ${esc(workspace.name)} · 생성 ${fmtDate(workspace.createdAt)}</div>`;
}

// ---------- 운영 통계 ----------

export function statsPage({ stats }) {
  const cell = (obj) => Object.entries(obj ?? {}).map(([k, v]) => `${esc(k)} ${v}`).join(' · ') || '-';
  const money = (n) => `${Number(n).toLocaleString()}원`;
  return `
<h1>운영 통계</h1>
<div class="grid">
  <div class="card"><h2>고객</h2><p style="font-size:28px;margin:0"><strong>${stats.clients.total}</strong></p><p class="muted">${cell(stats.clients.byStatus)}</p></div>
  <div class="card"><h2>세션</h2><p style="font-size:28px;margin:0"><strong>${stats.sessions.total}</strong></p><p class="muted">${cell(stats.sessions.byStatus)}</p></div>
  <div class="card"><h2>리포트</h2><p style="font-size:28px;margin:0"><strong>${stats.reports.published}</strong><span class="muted"> / ${stats.reports.total} 발행</span></p></div>
  <div class="card"><h2>예약</h2><p style="font-size:28px;margin:0"><strong>${stats.appointments.total}</strong></p><p class="muted">${cell(stats.appointments.byStatus)}</p></div>
  <div class="card"><h2>수금 (수동 원장)</h2><p style="font-size:28px;margin:0"><strong>${money(stats.payments.recordedAmount)}</strong></p><p class="muted">환불 ${money(stats.payments.refundedAmount)}</p></div>
  <div class="card"><h2>초안</h2><p style="font-size:28px;margin:0"><strong>${stats.drafts.total}</strong></p><p class="muted">${cell(stats.drafts.byState)}</p></div>
</div>`;
}

// ---------- 고객 포털 (공개 — 본인 정보 열람·통제) ----------

export function portalPage({ client, link, reports, brandName }) {
  const b = client.birth;
  const reportRows = reports.map((r) => `
    <tr><td>v${r.version} — ${esc(r.renderInput.title ?? '상담 리포트')}</td><td>${fmtDate(r.publishedAt)}</td>
    <td><a class="btn small secondary" href="/r/${r.shareToken ?? ''}" target="_blank">열기</a></td></tr>`).join('');
  const withdrawn = client.consent.withdrawnAt != null;
  const deleted = client.status === 'deletion_requested' || client.status === 'erased';
  const body = `
<div class="pub-head"><h1>${esc(brandName)} — 내 정보</h1><p class="muted">${esc(client.displayName)} 님의 등록 정보와 리포트입니다.</p></div>
<div class="card">
  <div class="row">
    <div><span class="muted">연락처</span><br>${esc(client.contact ?? '-')}</div>
    <div><span class="muted">생년월일</span><br>${b ? `${b.year}-${b.month}-${b.day} (${b.isLunar ? '음력' : '양력'})` : '삭제됨'}</div>
    <div><span class="muted">등록 경로</span><br>${esc(client.enteredBy)}</div>
  </div>
  <div style="margin-top:10px"><span class="muted">수집 목적</span><br>${esc(client.consent.purpose)}
    ${withdrawn ? ` <span class="warn">(동의 철회됨 — ${fmtDate(client.consent.withdrawnAt)})</span>` : ''}</div>
</div>
<h2>발행된 리포트</h2>
<div class="card"><table>${reportRows || '<tr><td class="muted">발행된 리포트가 없습니다.</td></tr>'}</table></div>
<h2>내 정보 통제</h2>
<div class="card">
  ${deleted
    ? `<p class="muted">${client.status === 'erased' ? '삭제 처리가 완료됐습니다.' : '삭제 요청이 접수되어 처리를 기다리고 있습니다.'}</p>`
    : `
  <form class="inline" method="post" action="/c/${link.token}/withdraw" onsubmit="return confirm('수집 동의를 철회할까요?')">
    <button class="secondary" type="submit" ${withdrawn ? 'disabled' : ''}>${withdrawn ? '동의 철회됨' : '수집 동의 철회'}</button>
  </form>
  <form class="inline" method="post" action="/c/${link.token}/deletion" style="margin-left:8px" onsubmit="return confirm('삭제를 요청할까요? 상담사 확인 후 처리됩니다.')">
    <button class="danger" type="submit">내 정보 삭제 요청</button>
  </form>
  <p class="muted" style="margin-top:10px">동의 철회·삭제 요청은 상담사에게 전달되어 처리됩니다. 법정 보존이 필요한 결제 기록은 별도 보관될 수 있습니다.</p>`}
</div>
<footer class="foot">링크 만료: ${fmtDate(link.expiresAt)} · 문의는 상담사에게 연락해 주세요.</footer>`;
  return publicLayout({ title: '내 정보', body });
}

// ---------- 리포트 인쇄 (PDF 저장용) ----------

export function printReportPage({ report, counselor }) {
  const body = `${reportBodyHtml(report, counselor)}
<script>window.onload = () => window.print();</script>`;
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><title>${esc(report.renderInput.title ?? '상담 리포트')}</title>
<style>${CSS}
  body { background:#fff; }
  main { max-width:720px; }
  .pub-head { border-bottom:2px solid var(--ink); padding-bottom:16px; margin-bottom:24px; }
  @media print { .no-print { display:none; } }
</style></head><body><main>
<div class="no-print" style="margin-bottom:16px"><button onclick="window.print()">인쇄 / PDF로 저장</button></div>
${body}
</main></body></html>`;
}
export function loginPage() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>로그인</title><style>${CSS}</style></head>
<body><main style="max-width:380px;margin-top:15vh">
<h1>MYEONG 워크스페이스</h1>
<form class="card" method="post" action="/login">
  <label>로그인 ID</label><input name="loginId" required autofocus autocomplete="username">
  <label>비밀번호</label><input name="password" type="password" required autocomplete="current-password">
  <div style="margin-top:14px"><button type="submit">로그인</button></div>
</form>
<p class="muted">부트스트랩 토큰 로그인: ID에 <code>bootstrap</code>, 비밀번호에 서버 시작 시 출력된 토큰.</p>
</main></body></html>`;
}

export function errorPage({ title, message }) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head>
<body><main><div class="card"><h1>${esc(title)}</h1><p>${esc(message)}</p></div></main></body></html>`;
}
