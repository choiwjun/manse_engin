// myeong-platform 도메인 코어 회귀 테스트 — `node --test platform.test.mjs` (dist 빌드 후).
// 기획서 §5.2 상태기계, §6.2 불변성, §7.1 테넌트 경계·공유 링크, §7.4 검수 게이트를 검증한다.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPlatform,
  createInMemoryStore,
  PlatformError,
  FORBIDDEN_CUSTOMER_PHRASES,
} from './dist/index.js';

const ACTOR = { id: 'counselor-1', role: 'counselor' };

function fakeEnvelope(overrides = {}) {
  return {
    runId: `run-${Math.random().toString(36).slice(2)}`,
    moduleId: 'saju',
    input: { birth: { year: 1985, month: 1, day: 10, hour: 16, minute: 45, gender: 'male', isLunar: false, birthPlace: null } },
    normalizedInput: { birth: { year: 1985, month: 1, day: 10, hour: 16, minute: 45, gender: 'male', isLunar: false, birthPlace: null } },
    result: { palja: '甲乙丙丁戊己庚辛' },
    engineVersion: '0.3.0',
    contractVersion: '1.0.0',
    policyId: 'kst+myeong-pro-contract-v1',
    dataVersion: '2026.09.12',
    inputHash: 'abc123',
    calculatedAt: '2026-09-16T00:00:00.000Z',
    warnings: [],
    ...overrides,
  };
}

function makePlatform(now = () => new Date('2026-09-16T09:00:00.000Z')) {
  const store = createInMemoryStore();
  const platform = createPlatform(store, { now });
  const { workspace, counselor } = platform.createWorkspace({
    name: '테스트 역학원',
    owner: { displayName: '홍상담', brand: { name: '홍상담 사주연구소' } },
  });
  return { store, platform, workspace, counselor };
}

function makeClient(platform, workspaceId, overrides = {}) {
  return platform.createClient(workspaceId, {
    displayName: '김고객',
    contact: '010-0000-0000',
    birth: { isLunar: false, year: 1985, month: 1, day: 10, hour: 16, minute: 45, gender: 'male', birthPlace: null },
    timeAccuracy: 'exact',
    consent: { purpose: '사주 상담' },
    ...overrides,
  }, ACTOR);
}

function errOf(fn) {
  try {
    fn();
  } catch (e) {
    return e;
  }
  throw new Error('예외가 발생하지 않았습니다');
}

describe('고객·동의 (P0-A)', () => {
  it('고객 생성 — 동의 목적 필수', () => {
    const { platform, workspace } = makePlatform();
    const err = errOf(() => platform.createClient(workspace.id, {
      displayName: 'X',
      birth: { isLunar: false, year: 1990, month: 1, day: 1, hour: null, minute: null, gender: 'female', birthPlace: null },
      timeAccuracy: 'unknown',
      consent: { purpose: '' },
    }));
    assert.equal(err.code, 'INVALID_INPUT');
  });

  it('테넌트 경계 — 다른 워크스페이스는 고객 존재 자체를 볼 수 없다', () => {
    const { platform, workspace } = makePlatform();
    const other = platform.createWorkspace({ name: 'B', owner: { displayName: 'B', brand: { name: 'B' } } });
    const client = makeClient(platform, workspace.id);

    const err = errOf(() => platform.getClient(other.workspace.id, client.id));
    assert.equal(err.code, 'NOT_FOUND');
    assert.equal(platform.listClients(other.workspace.id).length, 0);
    assert.equal(platform.searchClients(other.workspace.id, '김고객').length, 0);
    assert.equal(platform.getClient(workspace.id, client.id).displayName, '김고객');
  });

  it('검색·보관·동의 철회', () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    assert.equal(platform.searchClients(workspace.id, '김고').length, 1);

    const withdrawn = platform.recordConsentWithdrawal(workspace.id, client.id, ACTOR);
    assert.ok(withdrawn.consent.withdrawnAt);

    const archived = platform.setClientStatus(workspace.id, client.id, 'archived', ACTOR);
    assert.equal(archived.status, 'archived');
    assert.equal(platform.listClients(workspace.id, { status: 'active' }).length, 0);
  });

  it('삭제 요청 → 처리 시 식별정보를 지우고 결제 기록은 보존한다 (§6.2)', async () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    const service = platform.createService(workspace.id, { name: '사주 상담', durationMinutes: 60 });
    const { appointment } = platform.createAppointment(workspace.id, {
      clientId: client.id, serviceId: service.id, scheduledAt: '2026-09-20T10:00:00.000Z',
    });
    const payment = platform.createPaymentRecord(workspace.id, { appointmentId: appointment.id, amount: 70000 });
    platform.markPaymentRecorded(workspace.id, payment.id, { externalTransactionId: 'ext-1', confirmedBy: 'counselor-1' });

    platform.requestClientDeletion(workspace.id, client.id, { requestedBy: 'client', reason: '개인정보 삭제 요청' }, ACTOR);
    const erased = platform.processClientErasure(workspace.id, client.id, ACTOR);
    assert.equal(erased.status, 'erased');
    assert.equal(erased.birth, null);
    assert.equal(erased.contact, null);
    assert.equal(erased.displayName, '삭제된 고객');

    const kept = platform.listPayments(workspace.id, { appointmentId: appointment.id });
    assert.equal(kept.length, 1);
    assert.equal(kept[0].status, 'recorded');

    const err = errOf(() => platform.updateClient(workspace.id, client.id, { displayName: 'X' }));
    assert.equal(err.code, 'INVALID_INPUT');
  });
});

describe('계산 스냅샷 (재현성)', () => {
  it('envelope를 불변 보존하고 runId 중복 적재는 멱등이다', async () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    const envelope = fakeEnvelope();

    const snap1 = await platform.recordCalculation(workspace.id, { clientId: client.id, envelope });
    const snap2 = await platform.recordCalculation(workspace.id, { clientId: client.id, envelope });
    assert.equal(snap1.id, snap2.id);
    assert.equal(platform.listSnapshots(workspace.id, client.id).length, 1);
    assert.equal(snap1.envelope.engineVersion, '0.3.0');
    assert.equal(snap1.envelope.inputHash, 'abc123');
  });

  it('출생정보 수정 시 스냅샷은 유지되고 stale로 판정된다 (§6.2)', async () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    const snap = await platform.recordCalculation(workspace.id, { clientId: client.id, envelope: fakeEnvelope() });
    assert.equal(await platform.isSnapshotStale(workspace.id, snap.id), false);

    platform.updateClient(workspace.id, client.id, {
      birth: { isLunar: false, year: 1985, month: 1, day: 11, hour: 16, minute: 45, gender: 'male', birthPlace: null },
    }, ACTOR);
    assert.equal(await platform.isSnapshotStale(workspace.id, snap.id), true);
    // 기존 스냅샷 자체는 변하지 않는다
    assert.equal(platform.listSnapshots(workspace.id, client.id).length, 1);
  });

  it('불완전한 envelope는 거부한다', async () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    await assert.rejects(
      platform.recordCalculation(workspace.id, { clientId: client.id, envelope: { runId: 'x' } }),
      (e) => e.code === 'INVALID_INPUT',
    );
  });
});

describe('세션 상태기계·메모 (P0-C, US-03)', () => {
  it('planned → prepared → in_progress → review → delivered → archived', async () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    const session = platform.createSession(workspace.id, { clientId: client.id });
    assert.equal(session.status, 'planned');

    for (const to of ['prepared', 'in_progress', 'review', 'delivered', 'archived']) {
      platform.transitionSession(workspace.id, session.id, to, ACTOR);
    }
    const done = platform.getSession(workspace.id, session.id);
    assert.equal(done.status, 'archived');
    assert.ok(done.startedAt);
    assert.ok(done.endedAt);
  });

  it('허용되지 않은 전이는 INVALID_TRANSITION', () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    const session = platform.createSession(workspace.id, { clientId: client.id });
    const err = errOf(() => platform.transitionSession(workspace.id, session.id, 'delivered', ACTOR));
    assert.equal(err.code, 'INVALID_TRANSITION');
    const err2 = errOf(() => platform.transitionSession(workspace.id, session.id, 'in_progress', ACTOR));
    assert.equal(err2.code, 'INVALID_TRANSITION');
  });

  it('메모 충돌 방지 — expectedUpdatedAt 불일치 시 CONFLICT', () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    const session = platform.createSession(workspace.id, { clientId: client.id });
    const note = platform.addSessionNote(workspace.id, session.id, { phase: 'during', text: '메모1' }, ACTOR);

    const err = errOf(() => platform.updateSessionNote(workspace.id, session.id, note.id, {
      text: '낙관적 잠금 실패 케이스', expectedUpdatedAt: '2000-01-01T00:00:00.000Z',
    }, ACTOR));
    assert.equal(err.code, 'CONFLICT');

    const updated = platform.updateSessionNote(workspace.id, session.id, note.id, {
      text: '메모2', expectedUpdatedAt: note.updatedAt,
    }, ACTOR);
    assert.equal(updated.text, '메모2');
  });

  it('delivered 이후에는 메모 추가 불가', () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    const session = platform.createSession(workspace.id, { clientId: client.id });
    for (const to of ['prepared', 'in_progress', 'review', 'delivered']) {
      platform.transitionSession(workspace.id, session.id, to, ACTOR);
    }
    const err = errOf(() => platform.addSessionNote(workspace.id, session.id, { phase: 'after', text: 'x' }, ACTOR));
    assert.equal(err.code, 'INVALID_TRANSITION');
  });
});

describe('해석 초안 — 자동/확정 분리·금칙어 (§7.4)', () => {
  it('금칙어는 생성·수정 모두 차단한다', () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    const session = platform.createSession(workspace.id, { clientId: client.id });
    for (const word of FORBIDDEN_CUSTOMER_PHRASES) {
      const err = errOf(() => platform.createDraft(workspace.id, {
        sessionId: session.id, topic: '재물', text: `내년에 ${word} 대박이 납니다`, engineVersion: '0.3.0',
      }));
      assert.equal(err.code, 'BLOCKED_PHRASE');
    }
  });

  it('승인 후 수정하면 재검수가 필요하다', async () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    const snap = await platform.recordCalculation(workspace.id, { clientId: client.id, envelope: fakeEnvelope() });
    const session = platform.createSession(workspace.id, { clientId: client.id });
    const draft = platform.createDraft(workspace.id, {
      sessionId: session.id, snapshotId: snap.id, topic: '직업',
      text: '관인상생 구조가 보입니다', basisRefs: ['saju/flow/gwanin-sangsaeng'],
    });
    assert.equal(draft.auto.engineVersion, '0.3.0');

    platform.approveDraft(workspace.id, draft.id, ACTOR);
    const edited = platform.editDraft(workspace.id, draft.id, { text: '관인상생 구조이나 조후 보정이 필요합니다' }, ACTOR);
    assert.equal(edited.state, 'edited');
    assert.equal(edited.reviewedBy, null);
  });
});

describe('검수 리포트 발행 (US-04)', () => {
  async function setupSessionWithDraft() {
    const ctx = makePlatform();
    const { platform, workspace } = ctx;
    const client = makeClient(platform, workspace.id);
    const session = platform.createSession(workspace.id, { clientId: client.id });
    return { ...ctx, client, session };
  }

  it('승인된 고객용 초안만 발행본에 포함된다', async () => {
    const { platform, workspace, session } = await setupSessionWithDraft();
    const approved = platform.createDraft(workspace.id, { sessionId: session.id, topic: '직업', text: '공개 문장', engineVersion: '0.3.0' });
    platform.createDraft(workspace.id, { sessionId: session.id, topic: '내부', text: '내부 메모', engineVersion: '0.3.0', visibility: 'internal' });
    const pending = platform.createDraft(workspace.id, { sessionId: session.id, topic: '미검수', text: '자동 문장', engineVersion: '0.3.0' });
    platform.approveDraft(workspace.id, approved.id, ACTOR);
    void pending;

    const report = platform.buildReportVersion(workspace.id, { sessionId: session.id });
    assert.equal(report.renderInput.sections.length, 1);
    assert.equal(report.renderInput.sections[0].text, '공개 문장');
  });

  it('발행은 검수자·시각을 요구하고 버전을 새로 만든다', async () => {
    const { platform, workspace, session } = await setupSessionWithDraft();
    const draft = platform.createDraft(workspace.id, { sessionId: session.id, topic: '직업', text: '문장', engineVersion: '0.3.0' });
    platform.approveDraft(workspace.id, draft.id, ACTOR);

    const v1 = platform.buildReportVersion(workspace.id, { sessionId: session.id });
    const missingReviewer = errOf(() => platform.publishReport(workspace.id, v1.id, { reviewerId: '' }));
    assert.equal(missingReviewer.code, 'INVALID_INPUT');

    const published = platform.publishReport(workspace.id, v1.id, { reviewerId: 'counselor-1', confirmations: ['경고 문구 확인', '금칙어 확인'] });
    assert.equal(published.status, 'published');
    assert.equal(published.reviewerId, 'counselor-1');
    assert.ok(published.publishedAt);
    assert.deepEqual(published.confirmations, ['경고 문구 확인', '금칙어 확인']);

    // 재발행은 덮어쓰기가 아니라 새 버전
    const v2 = platform.buildReportVersion(workspace.id, { sessionId: session.id });
    assert.equal(v2.version, 2);
    platform.publishReport(workspace.id, v2.id, { reviewerId: 'counselor-1' });
    assert.equal(platform.listReportVersions(workspace.id, { sessionId: session.id }).length, 2);
  });

  it('발행본 작성 후 초안 수정 시 STALE_SECTION으로 막는다', async () => {
    const { platform, workspace, session } = await setupSessionWithDraft();
    const draft = platform.createDraft(workspace.id, { sessionId: session.id, topic: '직업', text: '원문', engineVersion: '0.3.0' });
    platform.approveDraft(workspace.id, draft.id, ACTOR);
    const report = platform.buildReportVersion(workspace.id, { sessionId: session.id });

    platform.editDraft(workspace.id, draft.id, { text: '수정됨' }, ACTOR);
    platform.approveDraft(workspace.id, draft.id, ACTOR);
    const err = errOf(() => platform.publishReport(workspace.id, report.id, { reviewerId: 'counselor-1' }));
    assert.equal(err.code, 'STALE_SECTION');
  });

  it('미승인·내부 초안이 섞이면 발행 불가', async () => {
    const { platform, workspace, session } = await setupSessionWithDraft();
    const draft = platform.createDraft(workspace.id, { sessionId: session.id, topic: '직업', text: '문장', engineVersion: '0.3.0' });
    platform.approveDraft(workspace.id, draft.id, ACTOR);
    const report = platform.buildReportVersion(workspace.id, { sessionId: session.id });
    // 승인을 철회하는 경로는 없으므로 제외로 검증 — 제외 후 발행 시도
    platform.excludeDraft(workspace.id, draft.id, ACTOR);
    const err = errOf(() => platform.publishReport(workspace.id, report.id, { reviewerId: 'counselor-1' }));
    assert.equal(err.code, 'UNREVIEWED_CONTENT');
  });
});

describe('공유 링크 (§7.1)', () => {
  async function publishedReport() {
    const ctx = makePlatform(() => new Date('2026-09-16T09:00:00.000Z'));
    const { platform, workspace } = ctx;
    const client = makeClient(platform, workspace.id);
    const session = platform.createSession(workspace.id, { clientId: client.id });
    const draft = platform.createDraft(workspace.id, { sessionId: session.id, topic: '직업', text: '문장', engineVersion: '0.3.0' });
    platform.approveDraft(workspace.id, draft.id, ACTOR);
    const report = platform.buildReportVersion(workspace.id, { sessionId: session.id });
    platform.publishReport(workspace.id, report.id, { reviewerId: 'counselor-1' });
    return { ...ctx, report };
  }

  it('발행본만 링크 생성 — 열람 로그 기록', async () => {
    const { platform, workspace, report } = await publishedReport();
    const link = platform.createShareLink(workspace.id, report.id, { ttlHours: 24 }, ACTOR);
    assert.ok(link.token.startsWith('rpt_'));
    assert.ok(!link.token.includes('김고객'));

    const resolved = platform.resolveShareLink(link.token);
    assert.equal(resolved.report.id, report.id);
    assert.equal(resolved.link.views.length, 1);
    const again = platform.resolveShareLink(link.token);
    assert.equal(again.link.views.length, 2);
  });

  it('만료·철회·미발행 링크는 거부한다', async () => {
    const { platform, workspace, report } = await publishedReport();
    const expired = platform.createShareLink(workspace.id, report.id, { expiresAt: '2026-09-15T00:00:00.000Z' }, ACTOR);
    const errExpired = errOf(() => platform.resolveShareLink(expired.token));
    assert.equal(errExpired.code, 'LINK_EXPIRED');

    const link = platform.createShareLink(workspace.id, report.id, { ttlHours: 24 }, ACTOR);
    platform.revokeShareLink(workspace.id, link.id, ACTOR);
    const errRevoked = errOf(() => platform.resolveShareLink(link.token));
    assert.equal(errRevoked.code, 'LINK_REVOKED');

    const live = platform.createShareLink(workspace.id, report.id, { ttlHours: 24 }, ACTOR);
    platform.revokeReport(workspace.id, report.id, ACTOR);
    const errNotPublished = errOf(() => platform.resolveShareLink(live.token));
    assert.equal(errNotPublished.code, 'NOT_PUBLISHED');
  });
});

describe('예약·결제 원장 (Track B)', () => {
  it('중복 시간·사전질문 누락 경고', () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    const service = platform.createService(workspace.id, {
      name: '사주 상담', durationMinutes: 60, intakeQuestions: ['상담 목적'],
    });
    const first = platform.createAppointment(workspace.id, {
      clientId: client.id, serviceId: service.id,
      scheduledAt: '2026-09-20T10:00:00.000Z', intakeAnswers: { '상담 목적': '직업' },
    });
    assert.equal(first.warnings.length, 0);

    const second = platform.createAppointment(workspace.id, {
      clientId: client.id, serviceId: service.id,
      scheduledAt: '2026-09-20T10:30:00.000Z',
    });
    const codes = second.warnings.map((w) => w.code);
    assert.ok(codes.includes('SCHEDULE_CONFLICT'));
    assert.ok(codes.includes('MISSING_INTAKE'));
  });

  it('예약 상태기계 — 취소 사유 필수', () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    const service = platform.createService(workspace.id, { name: '상담', durationMinutes: 60 });
    const { appointment } = platform.createAppointment(workspace.id, {
      clientId: client.id, serviceId: service.id, scheduledAt: '2026-09-20T10:00:00.000Z',
    });

    const errNoReason = errOf(() => platform.transitionAppointment(workspace.id, appointment.id, 'cancelled'));
    assert.equal(errNoReason.code, 'MISSING_REASON');

    platform.transitionAppointment(workspace.id, appointment.id, 'confirmed', {}, ACTOR);
    const errDone = errOf(() => platform.transitionAppointment(workspace.id, appointment.id, 'requested', {}, ACTOR));
    assert.equal(errDone.code, 'INVALID_TRANSITION');
    const cancelled = platform.transitionAppointment(workspace.id, appointment.id, 'cancelled', { reason: '고객 사정' }, ACTOR);
    assert.equal(cancelled.cancelReason, '고객 사정');
  });

  it('결제는 unpaid → recorded → refunded 단방향이고 이벤트 이력이 남는다', () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    const service = platform.createService(workspace.id, { name: '상담', durationMinutes: 60 });
    const { appointment } = platform.createAppointment(workspace.id, {
      clientId: client.id, serviceId: service.id, scheduledAt: '2026-09-20T10:00:00.000Z',
    });
    const payment = platform.createPaymentRecord(workspace.id, { appointmentId: appointment.id, amount: 70000 });
    assert.equal(payment.status, 'unpaid');

    const errSkip = errOf(() => platform.refundPayment(workspace.id, payment.id, { reason: 'x' }, ACTOR));
    assert.equal(errSkip.code, 'INVALID_TRANSITION');

    const recorded = platform.markPaymentRecorded(workspace.id, payment.id, {
      externalTransactionId: 'bank-tx-123', confirmedBy: 'counselor-1',
    }, ACTOR);
    assert.equal(recorded.status, 'recorded');
    assert.equal(recorded.externalTransactionId, 'bank-tx-123');
    assert.ok(recorded.confirmedAt);

    const errNoReason = errOf(() => platform.refundPayment(workspace.id, payment.id, { reason: '' }, ACTOR));
    assert.equal(errNoReason.code, 'MISSING_REASON');

    const refunded = platform.refundPayment(workspace.id, payment.id, { amount: 30000, reason: '부분 환불' }, ACTOR);
    assert.equal(refunded.status, 'refunded');
    assert.equal(refunded.refund.amount, 30000);
    assert.equal(refunded.events.length, 2);
    assert.equal(refunded.events[0].to, 'recorded');
    assert.equal(refunded.events[1].to, 'refunded');
  });
});

describe('사전 입력 링크·열람 export·브랜드', () => {
  const intakeInput = {
    displayName: '이사전',
    contact: '010-1111-2222',
    birth: { isLunar: true, isLeapMonth: true, year: 1990, month: 5, day: 15, hour: null, minute: null, gender: 'female', birthPlace: '부산' },
    timeAccuracy: 'unknown',
    consentPurpose: '상담 제공을 위한 사전 정보 수집',
    intake: { purpose: '이직 시기' },
  };

  it('링크 생성 → 고객 제출 시 enteredBy=client·dataSubject=self로 기록된다', () => {
    const { platform, workspace } = makePlatform();
    const link = platform.createIntakeLink(workspace.id, { label: '9월 예약' }, ACTOR);
    assert.ok(link.token.startsWith('int_'));

    const { client, link: used } = platform.submitIntake(link.token, intakeInput);
    assert.equal(client.enteredBy, 'client');
    assert.equal(client.dataSubject, 'self');
    assert.equal(client.birth.isLeapMonth, true);
    assert.equal(client.intake.purpose, '이직 시기');
    assert.equal(used.submissions.length, 1);
    assert.equal(used.submissions[0].clientId, client.id);
    assert.equal(platform.listIntakeLinks(workspace.id).length, 1);
  });

  it('만료·철회·무효 토큰은 제출을 거부한다', () => {
    const { platform, workspace } = makePlatform();
    const link = platform.createIntakeLink(workspace.id, { expiresAt: '2026-09-15T00:00:00.000Z' }, ACTOR);
    assert.equal(errOf(() => platform.submitIntake(link.token, intakeInput)).code, 'LINK_EXPIRED');
    assert.equal(errOf(() => platform.submitIntake('int_none', intakeInput)).code, 'NOT_FOUND');

    const live = platform.createIntakeLink(workspace.id, { ttlHours: 24 }, ACTOR);
    platform.revokeIntakeLink(workspace.id, live.id, ACTOR);
    assert.equal(errOf(() => platform.submitIntake(live.token, intakeInput)).code, 'LINK_REVOKED');
    // 이중 철회 불가
    assert.equal(errOf(() => platform.revokeIntakeLink(workspace.id, live.id, ACTOR)).code, 'INVALID_TRANSITION');
  });

  it('열람 export — 고객본은 내부 메모·미승인 초안·초안본 리포트를 제외한다', async () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    const session = platform.createSession(workspace.id, { clientId: client.id });
    platform.addSessionNote(workspace.id, session.id, { phase: 'during', text: '내부 메모' }, ACTOR);
    const draft = platform.createDraft(workspace.id, { sessionId: session.id, topic: '직업', text: '승인 문장', engineVersion: '0.3.0' });
    platform.createDraft(workspace.id, { sessionId: session.id, topic: '내부', text: '내부 문장', engineVersion: '0.3.0', visibility: 'internal' });
    platform.createDraft(workspace.id, { sessionId: session.id, topic: '미검수', text: '자동 문장', engineVersion: '0.3.0' });
    platform.approveDraft(workspace.id, draft.id, ACTOR);
    const report = platform.buildReportVersion(workspace.id, { sessionId: session.id });
    platform.publishReport(workspace.id, report.id, { reviewerId: 'counselor-1' });
    const draftReport = platform.buildReportVersion(workspace.id, { sessionId: session.id });

    const forClient = platform.exportClientData(workspace.id, client.id, { for: 'client' }, ACTOR);
    assert.equal(forClient.sessions[0].notes.length, 0);
    assert.equal(forClient.drafts.length, 1);
    assert.equal(forClient.drafts[0].topic, '직업');
    assert.equal(forClient.reportVersions.length, 1);
    assert.equal(forClient.reportVersions[0].status, 'published');

    const forCounselor = platform.exportClientData(workspace.id, client.id, { for: 'counselor' }, ACTOR);
    assert.equal(forCounselor.sessions[0].notes.length, 1);
    assert.equal(forCounselor.drafts.length, 3);
    assert.equal(forCounselor.reportVersions.length, 2);
    assert.equal(forCounselor.reportVersions.some((r) => r.id === draftReport.id), true);

    const actions = platform.listAuditEvents(workspace.id).map((e) => e.action);
    assert.ok(actions.includes('client.export_client'));
    assert.ok(actions.includes('client.export_counselor'));
  });

  it('상담사 프로필·브랜드 부분 수정', () => {
    const { platform, workspace, counselor } = makePlatform();
    const updated = platform.updateCounselorProfile(workspace.id, counselor.id, {
      displayName: '홍명리',
      brand: { color: '#1e40af', signature: '홍명리 올림' },
    }, ACTOR);
    assert.equal(updated.displayName, '홍명리');
    assert.equal(updated.brand.name, '홍상담 사주연구소');
    assert.equal(updated.brand.color, '#1e40af');
    assert.equal(updated.brand.signature, '홍명리 올림');
    assert.equal(platform.getCounselor(workspace.id, counselor.id).displayName, '홍명리');
  });
});

describe('상담사 계정·포털·리마인더·반복·통계', () => {
  const hash = (pw, salt) => `${salt}:${pw.split('').reverse().join('')}`;

  it('상담사 계정 생성·로그인 검증·중복 loginId 거부', () => {
    const { platform, workspace } = makePlatform();
    const acc = platform.createCounselorAccount(workspace.id, {
      displayName: '김상담', loginId: 'kim', passwordHash: hash('pw', 's1'), passwordSalt: 's1', role: 'counselor',
    }, ACTOR);
    assert.equal(acc.role, 'counselor');
    assert.equal(acc.active, true);

    assert.equal(platform.verifyCounselorLogin(workspace.id, 'kim', 'pw', hash)?.id, acc.id);
    assert.equal(platform.verifyCounselorLogin(workspace.id, 'kim', 'wrong', hash), null);
    assert.equal(errOf(() => platform.createCounselorAccount(workspace.id, {
      displayName: 'X', loginId: 'kim', passwordHash: 'h', passwordSalt: 's',
    }, ACTOR)).code, 'CONFLICT');

    platform.setCounselorActive(workspace.id, acc.id, false, ACTOR);
    assert.equal(platform.verifyCounselorLogin(workspace.id, 'kim', 'pw', hash), null);
  });

  it('마지막 owner는 비활성화할 수 없다', () => {
    const { platform, workspace, counselor } = makePlatform();
    const err = errOf(() => platform.setCounselorActive(workspace.id, counselor.id, false, ACTOR));
    assert.equal(err.code, 'INVALID_TRANSITION');
  });

  it('포털 링크 — 생성·열람 로그·만료·철회', () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    const link = platform.createPortalLink(workspace.id, client.id, { ttlHours: 24 }, ACTOR);
    assert.ok(link.token.startsWith('por_'));

    const r1 = platform.resolvePortalLink(link.token);
    assert.equal(r1.client.id, client.id);
    assert.equal(r1.link.views.length, 1);

    platform.revokePortalLink(workspace.id, link.id, ACTOR);
    assert.equal(errOf(() => platform.resolvePortalLink(link.token)).code, 'LINK_REVOKED');

    const expired = platform.createPortalLink(workspace.id, client.id, { expiresAt: '2026-09-15T00:00:00.000Z' }, ACTOR);
    assert.equal(errOf(() => platform.resolvePortalLink(expired.token)).code, 'LINK_EXPIRED');
  });

  it('리마인더 — 48시간 내 예약만 집계되고 발송이 감사된다', () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    const service = platform.createService(workspace.id, { name: '상담', durationMinutes: 60 });
    const soon = platform.createAppointment(workspace.id, {
      clientId: client.id, serviceId: service.id, scheduledAt: '2026-09-17T00:00:00.000Z', // now+15h
    });
    platform.createAppointment(workspace.id, {
      clientId: client.id, serviceId: service.id, scheduledAt: '2026-09-25T00:00:00.000Z', // now+9d — 제외
    });
    const due = platform.listDueReminders(workspace.id, 48);
    assert.deepEqual(due.map((a) => a.id), [soon.appointment.id]);

    platform.recordReminder(workspace.id, soon.appointment.id, { channel: 'sms' }, ACTOR);
    const actions = platform.listAuditEvents(workspace.id).map((e) => e.action);
    assert.ok(actions.includes('appointment.remind'));
  });

  it('반복 예약 — seriesId로 묶이고 주기별 일시가 생성된다', () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    const service = platform.createService(workspace.id, { name: '상담', durationMinutes: 60 });
    const { appointments } = platform.createRecurringAppointments(workspace.id, {
      clientId: client.id, serviceId: service.id,
      startAt: '2026-09-20T10:00:00.000Z', freq: 'weekly', count: 4,
    });
    assert.equal(appointments.length, 4);
    assert.ok(appointments.every((a) => a.seriesId === appointments[0].seriesId));
    assert.equal(appointments[1].scheduledAt, '2026-09-27T10:00:00.000Z');
    assert.equal(appointments[3].scheduledAt, '2026-10-11T10:00:00.000Z');

    assert.equal(errOf(() => platform.createRecurringAppointments(workspace.id, {
      clientId: client.id, serviceId: service.id, startAt: '2026-09-20T10:00:00.000Z', freq: 'weekly', count: 0,
    })).code, 'INVALID_INPUT');
  });

  it('운영 통계 — 상태별 집계와 수금 합계', () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    const session = platform.createSession(workspace.id, { clientId: client.id });
    const draft = platform.createDraft(workspace.id, { sessionId: session.id, topic: '직업', text: '문장', engineVersion: '0.3.0' });
    platform.approveDraft(workspace.id, draft.id, ACTOR);
    const report = platform.buildReportVersion(workspace.id, { sessionId: session.id });
    platform.publishReport(workspace.id, report.id, { reviewerId: 'counselor-1' });
    const service = platform.createService(workspace.id, { name: '상담', durationMinutes: 60 });
    const { appointment } = platform.createAppointment(workspace.id, {
      clientId: client.id, serviceId: service.id, scheduledAt: '2026-09-20T10:00:00.000Z',
    });
    const pay = platform.createPaymentRecord(workspace.id, { appointmentId: appointment.id, amount: 70000 });
    platform.markPaymentRecorded(workspace.id, pay.id, { externalTransactionId: 'x', confirmedBy: 'c' });

    const s = platform.workspaceStats(workspace.id);
    assert.equal(s.clients.total, 1);
    assert.equal(s.reports.published, 1);
    assert.equal(s.payments.recordedAmount, 70000);
    assert.equal(s.appointments.byStatus.requested, 1);
  });
});

describe('감사 로그·타임라인', () => {
  it('감사 이벤트가 행위별로 남고 테넌트별로 격리된다', async () => {
    const { platform, workspace } = makePlatform();
    const other = platform.createWorkspace({ name: 'B', owner: { displayName: 'B', brand: { name: 'B' } } });
    const client = makeClient(platform, workspace.id);
    const session = platform.createSession(workspace.id, { clientId: client.id }, ACTOR);

    const events = platform.listAuditEvents(workspace.id);
    const actions = events.map((e) => e.action);
    assert.ok(actions.includes('client.create'));
    assert.ok(actions.includes('session.create'));
    assert.equal(events.every((e) => e.workspaceId === workspace.id), true);
    assert.equal(platform.listAuditEvents(other.workspace.id).length, 1); // workspace.create만

    const target = platform.listAuditEvents(workspace.id, { targetType: 'session', targetId: session.id });
    assert.equal(target.length, 1);
    assert.equal(target[0].actorId, 'counselor-1');
  });

  it('고객 타임라인은 세션·스냅샷·리포트·예약을 시간순으로 묶는다', async () => {
    const { platform, workspace } = makePlatform();
    const client = makeClient(platform, workspace.id);
    await platform.recordCalculation(workspace.id, { clientId: client.id, envelope: fakeEnvelope() });
    const session = platform.createSession(workspace.id, { clientId: client.id });
    const service = platform.createService(workspace.id, { name: '상담', durationMinutes: 60 });
    platform.createAppointment(workspace.id, { clientId: client.id, serviceId: service.id, scheduledAt: '2026-09-20T10:00:00.000Z' });

    const timeline = platform.getClientTimeline(workspace.id, client.id);
    const types = timeline.entries.map((e) => e.type);
    assert.ok(types.includes('snapshot'));
    assert.ok(types.includes('session'));
    assert.ok(types.includes('appointment'));
    const ats = timeline.entries.map((e) => e.at);
    assert.deepEqual(ats, [...ats].sort());
  });
});
