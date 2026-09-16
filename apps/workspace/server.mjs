// MYEONG 상담사 워크스페이스 — 내부 프로토타입 서버 (node server.mjs).
// 외부 의존성 없음: node:http + 빌드된 엔진/플랫폼 dist 번들.
//
// 실행 전: npm run build (루트) — packages/*/dist가 필요하다.
// 실행:    node apps/workspace/server.mjs  [PORT=8080]
// 인증:    MYEONG_TOKEN 환경변수 또는 시작 시 생성되는 토큰(콘솔 출력).
import { createServer } from 'node:http';
import { randomBytes, scryptSync } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  createPlatform,
  PlatformError,
  finalDraftText,
} from '../../packages/myeong-platform/dist/index.js';
import { createFileStore, DEFAULT_STORE_PATH } from './file-store.mjs';
import { createSqliteStore, DEFAULT_SQLITE_PATH } from './sqlite-store.mjs';
import { runSajuCalculation, generateTopicDrafts, latestSajuSnapshot } from './engine-adapter.mjs';
import * as V from './views.mjs';

const PORT = Number(process.env.PORT ?? 8080);
const TOKEN = process.env.MYEONG_TOKEN ?? randomBytes(12).toString('hex');
// STORE=file → JSON 파일, 기본 → SQLite (node:sqlite 내장 모듈)
const STORE_KIND = process.env.STORE ?? 'sqlite';
const STORE_PATH = process.env.STORE_PATH ?? (STORE_KIND === 'file' ? DEFAULT_STORE_PATH : DEFAULT_SQLITE_PATH);

const store = STORE_KIND === 'file' ? createFileStore(STORE_PATH) : createSqliteStore(STORE_PATH);
const platform = createPlatform(store);

// 첫 실행 시 기본 워크스페이스·상담사를 만든다 (1인 상담사 ICP).
if (store.workspaces.list().length === 0) {
  platform.createWorkspace({
    name: '내 워크스페이스',
    owner: { displayName: process.env.COUNSELOR_NAME ?? '상담사', brand: { name: process.env.BRAND_NAME ?? 'MYEONG 상담실' } },
  });
}
const workspace = () => store.workspaces.list()[0];
const WS = () => workspace().id;

// ---------- 비밀번호 해시 (scrypt — 코어는 평문을 보지 않는다) ----------

function hashPassword(password, salt) {
  return scryptSync(password, salt, 32).toString('hex');
}
function makeCredential(password) {
  const salt = randomBytes(16).toString('hex');
  return { passwordHash: hashPassword(password, salt), passwordSalt: salt };
}

// 소유자 계정 부트스트랩 — loginId 'owner'가 없으면 만들고 비밀번호를 설정한다.
const owner = () => store.counselors.list(WS(), (c) => c.id === workspace().ownerCounselorId)[0]
  ?? store.counselors.list(WS())[0];
if (owner() && !owner().loginId) {
  const password = process.env.MYEONG_PASSWORD ?? randomBytes(8).toString('hex');
  const cred = makeCredential(password);
  store.counselors.update(WS(), owner().id, (d) => { d.loginId = 'owner'; d.role = d.role ?? 'owner'; d.active = true; });
  platform.setCounselorPassword(WS(), owner().id, cred);
  console.log(`[bootstrap] 소유자 계정 — loginId: owner, 비밀번호: ${password}`);
  console.log('[bootstrap] MYEONG_PASSWORD 환경변수로 고정 비밀번호를 쓸 수 있습니다.');
}

// ---------- 세션 (인메모리 — 재시작 시 로그아웃됨) ----------

const sessions = new Map(); // sid → { counselorId, expiresAt }
const SESSION_TTL = 12 * 3600_000;

function newSession(counselorId) {
  const sid = randomBytes(24).toString('hex');
  sessions.set(sid, { counselorId, expiresAt: Date.now() + SESSION_TTL });
  return sid;
}

function sessionCounselor(req) {
  const sid = parseCookies(req).myeong_session;
  const s = sid ? sessions.get(sid) : null;
  if (!s) return null;
  if (s.expiresAt < Date.now()) { sessions.delete(sid); return null; }
  return store.counselors.find(WS(), s.counselorId) ?? null;
}

// 요청의 행위자 — 로그인 세션 상담사 또는 부트스트랩 토큰(소유자).
function actorOf(req) {
  const c = sessionCounselor(req);
  return { id: c?.id ?? owner()?.id ?? 'system', role: 'counselor' };
}

// ---------- HTTP 유틸 ----------

function parseCookies(req) {
  const header = req.headers.cookie ?? '';
  return Object.fromEntries(header.split(';').map((p) => p.trim().split('=').map(decodeURIComponent)).filter((p) => p.length === 2));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function readForm(req) {
  const raw = await readBody(req);
  const params = new URLSearchParams(raw);
  const obj = {};
  for (const key of params.keys()) {
    const all = params.getAll(key);
    obj[key] = all.length > 1 ? all : all[0];
  }
  return obj;
}

function redirect(res, location, flash) {
  const url = flash ? `${location}${location.includes('?') ? '&' : '?'}${flash.kind}=${encodeURIComponent(flash.text)}` : location;
  res.writeHead(303, { Location: url });
  res.end();
}

function html(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(body);
}

function authed(req) {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (bearer === TOKEN) return true; // 부트스트랩/API 토큰
  return sessionCounselor(req) != null;
}

function flashOf(url) {
  const kind = url.searchParams.get('err') ? 'error' : url.searchParams.get('msg') ? 'ok' : null;
  return kind ? { kind, text: url.searchParams.get(kind === 'error' ? 'err' : 'msg') } : null;
}

const asArray = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

// ---------- 핸들러 ----------

const routes = [];
const route = (method, pattern, handler) => routes.push({ method, pattern, handler });
const get = (p, h) => route('GET', p, h);
const post = (p, h) => route('POST', p, h);

// pattern: '/clients/:id/calc' 형태
function match(pattern, pathname) {
  const p = pattern.split('/');
  const a = pathname.split('/');
  if (p.length !== a.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
}

// --- 인증 ---
get('/login', async (req, res) => html(res, V.loginPage()));
post('/login', async (req, res) => {
  const form = await readForm(req);
  // 부트스트랩 경로: loginId 'bootstrap' + 서버 토큰 → 소유자로 로그인
  if (form.loginId === 'bootstrap' && form.password === TOKEN) {
    const sid = newSession(owner().id);
    res.writeHead(303, { Location: '/', 'Set-Cookie': `myeong_session=${sid}; HttpOnly; Path=/; SameSite=Lax` });
    return res.end();
  }
  const counselor = platform.verifyCounselorLogin(WS(), form.loginId ?? '', form.password ?? '', hashPassword);
  if (!counselor) return html(res, V.errorPage({ title: '로그인 실패', message: 'ID 또는 비밀번호가 올바르지 않습니다.' }), 401);
  const sid = newSession(counselor.id);
  res.writeHead(303, { Location: '/', 'Set-Cookie': `myeong_session=${sid}; HttpOnly; Path=/; SameSite=Lax` });
  res.end();
});
get('/logout', async (req, res) => {
  const sid = parseCookies(req).myeong_session;
  if (sid) sessions.delete(sid);
  res.writeHead(303, { Location: '/login', 'Set-Cookie': 'myeong_session=; HttpOnly; Path=/; Max-Age=0' });
  res.end();
});

// --- 대시보드 / 고객 ---
get('/', async (req, res, url) => {
  const clients = platform.listClients(WS()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const appointments = platform.listAppointments(WS()).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const upcoming = appointments.filter((a) => a.status === 'requested' || a.status === 'confirmed');
  html(res, V.layout({
    title: '워크스페이스', brand: sessionCounselor(req)?.brand.name ?? owner()?.brand.name, flash: flashOf(url),
    body: V.dashboardPage({ clients, appointments, services: platform.listServices(WS()), todayAppts: upcoming, reminders: platform.listDueReminders(WS(), 48) }),
  }));
});

get('/clients/new', async (req, res, url) =>
  html(res, V.layout({ title: '새 고객', brand: sessionCounselor(req)?.brand.name ?? owner()?.brand.name, flash: flashOf(url), body: V.clientNewPage() })));

post('/clients', async (req, res) => {
  const f = await readForm(req);
  const client = platform.createClient(WS(), {
    displayName: f.displayName,
    contact: f.contact || null,
    birth: {
      isLunar: f.isLunar === 'true',
      isLeapMonth: f.isLeapMonth === 'true',
      year: Number(f.year), month: Number(f.month), day: Number(f.day),
      hour: f.hour === '' || f.hour == null ? null : Number(f.hour),
      minute: f.minute === '' || f.minute == null ? null : Number(f.minute),
      gender: f.gender,
      birthPlace: f.birthPlace || null,
    },
    timeAccuracy: f.timeAccuracy,
    consent: { purpose: f.consentPurpose },
    dataSubject: f.dataSubject,
    enteredBy: f.enteredBy,
    intake: { purpose: f.intakePurpose || null, memo: f.intakeMemo || null },
  }, actorOf(req));
  redirect(res, `/clients/${client.id}`, { kind: 'msg', text: '고객을 등록했습니다.' });
});

get('/clients/:id', async (req, res, url, { id }) => {
  const client = platform.getClient(WS(), id);
  const snapshots = platform.listSnapshots(WS(), id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const staleMap = new Map();
  for (const s of snapshots) staleMap.set(s.id, await platform.isSnapshotStale(WS(), s.id));
  const timeline = platform.getClientTimeline(WS(), id);
  const sessions = timeline.sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const base = `${req.headers['x-forwarded-proto'] ?? 'http'}://${req.headers.host}`;
  html(res, V.layout({
    title: client.displayName, brand: sessionCounselor(req)?.brand.name ?? owner()?.brand.name, flash: flashOf(url),
    body: V.clientDetailPage({ client, snapshots, staleMap, sessions, timeline, portalLinks: platform.listPortalLinks(WS(), id), shareBase: base }),
  }));
});

// --- 고객 포털 링크 (상담사 발급) ---
post('/clients/:id/portal-links', async (req, res, url, { id }) => {
  const f = await readForm(req);
  platform.createPortalLink(WS(), id, { ttlHours: Number(f.ttlHours) || 720 }, actorOf(req));
  redirect(res, `/clients/${id}`, { kind: 'msg', text: '포털 링크를 만들었습니다. 고객에게 URL을 전달하세요.' });
});

post('/clients/:id/portal-links/:lid/revoke', async (req, res, url, { id, lid }) => {
  platform.revokePortalLink(WS(), lid, actorOf(req));
  redirect(res, `/clients/${id}`, { kind: 'msg', text: '포털 링크를 철회했습니다.' });
});

post('/clients/:id/calc', async (req, res, url, { id }) => {
  await runSajuCalculation(platform, WS(), id, { actor: actorOf(req) });
  redirect(res, `/clients/${id}`, { kind: 'msg', text: '명식을 계산해 스냅샷으로 보존했습니다.' });
});

post('/clients/:id/sessions', async (req, res, url, { id }) => {
  const session = platform.createSession(WS(), { clientId: id }, actorOf(req));
  redirect(res, `/sessions/${session.id}`);
});

post('/clients/:id/archive', async (req, res, url, { id }) => {
  const client = platform.getClient(WS(), id);
  platform.setClientStatus(WS(), id, client.status === 'archived' ? 'active' : 'archived', actorOf(req));
  redirect(res, `/clients/${id}`);
});

post('/clients/:id/deletion', async (req, res, url, { id }) => {
  platform.requestClientDeletion(WS(), id, { requestedBy: 'client' }, actorOf(req));
  redirect(res, `/clients/${id}`, { kind: 'msg', text: '삭제 요청을 접수했습니다.' });
});

post('/clients/:id/erasure', async (req, res, url, { id }) => {
  // §7.2 — 식별정보 삭제 처리는 소유자만 실행한다.
  const me = sessionCounselor(req);
  if (me && me.role !== 'owner') {
    return redirect(res, `/clients/${id}`, { kind: 'err', text: '삭제 처리는 소유자만 실행할 수 있습니다.' });
  }
  platform.processClientErasure(WS(), id, actorOf(req));
  redirect(res, `/clients/${id}`, { kind: 'msg', text: '식별 정보를 삭제 처리했습니다.' });
});

// --- 세션 ---
get('/sessions/:id', async (req, res, url, { id }) => {
  const session = platform.getSession(WS(), id);
  const client = platform.getClient(WS(), session.clientId);
  const snapshot = latestSajuSnapshot(platform, WS(), id)
    ?? platform.listSnapshots(WS(), session.clientId).filter((s) => s.envelope.moduleId === 'saju')
      .sort((a, b) => b.envelope.calculatedAt.localeCompare(a.envelope.calculatedAt))[0] ?? null;
  const stale = snapshot ? await platform.isSnapshotStale(WS(), snapshot.id) : false;
  const drafts = platform.listDrafts(WS(), id);
  const reports = platform.listReportVersions(WS(), { sessionId: id }).sort((a, b) => b.version - a.version);
  html(res, V.layout({
    title: `세션 — ${client.displayName}`, brand: sessionCounselor(req)?.brand.name ?? owner()?.brand.name, flash: flashOf(url),
    body: V.sessionPage({ session, client, snapshot, drafts, reports, stale }),
  }));
});

post('/sessions/:id/transition', async (req, res, url, { id }) => {
  const f = await readForm(req);
  platform.transitionSession(WS(), id, f.to, actorOf(req));
  redirect(res, `/sessions/${id}`);
});

post('/sessions/:id/notes', async (req, res, url, { id }) => {
  const f = await readForm(req);
  platform.addSessionNote(WS(), id, { phase: f.phase, text: f.text }, actorOf(req));
  redirect(res, `/sessions/${id}`);
});

post('/sessions/:id/outcome', async (req, res, url, { id }) => {
  const f = await readForm(req);
  platform.setSessionOutcome(WS(), id, { summary: f.summary, followUp: f.followUp }, actorOf(req));
  redirect(res, `/sessions/${id}`);
});

post('/sessions/:id/drafts', async (req, res, url, { id }) => {
  const f = await readForm(req);
  const { created } = generateTopicDrafts(platform, WS(), id, asArray(f.topics), actorOf(req));
  redirect(res, `/sessions/${id}`, { kind: 'msg', text: `초안 ${created.length}건을 생성했습니다.` });
});

post('/sessions/:id/report', async (req, res, url, { id }) => {
  const report = platform.buildReportVersion(WS(), { sessionId: id }, actorOf(req));
  redirect(res, `/reports/${report.id}`);
});

// --- 초안 ---
post('/drafts/:id/edit', async (req, res, url, { id }) => {
  const f = await readForm(req);
  const draft = platform.editDraft(WS(), id, { text: f.text }, actorOf(req));
  redirect(res, `/sessions/${draft.sessionId}`);
});

post('/drafts/:id/approve', async (req, res, url, { id }) => {
  const draft = platform.approveDraft(WS(), id, actorOf(req));
  redirect(res, `/sessions/${draft.sessionId}`);
});

post('/drafts/:id/exclude', async (req, res, url, { id }) => {
  const draft = platform.excludeDraft(WS(), id, actorOf(req));
  redirect(res, `/sessions/${draft.sessionId}`);
});

post('/drafts/:id/visibility', async (req, res, url, { id }) => {
  const f = await readForm(req);
  const draft = platform.setDraftVisibility(WS(), id, f.visibility, actorOf(req));
  redirect(res, `/sessions/${draft.sessionId}`);
});

// --- 리포트 ---
get('/reports/:id', async (req, res, url, { id }) => {
  const report = platform.getReportVersion(WS(), id);
  const links = platform.listShareLinks(WS(), id);
  const base = `${req.headers['x-forwarded-proto'] ?? 'http'}://${req.headers.host}`;
  html(res, V.layout({
    title: `리포트 v${report.version}`, brand: sessionCounselor(req)?.brand.name ?? owner()?.brand.name, flash: flashOf(url),
    body: V.reportPage({ report, counselor: sessionCounselor(req), links, shareBase: base }),
  }));
});

post('/reports/:id/publish', async (req, res, url, { id }) => {
  const f = await readForm(req);
  platform.publishReport(WS(), id, { reviewerId: f.reviewerId, confirmations: asArray(f.confirmations) }, actorOf(req));
  redirect(res, `/reports/${id}`, { kind: 'msg', text: '리포트를 발행했습니다.' });
});

post('/reports/:id/revoke', async (req, res, url, { id }) => {
  platform.revokeReport(WS(), id, actorOf(req));
  redirect(res, `/reports/${id}`, { kind: 'msg', text: '발행을 철회했습니다.' });
});

post('/reports/:id/links', async (req, res, url, { id }) => {
  platform.createShareLink(WS(), id, { ttlHours: 72 }, actorOf(req));
  redirect(res, `/reports/${id}`, { kind: 'msg', text: '공유 링크를 만들었습니다 (72시간).' });
});

// 인쇄/PDF 뷰 — 발행본만 (draft는 검수 전이라 인쇄 불가).
get('/reports/:id/print', async (req, res, url, { id }) => {
  const report = platform.getReportVersion(WS(), id);
  if (report.status !== 'published') {
    return html(res, V.errorPage({ title: '인쇄 불가', message: '발행된 리포트만 인쇄할 수 있습니다.' }), 409);
  }
  html(res, V.printReportPage({ report, counselor: sessionCounselor(req) ?? owner() }));
});

post('/links/:id/revoke', async (req, res, url, { id }) => {
  const link = store.shareLinks.get(WS(), id);
  platform.revokeShareLink(WS(), id, actorOf(req));
  redirect(res, `/reports/${link.reportVersionId}`);
});

// --- 공개 리포트 (인증 불필요) ---
get('/r/:token', async (req, res, url, { token }) => {
  try {
    const { report, link } = platform.resolveShareLink(token);
    // 링크가 속한 워크스페이스의 상담사 브랜드로 렌더
    const owner = store.counselors.list(link.workspaceId).find((c) => c.id === store.workspaces.get(link.workspaceId).ownerCounselorId);
    html(res, V.publicReportPage({ report, counselor: owner ?? { brand: { name: 'MYEONG 상담실' } } }));
  } catch (e) {
    const msg = e instanceof PlatformError
      ? { LINK_EXPIRED: '링크가 만료됐습니다.', LINK_REVOKED: '철회된 링크입니다.', NOT_PUBLISHED: '발행이 철회된 리포트입니다.' }[e.code] ?? '리포트를 열 수 없습니다.'
      : '리포트를 열 수 없습니다.';
    html(res, V.errorPage({ title: '리포트 열람 불가', message: msg }), 404);
  }
});

// --- 예약 / 서비스 / 결제 ---
get('/appointments', async (req, res, url) => {
  const appointments = platform.listAppointments(WS()).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  html(res, V.layout({
    title: '예약', brand: sessionCounselor(req)?.brand.name ?? owner()?.brand.name, flash: flashOf(url),
    body: V.appointmentsPage({
      appointments,
      clients: platform.listClients(WS()),
      services: platform.listServices(WS()),
      payments: platform.listPayments(WS()),
      counselors: platform.listCounselors(WS()),
    }),
  }));
});

post('/appointments', async (req, res) => {
  const f = await readForm(req);
  const { appointment, warnings } = platform.createAppointment(WS(), {
    clientId: f.clientId, serviceId: f.serviceId,
    scheduledAt: new Date(`${f.scheduledAt}:00+09:00`).toISOString(),
    channel: f.channel || null,
    counselorId: f.counselorId || null,
  }, actorOf(req));
  redirect(res, '/appointments', warnings.length
    ? { kind: 'err', text: `예약을 등록했으나 경고가 있습니다: ${warnings.map((w) => w.message).join(' / ')}` }
    : { kind: 'msg', text: '예약을 등록했습니다.' });
  void appointment;
});

post('/appointments/recurring', async (req, res) => {
  const f = await readForm(req);
  const { appointments, warnings } = platform.createRecurringAppointments(WS(), {
    clientId: f.clientId, serviceId: f.serviceId,
    startAt: new Date(`${f.scheduledAt}:00+09:00`).toISOString(),
    freq: f.freq, count: Number(f.count) || 1,
    counselorId: f.counselorId || null,
  }, actorOf(req));
  redirect(res, '/appointments', warnings.length
    ? { kind: 'err', text: `반복 예약 ${appointments.length}건을 등록했으나 경고가 있습니다: ${warnings.map((w) => w.message).join(' / ')}` }
    : { kind: 'msg', text: `반복 예약 ${appointments.length}건을 등록했습니다.` });
});

post('/appointments/:id/remind', async (req, res, url, { id }) => {
  const f = await readForm(req);
  platform.recordReminder(WS(), id, { channel: f.channel || 'manual' }, actorOf(req));
  redirect(res, '/', { kind: 'msg', text: '리마인더 발송을 기록했습니다.' });
});

post('/appointments/:id/transition', async (req, res, url, { id }) => {
  const f = await readForm(req);
  platform.transitionAppointment(WS(), id, f.to, { reason: f.reason }, actorOf(req));
  redirect(res, '/appointments');
});

post('/appointments/:id/payment', async (req, res, url, { id }) => {
  const f = await readForm(req);
  const appt = store.appointments.get(WS(), id);
  const svc = store.services.find(WS(), appt.serviceId);
  const amount = f.amount !== undefined && Number(f.amount) > 0 ? Number(f.amount) : svc?.displayPrice?.amount ?? 0;
  platform.createPaymentRecord(WS(), { appointmentId: id, amount }, actorOf(req));
  redirect(res, '/appointments');
});

post('/payments/:id/record', async (req, res, url, { id }) => {
  const f = await readForm(req);
  platform.markPaymentRecorded(WS(), id, {
    externalTransactionId: f.externalTransactionId,
    confirmedBy: sessionCounselor(req)?.id ?? owner()?.id ?? 'counselor',
  }, actorOf(req));
  redirect(res, '/appointments');
});

post('/payments/:id/refund', async (req, res, url, { id }) => {
  const f = await readForm(req);
  platform.refundPayment(WS(), id, { reason: f.reason, amount: f.amount ? Number(f.amount) : undefined }, actorOf(req));
  redirect(res, '/appointments');
});

get('/services', async (req, res, url) =>
  html(res, V.layout({ title: '서비스', brand: sessionCounselor(req)?.brand.name ?? owner()?.brand.name, flash: flashOf(url), body: V.servicesPage({ services: platform.listServices(WS()) }) })));

post('/services', async (req, res) => {
  const f = await readForm(req);
  platform.createService(WS(), {
    name: f.name,
    durationMinutes: Number(f.durationMinutes),
    displayPrice: f.price ? { amount: Number(f.price), currency: 'KRW' } : null,
    cancelPolicy: f.cancelPolicy || null,
  }, actorOf(req));
  redirect(res, '/services');
});

post('/services/:id/toggle', async (req, res, url, { id }) => {
  const svc = store.services.get(WS(), id);
  platform.updateService(WS(), id, { active: !svc.active }, actorOf(req));
  redirect(res, '/services');
});

get('/audit', async (req, res, url) => {
  const events = platform.listAuditEvents(WS()).sort((a, b) => b.at.localeCompare(a.at));
  html(res, V.layout({ title: '감사 로그', brand: sessionCounselor(req)?.brand.name ?? owner()?.brand.name, flash: flashOf(url), body: V.auditPage({ events }) }));
});

// --- 사전 입력 링크 (상담사) ---
get('/intake', async (req, res, url) => {
  const base = `${req.headers['x-forwarded-proto'] ?? 'http'}://${req.headers.host}`;
  html(res, V.layout({
    title: '사전 입력', brand: sessionCounselor(req)?.brand.name ?? owner()?.brand.name, flash: flashOf(url),
    body: V.intakeLinksPage({ links: platform.listIntakeLinks(WS()), base }),
  }));
});

post('/intake', async (req, res) => {
  const f = await readForm(req);
  platform.createIntakeLink(WS(), { label: f.label || null, ttlHours: Number(f.ttlHours) || 168 }, actorOf(req));
  redirect(res, '/intake', { kind: 'msg', text: '사전 입력 링크를 만들었습니다. 고객에게 URL을 전달하세요.' });
});

post('/intake/:id/revoke', async (req, res, url, { id }) => {
  platform.revokeIntakeLink(WS(), id, actorOf(req));
  redirect(res, '/intake', { kind: 'msg', text: '링크를 철회했습니다.' });
});

// --- 고객 공개 사전 입력 (인증 없음 — 링크 토큰이 자격증명) ---
const intakeExpired = (res) =>
  html(res, V.errorPage({ title: '링크 만료', message: '이 링크는 더 이상 유효하지 않습니다. 상담사에게 새 링크를 요청해 주세요.' }), 410);

get('/i/:token', async (req, res, url, { token }) => {
  const link = store.intakeLinks.byToken(token);
  if (!link || link.revokedAt || new Date(link.expiresAt) <= new Date()) return intakeExpired(res);
  html(res, V.publicIntakePage({ link }));
});

post('/i/:token', async (req, res, url, { token }) => {
  const f = await readForm(req);
  const link = store.intakeLinks.byToken(token);
  if (!link || link.revokedAt || new Date(link.expiresAt) <= new Date()) return intakeExpired(res);
  try {
    platform.submitIntake(token, {
      displayName: f.displayName,
      contact: f.contact || null,
      intake: { purpose: f.intakePurpose || null },
      birth: {
        isLunar: f.isLunar === 'true',
        isLeapMonth: f.isLeapMonth === 'true',
        year: Number(f.year), month: Number(f.month), day: Number(f.day),
        hour: f.hour === '' || f.hour == null ? null : Number(f.hour),
        minute: f.minute === '' || f.minute == null ? null : Number(f.minute),
        gender: f.gender,
        birthPlace: f.birthPlace || null,
      },
      timeAccuracy: f.timeAccuracy,
      consentPurpose: `상담 제공을 위한 사전 정보 수집${link.label ? ` — ${link.label}` : ''}`,
    });
    html(res, V.intakeDonePage(), 201);
  } catch (e) {
    if (e instanceof PlatformError && e.code === 'VALIDATION') {
      return html(res, V.publicIntakePage({ link }), 400);
    }
    throw e;
  }
});

// --- 고객 포털 (공개 — 본인 열람·동의 철회·삭제 요청) ---
// 링크 토큰 자체가 자격증명이다. 내부 메모·다른 고객 데이터는 노출하지 않는다.
const portalExpired = (res) =>
  html(res, V.errorPage({ title: '링크 만료', message: '이 링크는 더 이상 유효하지 않습니다. 상담사에게 새 링크를 요청해 주세요.' }), 410);

get('/c/:token', async (req, res, url, { token }) => {
  try {
    const { link, client } = platform.resolvePortalLink(token);
    const reports = platform.listReportVersions(link.workspaceId, { clientId: client.id })
      .filter((r) => r.status === 'published')
      .map((r) => {
        // 발행본에 연결된 활성 공유 링크가 있으면 재사용, 없으면 발행 링크를 새로 만든다.
        const existing = platform.listShareLinks(link.workspaceId, r.id)
          .find((l) => !l.revokedAt && new Date(l.expiresAt) > new Date());
        const shareToken = existing?.token
          ?? platform.createShareLink(link.workspaceId, r.id, { ttlHours: 720 }, { id: `portal:${link.id}`, role: 'client' }).token;
        return { ...r, shareToken };
      });
    const owner = store.counselors.list(link.workspaceId).find((c) => c.id === store.workspaces.get(link.workspaceId).ownerCounselorId);
    html(res, V.portalPage({ client, link, reports, brandName: owner?.brand.name ?? 'MYEONG 상담실' }));
  } catch (e) {
    if (e instanceof PlatformError) return portalExpired(res);
    throw e;
  }
});

post('/c/:token/withdraw', async (req, res, url, { token }) => {
  try {
    const { link, client } = platform.resolvePortalLink(token);
    platform.recordConsentWithdrawal(link.workspaceId, client.id, { id: `portal:${link.id}`, role: 'client' });
    redirect(res, `/c/${token}`);
  } catch (e) {
    if (e instanceof PlatformError) return portalExpired(res);
    throw e;
  }
});

post('/c/:token/deletion', async (req, res, url, { token }) => {
  try {
    const { link, client } = platform.resolvePortalLink(token);
    platform.requestClientDeletion(link.workspaceId, client.id, { requestedBy: 'client', reason: '고객 포털에서 요청' }, { id: `portal:${link.id}`, role: 'client' });
    redirect(res, `/c/${token}`);
  } catch (e) {
    if (e instanceof PlatformError) return portalExpired(res);
    throw e;
  }
});

// --- 운영 통계 ---
get('/stats', async (req, res, url) =>
  html(res, V.layout({ title: '통계', brand: sessionCounselor(req)?.brand.name ?? owner()?.brand.name, flash: flashOf(url), body: V.statsPage({ stats: platform.workspaceStats(WS()) }) })));

// --- 고객 데이터 열람 export (JSON 다운로드) ---
get('/clients/:id/export', async (req, res, url, { id }) => {
  const scope = url.searchParams.get('for') === 'client' ? 'client' : 'counselor';
  const data = platform.exportClientData(WS(), id, { for: scope }, actorOf(req));
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="client-${id}-${scope}.json"`,
  });
  res.end(JSON.stringify(data, null, 2));
});

// --- 설정 (브랜드·계정) ---
get('/settings', async (req, res, url) => {
  const me = sessionCounselor(req) ?? owner();
  html(res, V.layout({
    title: '설정', brand: me?.brand.name, flash: flashOf(url),
    body: V.settingsPage({ counselor: me, workspace: workspace(), counselors: platform.listCounselors(WS()), isOwner: me?.role === 'owner' }),
  }));
});

post('/settings', async (req, res) => {
  const f = await readForm(req);
  const me = sessionCounselor(req) ?? owner();
  platform.updateCounselorProfile(WS(), me.id, {
    displayName: f.displayName,
    brand: { name: f.brandName, contact: f.brandContact || null, logoUrl: f.brandLogo || null, color: f.brandColor || null, signature: f.brandSignature || null },
  }, actorOf(req));
  redirect(res, '/settings', { kind: 'msg', text: '설정을 저장했습니다.' });
});

post('/settings/password', async (req, res) => {
  const f = await readForm(req);
  const me = sessionCounselor(req);
  if (!me) return redirect(res, '/login');
  platform.setCounselorPassword(WS(), me.id, makeCredential(f.password), actorOf(req));
  redirect(res, '/settings', { kind: 'msg', text: '비밀번호를 변경했습니다.' });
});

// 상담사 계정 관리 — owner만.
const ownerOnly = (req, res) => {
  const me = sessionCounselor(req);
  if (me?.role !== 'owner') {
    html(res, V.errorPage({ title: '권한 없음', message: '소유자만 사용할 수 있는 기능입니다.' }), 403);
    return null;
  }
  return me;
};

post('/settings/counselors', async (req, res) => {
  const me = ownerOnly(req, res);
  if (!me) return;
  const f = await readForm(req);
  try {
    platform.createCounselorAccount(WS(), {
      displayName: f.displayName, loginId: f.loginId, role: f.role,
      ...makeCredential(f.password),
    }, actorOf(req));
    redirect(res, '/settings', { kind: 'msg', text: '상담사 계정을 만들었습니다.' });
  } catch (e) {
    redirect(res, '/settings', { kind: 'err', text: e.message });
  }
});

post('/settings/counselors/:id/toggle', async (req, res, url, { id }) => {
  const me = ownerOnly(req, res);
  if (!me) return;
  const target = platform.getCounselor(WS(), id);
  try {
    platform.setCounselorActive(WS(), id, !target.active, actorOf(req));
    redirect(res, '/settings', { kind: 'msg', text: '계정 상태를 변경했습니다.' });
  } catch (e) {
    redirect(res, '/settings', { kind: 'err', text: e.message });
  }
});

// ---------- 서버 ----------

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const pathname = url.pathname;
  try {
    const isPublic = pathname === '/login' || pathname.startsWith('/r/') || pathname.startsWith('/i/') || pathname.startsWith('/c/');
    if (!isPublic && !authed(req)) {
      if (req.method === 'GET') return redirect(res, '/login');
      res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('인증이 필요합니다.');
    }
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const params = match(r.pattern, pathname);
      if (params) return await r.handler(req, res, url, params);
    }
    html(res, V.errorPage({ title: '404', message: '페이지를 찾을 수 없습니다.' }), 404);
  } catch (e) {
    const code = e instanceof PlatformError ? e.code : 'ERROR';
    const back = req.headers.referer ?? `http://${req.headers.host ?? 'localhost'}/`;
    if (req.method === 'POST') {
      return redirect(res, new URL(back, 'http://localhost').pathname, { kind: 'err', text: `[${code}] ${e.message}` });
    }
    html(res, V.errorPage({ title: `오류 (${code})`, message: e.message }), e instanceof PlatformError && e.code === 'NOT_FOUND' ? 404 : 500);
  }
});

server.listen(PORT, () => {
  console.log(`MYEONG 워크스페이스 — http://localhost:${PORT}`);
  console.log(`접근 토큰: ${TOKEN}`);
  console.log(`저장 파일: ${STORE_PATH}`);
  console.log('(MYEONG_TOKEN 환경변수로 고정 토큰을 쓸 수 있습니다)');
});
