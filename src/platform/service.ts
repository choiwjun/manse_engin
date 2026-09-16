import { PlatformError } from './errors';
import type { PlatformStore } from './store';
import { assertTransition } from './transitions';
import type {
  Actor,
  Appointment,
  AppointmentStatus,
  AuditEvent,
  CalculationEnvelope,
  CalculationSnapshot,
  Client,
  ClientBirth,
  ClientIntake,
  ClientStatus,
  Counselor,
  CounselorBrand,
  CounselorCredential,
  CounselorRole,
  DataSubject,
  DeletionRequest,
  EnteredBy,
  IntakeLink,
  InterpretationDraft,
  IsoDateTime,
  PaymentRecord,
  PortalLink,
  ReportSection,
  ReportVersion,
  ServiceItem,
  Session,
  SessionNote,
  SessionPhase,
  SessionStatus,
  ShareLink,
  TimeAccuracy,
  Workspace,
} from './types';
import { newId as defaultNewId, newToken as defaultNewToken, sha256Hex } from './util';

// §7.4 — 고객 발행 문장의 보증성 표현 차단 (content 금칙어와 동일 목록).
export const FORBIDDEN_CUSTOMER_PHRASES = ['반드시', '보장', '확실', '100%'] as const;

export interface PlatformDeps {
  now?: () => Date;
  newId?: (prefix: string) => string;
  newToken?: () => string;
}

const DEFAULT_ACTOR: Actor = { id: 'system', role: 'system' };

export interface AppointmentWarning {
  code: 'SCHEDULE_CONFLICT' | 'MISSING_INTAKE';
  message: string;
  appointmentId?: string;
  question?: string;
}

export interface TimelineEntry {
  type: 'session' | 'snapshot' | 'report' | 'appointment' | 'payment';
  id: string;
  at: IsoDateTime;
}

export interface ClientTimeline {
  client: Client;
  entries: TimelineEntry[];
  sessions: Session[];
  snapshots: CalculationSnapshot[];
  reportVersions: ReportVersion[];
  appointments: Appointment[];
  payments: PaymentRecord[];
}

function assertNonEmpty(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new PlatformError({
      code: 'INVALID_INPUT',
      message: `필수 값이 비어 있습니다: ${field}`,
      details: { field },
    });
  }
}

function lintCustomerText(text: string): void {
  const found = FORBIDDEN_CUSTOMER_PHRASES.filter((w) => text.includes(w));
  if (found.length > 0) {
    throw new PlatformError({
      code: 'BLOCKED_PHRASE',
      message: `보증성 표현은 고객 문장에 사용할 수 없습니다: ${found.join(', ')}`,
      details: { found },
    });
  }
}

function validateBirth(birth: ClientBirth): void {
  const ints: Array<[number, string]> = [
    [birth.year, 'birth.year'],
    [birth.month, 'birth.month'],
    [birth.day, 'birth.day'],
  ];
  for (const [v, field] of ints) {
    if (!Number.isInteger(v)) {
      throw new PlatformError({ code: 'INVALID_INPUT', message: `정수가 아닙니다: ${field}`, details: { field } });
    }
  }
  if (birth.month < 1 || birth.month > 12 || birth.day < 1 || birth.day > 31) {
    throw new PlatformError({ code: 'INVALID_INPUT', message: '생년월일 범위가 올바르지 않습니다.' });
  }
  for (const [v, field, max] of [
    [birth.hour, 'birth.hour', 23],
    [birth.minute, 'birth.minute', 59],
  ] as const) {
    if (v !== null && (!Number.isInteger(v) || v < 0 || v > max)) {
      throw new PlatformError({ code: 'INVALID_INPUT', message: `범위가 올바르지 않습니다: ${field}`, details: { field } });
    }
  }
}

function validateEnvelope(envelope: CalculationEnvelope): void {
  const e = envelope as Partial<CalculationEnvelope> | null;
  const ok =
    e != null &&
    typeof e.runId === 'string' && e.runId !== '' &&
    typeof e.moduleId === 'string' && e.moduleId !== '' &&
    typeof e.engineVersion === 'string' && e.engineVersion !== '' &&
    typeof e.contractVersion === 'string' &&
    typeof e.policyId === 'string' &&
    typeof e.dataVersion === 'string' &&
    typeof e.inputHash === 'string' && e.inputHash !== '' &&
    typeof e.calculatedAt === 'string' &&
    Array.isArray(e.warnings) &&
    e.result !== undefined;
  if (!ok) {
    throw new PlatformError({
      code: 'INVALID_INPUT',
      message: '계산 envelope 필수 필드(runId·moduleId·버전·inputHash·calculatedAt·warnings·result)가 불완전합니다.',
    });
  }
}

export function finalDraftText(draft: InterpretationDraft): string {
  return draft.edit?.text ?? draft.auto.text;
}

// 고객의 계산 관련 입력 해시 — 출생정보가 바뀌면 스냅샷 stale 판정에 쓴다.
async function clientSubjectHash(client: Client): Promise<string> {
  return sha256Hex({ birth: client.birth, timeAccuracy: client.timeAccuracy });
}

export function createPlatform(store: PlatformStore, deps: PlatformDeps = {}) {
  const now = () => (deps.now ?? (() => new Date()))().toISOString();
  const genId = deps.newId ?? defaultNewId;
  const genToken = deps.newToken ?? defaultNewToken;

  function audit(workspaceId: string, actor: Actor, action: string, targetType: string, targetId: string, result: AuditEvent['result'] = 'success'): void {
    store.auditEvents.insert({
      id: genId('aud'),
      workspaceId,
      actorId: actor.id,
      actorRole: actor.role,
      action,
      targetType,
      targetId,
      at: now(),
      result,
      requestId: actor.requestId ?? null,
    });
  }

  // ---------- 워크스페이스 / 상담사 ----------

  function createWorkspace(input: {
    name: string;
    owner: { displayName: string; brand: CounselorBrand };
    retentionPolicyDays?: number | null;
  }): { workspace: Workspace; counselor: Counselor } {
    assertNonEmpty(input.name, 'name');
    const workspace: Workspace = {
      id: genId('ws'),
      name: input.name,
      ownerCounselorId: '',
      retentionPolicyDays: input.retentionPolicyDays ?? null,
      createdAt: now(),
    };
    const counselor: Counselor = {
      id: genId('cn'),
      workspaceId: workspace.id,
      displayName: input.owner.displayName,
      brand: input.owner.brand,
      loginId: null,
      role: 'owner',
      active: true,
      createdAt: now(),
    };
    workspace.ownerCounselorId = counselor.id;
    store.workspaces.insert(workspace);
    store.counselors.insert(counselor);
    audit(workspace.id, DEFAULT_ACTOR, 'workspace.create', 'workspace', workspace.id);
    return { workspace, counselor };
  }

  // ---------- 고객 (P0-A) ----------

  function createClient(
    workspaceId: string,
    input: {
      displayName: string;
      contact?: string | null;
      birth: ClientBirth;
      timeAccuracy: TimeAccuracy;
      consent: { purpose: string; collectedAt?: IsoDateTime };
      dataSubject?: DataSubject;
      enteredBy?: EnteredBy;
      intake?: Partial<ClientIntake>;
    },
    actor: Actor = DEFAULT_ACTOR,
  ): Client {
    store.workspaces.get(workspaceId);
    assertNonEmpty(input.displayName, 'displayName');
    assertNonEmpty(input.consent?.purpose, 'consent.purpose');
    validateBirth(input.birth);
    const at = now();
    const client: Client = {
      id: genId('cli'),
      workspaceId,
      displayName: input.displayName,
      contact: input.contact ?? null,
      birth: input.birth,
      timeAccuracy: input.timeAccuracy,
      consent: {
        purpose: input.consent.purpose,
        collectedAt: input.consent.collectedAt ?? at,
        withdrawnAt: null,
      },
      dataSubject: input.dataSubject ?? 'self',
      enteredBy: input.enteredBy ?? 'counselor',
      intake: {
        purpose: input.intake?.purpose ?? null,
        preQuestions: input.intake?.preQuestions ?? [],
        memo: input.intake?.memo ?? null,
      },
      status: 'active',
      deletionRequest: null,
      createdAt: at,
      updatedAt: at,
    };
    store.clients.insert(client);
    audit(workspaceId, actor, 'client.create', 'client', client.id);
    return client;
  }

  function getClient(workspaceId: string, clientId: string): Client {
    return store.clients.get(workspaceId, clientId);
  }

  function updateClient(
    workspaceId: string,
    clientId: string,
    patch: Partial<Pick<Client, 'displayName' | 'contact' | 'birth' | 'timeAccuracy' | 'intake'>>,
    actor: Actor = DEFAULT_ACTOR,
  ): Client {
    const current = store.clients.get(workspaceId, clientId);
    if (current.status === 'erased') {
      throw new PlatformError({ code: 'INVALID_INPUT', message: '삭제 처리된 고객은 수정할 수 없습니다.' });
    }
    if (patch.birth) validateBirth(patch.birth);
    // 출생정보가 바뀌어도 기존 스냅샷은 건드리지 않는다 (§6.2) — stale은 재계산으로 해소.
    const client = store.clients.update(workspaceId, clientId, (draft) => {
      if (patch.displayName !== undefined) draft.displayName = patch.displayName;
      if (patch.contact !== undefined) draft.contact = patch.contact;
      if (patch.birth !== undefined) draft.birth = patch.birth;
      if (patch.timeAccuracy !== undefined) draft.timeAccuracy = patch.timeAccuracy;
      if (patch.intake !== undefined) draft.intake = patch.intake;
      draft.updatedAt = now();
    });
    audit(workspaceId, actor, 'client.update', 'client', clientId);
    return client;
  }

  function listClients(workspaceId: string, filter?: { status?: ClientStatus }): Client[] {
    return store.clients.list(workspaceId, (c) => (filter?.status ? c.status === filter.status : true));
  }

  function searchClients(workspaceId: string, query: string): Client[] {
    const q = query.trim().toLowerCase();
    return store.clients.list(workspaceId, (c) => q === '' || c.displayName.toLowerCase().includes(q));
  }

  function setClientStatus(workspaceId: string, clientId: string, status: 'active' | 'archived', actor: Actor = DEFAULT_ACTOR): Client {
    const client = store.clients.update(workspaceId, clientId, (draft) => {
      if (draft.status === 'erased' || draft.status === 'deletion_requested') {
        throw new PlatformError({ code: 'INVALID_TRANSITION', message: `고객 상태 ${draft.status}에서는 변경할 수 없습니다.` });
      }
      draft.status = status;
      draft.updatedAt = now();
    });
    audit(workspaceId, actor, `client.${status === 'archived' ? 'archive' : 'restore'}`, 'client', clientId);
    return client;
  }

  function recordConsentWithdrawal(workspaceId: string, clientId: string, actor: Actor = DEFAULT_ACTOR): Client {
    const client = store.clients.update(workspaceId, clientId, (draft) => {
      draft.consent.withdrawnAt = now();
      draft.updatedAt = now();
    });
    audit(workspaceId, actor, 'client.consent_withdraw', 'client', clientId);
    return client;
  }

  function requestClientDeletion(
    workspaceId: string,
    clientId: string,
    input: { requestedBy: EnteredBy; reason?: string },
    actor: Actor = DEFAULT_ACTOR,
  ): Client {
    const client = store.clients.update(workspaceId, clientId, (draft) => {
      if (draft.status === 'erased') {
        throw new PlatformError({ code: 'INVALID_TRANSITION', message: '이미 삭제 처리된 고객입니다.' });
      }
      const request: DeletionRequest = {
        requestedAt: now(),
        requestedBy: input.requestedBy,
        reason: input.reason ?? null,
        status: 'pending',
        processedAt: null,
      };
      draft.deletionRequest = request;
      draft.status = 'deletion_requested';
      draft.updatedAt = now();
    });
    audit(workspaceId, actor, 'client.deletion_request', 'client', clientId);
    return client;
  }

  // 삭제 요청 처리 — 식별 가능한 필드를 지우되, 법정 보존이 필요할 수 있는
  // 결제 기록·감사 로그·계산 스냅샷은 별도 객체로 남긴다 (§6.2).
  function processClientErasure(workspaceId: string, clientId: string, actor: Actor = DEFAULT_ACTOR): Client {
    const client = store.clients.update(workspaceId, clientId, (draft) => {
      if (draft.deletionRequest?.status !== 'pending') {
        throw new PlatformError({ code: 'INVALID_TRANSITION', message: '처리 대기 중인 삭제 요청이 없습니다.' });
      }
      draft.displayName = '삭제된 고객';
      draft.contact = null;
      draft.birth = null;
      draft.intake = { purpose: null, preQuestions: [], memo: null };
      draft.status = 'erased';
      draft.deletionRequest = { ...draft.deletionRequest, status: 'processed', processedAt: now() };
      draft.updatedAt = now();
    });
    audit(workspaceId, actor, 'client.erasure', 'client', clientId);
    return client;
  }

  function getClientTimeline(workspaceId: string, clientId: string): ClientTimeline {
    const client = store.clients.get(workspaceId, clientId);
    const sessions = store.sessions.list(workspaceId, (s) => s.clientId === clientId);
    const snapshots = store.snapshots.list(workspaceId, (s) => s.clientId === clientId);
    const reportVersions = store.reportVersions.list(workspaceId, (r) => r.clientId === clientId);
    const appointments = store.appointments.list(workspaceId, (a) => a.clientId === clientId);
    const appointmentIds = new Set(appointments.map((a) => a.id));
    const payments = store.payments.list(workspaceId, (p) => appointmentIds.has(p.appointmentId));
    const entries: TimelineEntry[] = [
      ...sessions.map((s): TimelineEntry => ({ type: 'session', id: s.id, at: s.createdAt })),
      ...snapshots.map((s): TimelineEntry => ({ type: 'snapshot', id: s.id, at: s.createdAt })),
      ...reportVersions.map((r): TimelineEntry => ({ type: 'report', id: r.id, at: r.createdAt })),
      ...appointments.map((a): TimelineEntry => ({ type: 'appointment', id: a.id, at: a.createdAt })),
      ...payments.map((p): TimelineEntry => ({ type: 'payment', id: p.id, at: p.createdAt })),
    ].sort((a, b) => a.at.localeCompare(b.at));
    return { client, entries, sessions, snapshots, reportVersions, appointments, payments };
  }

  // ---------- 계산 스냅샷 (P0-B, 재현성) ----------

  async function recordCalculation(
    workspaceId: string,
    input: { clientId: string; sessionId?: string; envelope: CalculationEnvelope },
    actor: Actor = DEFAULT_ACTOR,
  ): Promise<CalculationSnapshot> {
    const client = store.clients.get(workspaceId, input.clientId);
    if (client.status === 'erased') {
      throw new PlatformError({ code: 'INVALID_INPUT', message: '삭제 처리된 고객에 대해 계산을 기록할 수 없습니다.' });
    }
    validateEnvelope(input.envelope);
    if (input.sessionId) {
      const session = store.sessions.get(workspaceId, input.sessionId);
      if (session.clientId !== input.clientId) {
        throw new PlatformError({ code: 'INVALID_INPUT', message: '세션과 고객이 일치하지 않습니다.' });
      }
    }
    // 동일 runId의 중복 적재는 멱등 — 이미 있으면 기존 스냅샷을 돌려준다.
    const existing = store.snapshots.list(workspaceId, (s) => s.envelope.runId === input.envelope.runId);
    if (existing.length > 0) return existing[0];
    const snapshot: CalculationSnapshot = {
      id: genId('calc'),
      workspaceId,
      clientId: input.clientId,
      sessionId: input.sessionId ?? null,
      envelope: input.envelope,
      subjectHash: await clientSubjectHash(client),
      createdAt: now(),
    };
    store.snapshots.insert(snapshot);
    audit(workspaceId, actor, 'calculation.record', 'calculation_snapshot', snapshot.id);
    return snapshot;
  }

  function listSnapshots(workspaceId: string, clientId: string): CalculationSnapshot[] {
    store.clients.get(workspaceId, clientId);
    return store.snapshots.list(workspaceId, (s) => s.clientId === clientId);
  }

  async function isSnapshotStale(workspaceId: string, snapshotId: string): Promise<boolean> {
    const snapshot = store.snapshots.get(workspaceId, snapshotId);
    const client = store.clients.get(workspaceId, snapshot.clientId);
    return (await clientSubjectHash(client)) !== snapshot.subjectHash;
  }

  // ---------- 세션 (P0-C) ----------

  function createSession(
    workspaceId: string,
    input: { clientId: string; appointmentId?: string },
    actor: Actor = DEFAULT_ACTOR,
  ): Session {
    store.clients.get(workspaceId, input.clientId);
    if (input.appointmentId) {
      const appointment = store.appointments.get(workspaceId, input.appointmentId);
      if (appointment.clientId !== input.clientId) {
        throw new PlatformError({ code: 'INVALID_INPUT', message: '예약과 고객이 일치하지 않습니다.' });
      }
    }
    const at = now();
    const session: Session = {
      id: genId('ses'),
      workspaceId,
      clientId: input.clientId,
      appointmentId: input.appointmentId ?? null,
      status: 'planned',
      notes: [],
      summary: null,
      followUp: null,
      startedAt: null,
      endedAt: null,
      createdAt: at,
      updatedAt: at,
    };
    store.sessions.insert(session);
    audit(workspaceId, actor, 'session.create', 'session', session.id);
    return session;
  }

  function getSession(workspaceId: string, sessionId: string): Session {
    return store.sessions.get(workspaceId, sessionId);
  }

  function transitionSession(
    workspaceId: string,
    sessionId: string,
    to: SessionStatus,
    actor: Actor = DEFAULT_ACTOR,
  ): Session {
    const session = store.sessions.update(workspaceId, sessionId, (draft) => {
      assertTransition('session', draft.status, to);
      const at = now();
      if (to === 'in_progress' && draft.startedAt === null) draft.startedAt = at;
      if ((to === 'review' || to === 'delivered') && draft.endedAt === null) draft.endedAt = at;
      draft.status = to;
      draft.updatedAt = at;
    });
    audit(workspaceId, actor, `session.${to}`, 'session', sessionId);
    return session;
  }

  const SESSION_NOTE_OPEN: readonly SessionStatus[] = ['planned', 'prepared', 'in_progress', 'review'];

  function addSessionNote(
    workspaceId: string,
    sessionId: string,
    input: { phase: SessionPhase; text: string },
    actor: Actor = DEFAULT_ACTOR,
  ): SessionNote {
    assertNonEmpty(input.text, 'text');
    const at = now();
    const note: SessionNote = {
      id: genId('note'),
      phase: input.phase,
      text: input.text,
      createdBy: actor.id,
      createdAt: at,
      updatedAt: at,
    };
    store.sessions.update(workspaceId, sessionId, (draft) => {
      if (!SESSION_NOTE_OPEN.includes(draft.status)) {
        throw new PlatformError({
          code: 'INVALID_TRANSITION',
          message: `세션 상태 ${draft.status}에서는 메모를 추가할 수 없습니다.`,
        });
      }
      draft.notes.push(note);
      draft.updatedAt = at;
    });
    audit(workspaceId, actor, 'session.note_add', 'session', sessionId);
    return note;
  }

  // US-03 — 중간 저장 충돌 방지: expectedUpdatedAt이 다르면 CONFLICT.
  function updateSessionNote(
    workspaceId: string,
    sessionId: string,
    noteId: string,
    input: { text: string; expectedUpdatedAt: IsoDateTime },
    actor: Actor = DEFAULT_ACTOR,
  ): SessionNote {
    const session = store.sessions.update(workspaceId, sessionId, (draft) => {
      const note = draft.notes.find((n) => n.id === noteId);
      if (!note) {
        throw new PlatformError({ code: 'NOT_FOUND', message: `메모를 찾을 수 없습니다: ${noteId}` });
      }
      if (note.updatedAt !== input.expectedUpdatedAt) {
        throw new PlatformError({
          code: 'CONFLICT',
          message: '다른 수정이 먼저 저장됐습니다. 최신 메모를 다시 불러오세요.',
          details: { noteId },
        });
      }
      note.text = input.text;
      note.updatedAt = now();
      draft.updatedAt = note.updatedAt;
    });
    audit(workspaceId, actor, 'session.note_update', 'session', sessionId);
    const updated = session.notes.find((n) => n.id === noteId);
    if (!updated) {
      throw new PlatformError({ code: 'NOT_FOUND', message: `메모를 찾을 수 없습니다: ${noteId}` });
    }
    return updated;
  }

  function setSessionOutcome(
    workspaceId: string,
    sessionId: string,
    input: { summary?: string; followUp?: string },
    actor: Actor = DEFAULT_ACTOR,
  ): Session {
    const session = store.sessions.update(workspaceId, sessionId, (draft) => {
      if (draft.status !== 'in_progress' && draft.status !== 'review') {
        throw new PlatformError({
          code: 'INVALID_TRANSITION',
          message: `세션 상태 ${draft.status}에서는 상담 결과를 정리할 수 없습니다.`,
        });
      }
      if (input.summary !== undefined) draft.summary = input.summary;
      if (input.followUp !== undefined) draft.followUp = input.followUp;
      draft.updatedAt = now();
    });
    audit(workspaceId, actor, 'session.outcome', 'session', sessionId);
    return session;
  }

  // ---------- 해석 초안 (§7.4 — 자동 초안과 확정 문장 분리) ----------

  function createDraft(
    workspaceId: string,
    input: {
      sessionId: string;
      snapshotId?: string;
      topic: string;
      text: string;
      basisRefs?: string[];
      visibility?: InterpretationDraft['visibility'];
      engineVersion?: string;
      contentVersion?: string | null;
    },
    actor: Actor = DEFAULT_ACTOR,
  ): InterpretationDraft {
    const session = store.sessions.get(workspaceId, input.sessionId);
    assertNonEmpty(input.topic, 'topic');
    assertNonEmpty(input.text, 'text');
    lintCustomerText(input.text);
    let engineVersion = input.engineVersion ?? null;
    if (input.snapshotId) {
      const snapshot = store.snapshots.get(workspaceId, input.snapshotId);
      if (snapshot.clientId !== session.clientId) {
        throw new PlatformError({ code: 'INVALID_INPUT', message: '스냅샷과 세션의 고객이 일치하지 않습니다.' });
      }
      engineVersion = engineVersion ?? snapshot.envelope.engineVersion;
    }
    if (!engineVersion) {
      throw new PlatformError({
        code: 'INVALID_INPUT',
        message: '자동 초안에는 생성 엔진 버전이 필요합니다 (engineVersion 또는 snapshotId).',
      });
    }
    const at = now();
    const draft: InterpretationDraft = {
      id: genId('drf'),
      workspaceId,
      sessionId: input.sessionId,
      snapshotId: input.snapshotId ?? null,
      topic: input.topic,
      auto: {
        text: input.text,
        basisRefs: input.basisRefs ?? [],
        generatedAt: at,
        engineVersion,
        contentVersion: input.contentVersion ?? null,
      },
      edit: null,
      visibility: input.visibility ?? 'customer',
      state: 'auto',
      reviewedBy: null,
      reviewedAt: null,
      createdAt: at,
      updatedAt: at,
    };
    store.drafts.insert(draft);
    audit(workspaceId, actor, 'draft.create', 'interpretation_draft', draft.id);
    return draft;
  }

  function listDrafts(workspaceId: string, sessionId: string): InterpretationDraft[] {
    store.sessions.get(workspaceId, sessionId);
    return store.drafts.list(workspaceId, (d) => d.sessionId === sessionId);
  }

  function editDraft(
    workspaceId: string,
    draftId: string,
    input: { text: string },
    actor: Actor = DEFAULT_ACTOR,
  ): InterpretationDraft {
    assertNonEmpty(input.text, 'text');
    lintCustomerText(input.text);
    const draft = store.drafts.update(workspaceId, draftId, (d) => {
      if (d.state === 'excluded') {
        throw new PlatformError({ code: 'INVALID_TRANSITION', message: '제외된 초안은 수정할 수 없습니다. 복구 후 수정하세요.' });
      }
      d.edit = { text: input.text, editedBy: actor.id, editedAt: now() };
      d.state = 'edited';
      // 승인 후 수정이면 재검수가 필요하다.
      d.reviewedBy = null;
      d.reviewedAt = null;
      d.updatedAt = now();
    });
    audit(workspaceId, actor, 'draft.edit', 'interpretation_draft', draftId);
    return draft;
  }

  function excludeDraft(workspaceId: string, draftId: string, actor: Actor = DEFAULT_ACTOR): InterpretationDraft {
    const draft = store.drafts.update(workspaceId, draftId, (d) => {
      if (d.state === 'excluded') {
        throw new PlatformError({ code: 'INVALID_TRANSITION', message: '이미 제외된 초안입니다.' });
      }
      d.state = 'excluded';
      d.reviewedBy = null;
      d.reviewedAt = null;
      d.updatedAt = now();
    });
    audit(workspaceId, actor, 'draft.exclude', 'interpretation_draft', draftId);
    return draft;
  }

  function setDraftVisibility(
    workspaceId: string,
    draftId: string,
    visibility: InterpretationDraft['visibility'],
    actor: Actor = DEFAULT_ACTOR,
  ): InterpretationDraft {
    const draft = store.drafts.update(workspaceId, draftId, (d) => {
      d.visibility = visibility;
      d.updatedAt = now();
    });
    audit(workspaceId, actor, 'draft.visibility', 'interpretation_draft', draftId);
    return draft;
  }

  function approveDraft(workspaceId: string, draftId: string, actor: Actor = DEFAULT_ACTOR): InterpretationDraft {
    const draft = store.drafts.update(workspaceId, draftId, (d) => {
      if (d.state !== 'auto' && d.state !== 'edited') {
        throw new PlatformError({
          code: 'INVALID_TRANSITION',
          message: `초안 상태 ${d.state}에서는 승인할 수 없습니다.`,
        });
      }
      d.state = 'approved';
      d.reviewedBy = actor.id;
      d.reviewedAt = now();
      d.updatedAt = now();
    });
    audit(workspaceId, actor, 'draft.approve', 'interpretation_draft', draftId);
    return draft;
  }

  // ---------- 리포트 버전 (US-04 — 검수·버전 고정·공유 링크) ----------

  function buildReportVersion(
    workspaceId: string,
    input: { sessionId: string; title?: string },
    actor: Actor = DEFAULT_ACTOR,
  ): ReportVersion {
    const session = store.sessions.get(workspaceId, input.sessionId);
    const publishable = store.drafts.list(
      workspaceId,
      (d) => d.sessionId === input.sessionId && d.visibility === 'customer' && d.state === 'approved',
    );
    const sections: ReportSection[] = publishable.map((d) => ({
      topic: d.topic,
      text: finalDraftText(d),
      draftId: d.id,
    }));
    const at = now();
    const version = store.reportVersions.list(workspaceId, (r) => r.sessionId === input.sessionId).length + 1;
    const report: ReportVersion = {
      id: genId('rpt'),
      workspaceId,
      sessionId: input.sessionId,
      clientId: session.clientId,
      version,
      renderInput: {
        title: input.title ?? null,
        sections,
        engineVersions: [...new Set(publishable.map((d) => d.auto.engineVersion))],
        generatedAt: at,
      },
      confirmations: [],
      status: 'draft',
      reviewerId: null,
      reviewedAt: null,
      publishedAt: null,
      revokedAt: null,
      createdAt: at,
    };
    store.reportVersions.insert(report);
    audit(workspaceId, actor, 'report.build', 'report_version', report.id);
    return report;
  }

  // 발행 게이트 — ① draft 상태 ② 모든 섹션이 승인된 고객용 초안과 일치
  // ③ 금칙어 ④ 검수자·시각. 위반 시 발행 불가 (§7.4, US-04).
  function publishReport(
    workspaceId: string,
    reportVersionId: string,
    input: { reviewerId: string; confirmations?: string[] },
    actor: Actor = DEFAULT_ACTOR,
  ): ReportVersion {
    assertNonEmpty(input.reviewerId, 'reviewerId');
    const report = store.reportVersions.get(workspaceId, reportVersionId);
    for (const section of report.renderInput.sections) {
      lintCustomerText(section.text);
      if (section.draftId === null) continue;
      const draft = store.drafts.get(workspaceId, section.draftId);
      if (draft.sessionId !== report.sessionId || draft.visibility !== 'customer' || draft.state !== 'approved') {
        throw new PlatformError({
          code: 'UNREVIEWED_CONTENT',
          message: `승인되지 않았거나 고객 공개 대상이 아닌 초안이 포함돼 있습니다: ${section.topic}`,
          details: { draftId: section.draftId },
        });
      }
      if (finalDraftText(draft) !== section.text) {
        throw new PlatformError({
          code: 'STALE_SECTION',
          message: `발행본 작성 후 초안이 수정됐습니다. 새 버전을 다시 만드세요: ${section.topic}`,
          details: { draftId: section.draftId },
        });
      }
    }
    if (report.renderInput.sections.length === 0) {
      throw new PlatformError({ code: 'UNREVIEWED_CONTENT', message: '발행할 섹션이 없습니다.' });
    }
    const published = store.reportVersions.update(workspaceId, reportVersionId, (draft) => {
      assertTransition('report', draft.status, 'published');
      const at = now();
      draft.status = 'published';
      draft.reviewerId = input.reviewerId;
      draft.reviewedAt = at;
      draft.publishedAt = at;
      draft.confirmations = input.confirmations ?? [];
    });
    audit(workspaceId, actor, 'report.publish', 'report_version', reportVersionId);
    return published;
  }

  function revokeReport(workspaceId: string, reportVersionId: string, actor: Actor = DEFAULT_ACTOR): ReportVersion {
    const report = store.reportVersions.update(workspaceId, reportVersionId, (draft) => {
      assertTransition('report', draft.status, 'revoked');
      draft.status = 'revoked';
      draft.revokedAt = now();
    });
    audit(workspaceId, actor, 'report.revoke', 'report_version', reportVersionId);
    return report;
  }

  function getReportVersion(workspaceId: string, reportVersionId: string): ReportVersion {
    return store.reportVersions.get(workspaceId, reportVersionId);
  }

  function listReportVersions(workspaceId: string, filter: { sessionId?: string; clientId?: string }): ReportVersion[] {
    return store.reportVersions.list(
      workspaceId,
      (r) =>
        (filter.sessionId ? r.sessionId === filter.sessionId : true) &&
        (filter.clientId ? r.clientId === filter.clientId : true),
    );
  }

  // ---------- 공유 링크 (§7.1 — 토큰·만료·철회·열람 로그) ----------

  function createShareLink(
    workspaceId: string,
    reportVersionId: string,
    input: { expiresAt?: IsoDateTime; ttlHours?: number },
    actor: Actor = DEFAULT_ACTOR,
  ): ShareLink {
    const report = store.reportVersions.get(workspaceId, reportVersionId);
    if (report.status !== 'published') {
      throw new PlatformError({ code: 'NOT_PUBLISHED', message: '발행된 리포트만 공유 링크를 만들 수 있습니다.' });
    }
    const expiresAt =
      input.expiresAt ??
      new Date((deps.now ?? (() => new Date()))().getTime() + (input.ttlHours ?? 72) * 3600_000).toISOString();
    const link: ShareLink = {
      id: genId('lnk'),
      workspaceId,
      reportVersionId,
      token: genToken(),
      expiresAt,
      createdAt: now(),
      revokedAt: null,
      views: [],
    };
    store.shareLinks.insert(link);
    audit(workspaceId, actor, 'share_link.create', 'share_link', link.id);
    return link;
  }

  function resolveShareLink(token: string): { link: ShareLink; report: ReportVersion } {
    const link = store.shareLinks.byToken(token);
    if (!link) {
      throw new PlatformError({ code: 'NOT_FOUND', message: '공유 링크를 찾을 수 없습니다.' });
    }
    if (link.revokedAt !== null) {
      throw new PlatformError({ code: 'LINK_REVOKED', message: '철회된 공유 링크입니다.' });
    }
    if (link.expiresAt <= now()) {
      throw new PlatformError({ code: 'LINK_EXPIRED', message: '만료된 공유 링크입니다.' });
    }
    const report = store.reportVersions.get(link.workspaceId, link.reportVersionId);
    if (report.status !== 'published') {
      throw new PlatformError({ code: 'NOT_PUBLISHED', message: '발행이 철회된 리포트입니다.' });
    }
    const updated = store.shareLinks.update(link.workspaceId, link.id, (draft) => {
      draft.views.push({ viewedAt: now() });
    });
    audit(link.workspaceId, { id: 'anonymous', role: 'client' }, 'share_link.view', 'share_link', link.id);
    return { link: updated, report };
  }

  function revokeShareLink(workspaceId: string, linkId: string, actor: Actor = DEFAULT_ACTOR): ShareLink {
    const link = store.shareLinks.update(workspaceId, linkId, (draft) => {
      if (draft.revokedAt !== null) {
        throw new PlatformError({ code: 'INVALID_TRANSITION', message: '이미 철회된 링크입니다.' });
      }
      draft.revokedAt = now();
    });
    audit(workspaceId, actor, 'share_link.revoke', 'share_link', linkId);
    return link;
  }

  function listShareLinks(workspaceId: string, reportVersionId: string): ShareLink[] {
    return store.shareLinks.list(workspaceId, (l) => l.reportVersionId === reportVersionId);
  }

  // ---------- 고객 사전 입력 링크 (Track B — enteredBy='client') ----------

  function createIntakeLink(
    workspaceId: string,
    input: { label?: string; expiresAt?: IsoDateTime; ttlHours?: number },
    actor: Actor = DEFAULT_ACTOR,
  ): IntakeLink {
    store.workspaces.get(workspaceId);
    const expiresAt =
      input.expiresAt ??
      new Date((deps.now ?? (() => new Date()))().getTime() + (input.ttlHours ?? 168) * 3600_000).toISOString();
    const link: IntakeLink = {
      id: genId('int'),
      workspaceId,
      token: genToken().replace('rpt_', 'int_'),
      label: input.label ?? null,
      expiresAt,
      createdAt: now(),
      revokedAt: null,
      submissions: [],
    };
    store.intakeLinks.insert(link);
    audit(workspaceId, actor, 'intake_link.create', 'intake_link', link.id);
    return link;
  }

  // 공개 폼 제출 — 고객 본인이 입력하므로 enteredBy='client', dataSubject='self'.
  function submitIntake(
    token: string,
    input: {
      displayName: string;
      contact?: string | null;
      birth: ClientBirth;
      timeAccuracy: TimeAccuracy;
      consentPurpose: string;
      intake?: Partial<ClientIntake>;
    },
  ): { client: Client; link: IntakeLink } {
    const link = store.intakeLinks.byToken(token);
    if (!link) {
      throw new PlatformError({ code: 'NOT_FOUND', message: '사전 입력 링크를 찾을 수 없습니다.' });
    }
    if (link.revokedAt !== null) {
      throw new PlatformError({ code: 'LINK_REVOKED', message: '철회된 링크입니다.' });
    }
    if (link.expiresAt <= now()) {
      throw new PlatformError({ code: 'LINK_EXPIRED', message: '만료된 링크입니다.' });
    }
    const client = createClient(
      link.workspaceId,
      {
        displayName: input.displayName,
        contact: input.contact,
        birth: input.birth,
        timeAccuracy: input.timeAccuracy,
        consent: { purpose: input.consentPurpose },
        dataSubject: 'self',
        enteredBy: 'client',
        intake: input.intake,
      },
      { id: `intake:${link.id}`, role: 'client' },
    );
    const updated = store.intakeLinks.update(link.workspaceId, link.id, (draft) => {
      draft.submissions.push({ clientId: client.id, at: now() });
    });
    return { client, link: updated };
  }

  function revokeIntakeLink(workspaceId: string, linkId: string, actor: Actor = DEFAULT_ACTOR): IntakeLink {
    const link = store.intakeLinks.update(workspaceId, linkId, (draft) => {
      if (draft.revokedAt !== null) {
        throw new PlatformError({ code: 'INVALID_TRANSITION', message: '이미 철회된 링크입니다.' });
      }
      draft.revokedAt = now();
    });
    audit(workspaceId, actor, 'intake_link.revoke', 'intake_link', linkId);
    return link;
  }

  function listIntakeLinks(workspaceId: string): IntakeLink[] {
    return store.intakeLinks.list(workspaceId);
  }

  // ---------- 고객 데이터 열람 export (§7.1 — 열람 요청 처리) ----------
  // for='client': 고객 본인 열람 — 내부 메모·미발행 초안 제외.
  // for='counselor': 상담사 작업본 — 세션 메모·초안 포함.
  function exportClientData(
    workspaceId: string,
    clientId: string,
    input: { for?: 'client' | 'counselor' },
    actor: Actor = DEFAULT_ACTOR,
  ) {
    const scope = input.for ?? 'client';
    const timeline = getClientTimeline(workspaceId, clientId);
    const sessionIds = new Set(timeline.sessions.map((s) => s.id));
    const drafts = store.drafts.list(workspaceId, (d) => sessionIds.has(d.sessionId));
    const exportDrafts =
      scope === 'counselor'
        ? drafts
        : drafts.filter((d) => d.visibility === 'customer' && d.state === 'approved');
    const sessions =
      scope === 'counselor'
        ? timeline.sessions
        : timeline.sessions.map((s) => ({ ...s, notes: [] }));
    audit(workspaceId, actor, `client.export_${scope}`, 'client', clientId);
    return {
      exportedAt: now(),
      scope,
      client: timeline.client,
      sessions,
      drafts: exportDrafts,
      snapshots: timeline.snapshots,
      reportVersions:
        scope === 'counselor'
          ? timeline.reportVersions
          : timeline.reportVersions.filter((r) => r.status === 'published'),
      appointments: timeline.appointments,
      payments: timeline.payments,
    };
  }

  // ---------- 상담사·브랜드 ----------

  function updateCounselorProfile(
    workspaceId: string,
    counselorId: string,
    patch: { displayName?: string; brand?: Partial<CounselorBrand> },
    actor: Actor = DEFAULT_ACTOR,
  ): Counselor {
    const counselor = store.counselors.update(workspaceId, counselorId, (draft) => {
      if (patch.displayName !== undefined) draft.displayName = patch.displayName;
      if (patch.brand !== undefined) draft.brand = { ...draft.brand, ...patch.brand };
    });
    audit(workspaceId, actor, 'counselor.update', 'counselor', counselorId);
    return counselor;
  }

  function getCounselor(workspaceId: string, counselorId: string): Counselor {
    return store.counselors.get(workspaceId, counselorId);
  }

  // ---------- 서비스 카탈로그 / 예약 (Track B) ----------

  function createService(
    workspaceId: string,
    input: {
      name: string;
      durationMinutes: number;
      displayPrice?: { amount: number; currency: string } | null;
      intakeQuestions?: string[];
      cancelPolicy?: string | null;
    },
    actor: Actor = DEFAULT_ACTOR,
  ): ServiceItem {
    assertNonEmpty(input.name, 'name');
    if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
      throw new PlatformError({ code: 'INVALID_INPUT', message: 'durationMinutes는 양의 정수여야 합니다.' });
    }
    const at = now();
    const service: ServiceItem = {
      id: genId('svc'),
      workspaceId,
      name: input.name,
      durationMinutes: input.durationMinutes,
      displayPrice: input.displayPrice ?? null,
      intakeQuestions: input.intakeQuestions ?? [],
      cancelPolicy: input.cancelPolicy ?? null,
      active: true,
      createdAt: at,
      updatedAt: at,
    };
    store.services.insert(service);
    audit(workspaceId, actor, 'service.create', 'service', service.id);
    return service;
  }

  function updateService(
    workspaceId: string,
    serviceId: string,
    patch: Partial<Pick<ServiceItem, 'name' | 'durationMinutes' | 'displayPrice' | 'intakeQuestions' | 'cancelPolicy' | 'active'>>,
    actor: Actor = DEFAULT_ACTOR,
  ): ServiceItem {
    const service = store.services.update(workspaceId, serviceId, (draft) => {
      Object.assign(draft, patch);
      draft.updatedAt = now();
    });
    audit(workspaceId, actor, 'service.update', 'service', serviceId);
    return service;
  }

  function listServices(workspaceId: string, filter?: { active?: boolean }): ServiceItem[] {
    return store.services.list(workspaceId, (s) => (filter?.active === undefined ? true : s.active === filter.active));
  }

  function overlaps(aStart: string, aMinutes: number, bStart: string, bMinutes: number): boolean {
    const a0 = new Date(aStart).getTime();
    const b0 = new Date(bStart).getTime();
    return a0 < b0 + bMinutes * 60_000 && b0 < a0 + aMinutes * 60_000;
  }

  function findConflictingAppointments(
    workspaceId: string,
    input: { scheduledAt: IsoDateTime; durationMinutes: number; excludeId?: string },
  ): Appointment[] {
    const active = store.appointments.list(
      workspaceId,
      (a) => (a.status === 'requested' || a.status === 'confirmed') && a.id !== input.excludeId,
    );
    return active.filter((a) => {
      const svc = store.services.find(workspaceId, a.serviceId);
      return svc ? overlaps(input.scheduledAt, input.durationMinutes, a.scheduledAt, svc.durationMinutes) : false;
    });
  }

  function createAppointment(
    workspaceId: string,
    input: {
      clientId: string;
      serviceId: string;
      scheduledAt: IsoDateTime;
      channel?: string;
      intakeAnswers?: Record<string, string>;
      counselorId?: string | null;
      seriesId?: string | null;
    },
    actor: Actor = DEFAULT_ACTOR,
  ): { appointment: Appointment; warnings: AppointmentWarning[] } {
    store.clients.get(workspaceId, input.clientId);
    const service = store.services.get(workspaceId, input.serviceId);
    if (Number.isNaN(new Date(input.scheduledAt).getTime())) {
      throw new PlatformError({ code: 'INVALID_INPUT', message: 'scheduledAt이 올바른 일시가 아닙니다.' });
    }
    const warnings: AppointmentWarning[] = [];
    for (const conflict of findConflictingAppointments(workspaceId, {
      scheduledAt: input.scheduledAt,
      durationMinutes: service.durationMinutes,
    })) {
      warnings.push({
        code: 'SCHEDULE_CONFLICT',
        message: `겹치는 예약이 있습니다: ${conflict.scheduledAt}`,
        appointmentId: conflict.id,
      });
    }
    const answers = input.intakeAnswers ?? {};
    for (const question of service.intakeQuestions) {
      if (!answers[question] || answers[question].trim() === '') {
        warnings.push({
          code: 'MISSING_INTAKE',
          message: `사전 질문 답변이 없습니다: ${question}`,
          question,
        });
      }
    }
    const at = now();
    const appointment: Appointment = {
      id: genId('apt'),
      workspaceId,
      clientId: input.clientId,
      serviceId: input.serviceId,
      counselorId: input.counselorId ?? null,
      seriesId: input.seriesId ?? null,
      scheduledAt: input.scheduledAt,
      status: 'requested',
      channel: input.channel ?? null,
      cancelReason: null,
      intakeAnswers: answers,
      createdAt: at,
      updatedAt: at,
    };
    store.appointments.insert(appointment);
    audit(workspaceId, actor, 'appointment.create', 'appointment', appointment.id);
    return { appointment, warnings };
  }

  function transitionAppointment(
    workspaceId: string,
    appointmentId: string,
    to: AppointmentStatus,
    input: { reason?: string } = {},
    actor: Actor = DEFAULT_ACTOR,
  ): Appointment {
    if (to === 'cancelled' && (input.reason == null || input.reason.trim() === '')) {
      throw new PlatformError({ code: 'MISSING_REASON', message: '취소 사유를 기록해야 합니다.' });
    }
    const appointment = store.appointments.update(workspaceId, appointmentId, (draft) => {
      assertTransition('appointment', draft.status, to);
      if (to === 'cancelled') draft.cancelReason = input.reason ?? null;
      draft.status = to;
      draft.updatedAt = now();
    });
    audit(workspaceId, actor, `appointment.${to}`, 'appointment', appointmentId);
    return appointment;
  }

  function listAppointments(workspaceId: string, filter?: { clientId?: string; status?: AppointmentStatus }): Appointment[] {
    return store.appointments.list(
      workspaceId,
      (a) =>
        (filter?.clientId ? a.clientId === filter.clientId : true) &&
        (filter?.status ? a.status === filter.status : true),
    );
  }

  // ---------- 결제 기록 (수동 외부 거래 추적 — §7.3 경계) ----------

  function createPaymentRecord(
    workspaceId: string,
    input: { appointmentId: string; amount: number; currency?: string },
    actor: Actor = DEFAULT_ACTOR,
  ): PaymentRecord {
    store.appointments.get(workspaceId, input.appointmentId);
    if (!Number.isFinite(input.amount) || input.amount < 0) {
      throw new PlatformError({ code: 'INVALID_INPUT', message: 'amount는 0 이상의 숫자여야 합니다.' });
    }
    const at = now();
    const payment: PaymentRecord = {
      id: genId('pay'),
      workspaceId,
      appointmentId: input.appointmentId,
      amount: input.amount,
      currency: input.currency ?? 'KRW',
      externalTransactionId: null,
      status: 'unpaid',
      confirmedBy: null,
      confirmedAt: null,
      refund: null,
      events: [],
      createdAt: at,
      updatedAt: at,
    };
    store.payments.insert(payment);
    audit(workspaceId, actor, 'payment.create', 'payment_record', payment.id);
    return payment;
  }

  function markPaymentRecorded(
    workspaceId: string,
    paymentId: string,
    input: { externalTransactionId: string; confirmedBy: string; note?: string },
    actor: Actor = DEFAULT_ACTOR,
  ): PaymentRecord {
    assertNonEmpty(input.externalTransactionId, 'externalTransactionId');
    assertNonEmpty(input.confirmedBy, 'confirmedBy');
    const payment = store.payments.update(workspaceId, paymentId, (draft) => {
      assertTransition('payment', draft.status, 'recorded');
      const at = now();
      draft.events.push({ at, from: draft.status, to: 'recorded', actorId: actor.id, note: input.note ?? null });
      draft.externalTransactionId = input.externalTransactionId;
      draft.confirmedBy = input.confirmedBy;
      draft.confirmedAt = at;
      draft.status = 'recorded';
      draft.updatedAt = at;
    });
    audit(workspaceId, actor, 'payment.recorded', 'payment_record', paymentId);
    return payment;
  }

  function refundPayment(
    workspaceId: string,
    paymentId: string,
    input: { amount?: number; reason: string },
    actor: Actor = DEFAULT_ACTOR,
  ): PaymentRecord {
    if (input.reason == null || input.reason.trim() === '') {
      throw new PlatformError({ code: 'MISSING_REASON', message: '환불 사유를 기록해야 합니다.' });
    }
    const payment = store.payments.update(workspaceId, paymentId, (draft) => {
      assertTransition('payment', draft.status, 'refunded');
      const at = now();
      const amount = input.amount ?? draft.amount;
      if (!Number.isFinite(amount) || amount < 0 || amount > draft.amount) {
        throw new PlatformError({ code: 'INVALID_INPUT', message: '환불 금액이 올바르지 않습니다.' });
      }
      draft.events.push({ at, from: draft.status, to: 'refunded', actorId: actor.id, note: input.reason });
      draft.refund = { amount, reason: input.reason, at };
      draft.status = 'refunded';
      draft.updatedAt = at;
    });
    audit(workspaceId, actor, 'payment.refunded', 'payment_record', paymentId);
    return payment;
  }

  function listPayments(workspaceId: string, filter?: { appointmentId?: string }): PaymentRecord[] {
    return store.payments.list(workspaceId, (p) => (filter?.appointmentId ? p.appointmentId === filter.appointmentId : true));
  }

  // ---------- 상담사 계정·로그인 (§7.2 역할별 권한) ----------
  // 비밀번호 해시는 앱 계층(scrypt 등)이 만들어 넘긴다 — 코어는 평문을 다루지 않는다.

  function createCounselorAccount(
    workspaceId: string,
    input: {
      displayName: string;
      loginId: string;
      passwordHash: string;
      passwordSalt: string;
      role?: CounselorRole;
      brand?: Partial<CounselorBrand>;
    },
    actor: Actor = DEFAULT_ACTOR,
  ): Counselor {
    assertNonEmpty(input.displayName, 'displayName');
    assertNonEmpty(input.loginId, 'loginId');
    assertNonEmpty(input.passwordHash, 'passwordHash');
    store.workspaces.get(workspaceId);
    if (store.counselors.list(workspaceId, (c) => c.loginId === input.loginId).length > 0) {
      throw new PlatformError({ code: 'CONFLICT', message: `이미 사용 중인 로그인 ID입니다: ${input.loginId}` });
    }
    const counselor: Counselor = {
      id: genId('cn'),
      workspaceId,
      displayName: input.displayName,
      brand: { name: input.displayName, ...input.brand },
      loginId: input.loginId,
      role: input.role ?? 'counselor',
      active: true,
      createdAt: now(),
    };
    store.counselors.insert(counselor);
    const at = now();
    store.credentials.insert({
      id: genId('cred'),
      workspaceId,
      counselorId: counselor.id,
      passwordHash: input.passwordHash,
      passwordSalt: input.passwordSalt,
      createdAt: at,
      updatedAt: at,
    });
    audit(workspaceId, actor, 'counselor.create', 'counselor', counselor.id);
    return counselor;
  }

  function listCounselors(workspaceId: string): Counselor[] {
    return store.counselors.list(workspaceId);
  }

  // 로그인 검증 — 평문 비밀번호와 해시 함수(앱 계층 제공)로 검증한다.
  // 성공 시 상담사, 실패 시 null. 실패도 감사에 남긴다 (§7.1 — 접근 이력).
  function verifyCounselorLogin(
    workspaceId: string,
    loginId: string,
    password: string,
    hashFn: (password: string, salt: string) => string,
  ): Counselor | null {
    const counselor = store.counselors.list(workspaceId, (c) => c.loginId === loginId && c.active)[0] ?? null;
    const cred = counselor
      ? store.credentials.list(workspaceId, (k) => k.counselorId === counselor.id)[0] ?? null
      : null;
    const ok = counselor != null && cred != null && cred.passwordHash === hashFn(password, cred.passwordSalt);
    if (counselor != null) {
      audit(workspaceId, { id: counselor.id, role: 'counselor' }, ok ? 'counselor.login' : 'counselor.login_failed', 'counselor', counselor.id, ok ? 'success' : 'denied');
    }
    return ok ? counselor : null;
  }

  function setCounselorPassword(
    workspaceId: string,
    counselorId: string,
    input: { passwordHash: string; passwordSalt: string },
    actor: Actor = DEFAULT_ACTOR,
  ): void {
    assertNonEmpty(input.passwordHash, 'passwordHash');
    store.counselors.get(workspaceId, counselorId);
    const existing = store.credentials.list(workspaceId, (k) => k.counselorId === counselorId)[0];
    if (existing) {
      store.credentials.update(workspaceId, existing.id, (draft) => {
        draft.passwordHash = input.passwordHash;
        draft.passwordSalt = input.passwordSalt;
        draft.updatedAt = now();
      });
    } else {
      const at = now();
      store.credentials.insert({ id: genId('cred'), workspaceId, counselorId, ...input, createdAt: at, updatedAt: at });
    }
    audit(workspaceId, actor, 'counselor.password_set', 'counselor', counselorId);
  }

  function setCounselorActive(
    workspaceId: string,
    counselorId: string,
    active: boolean,
    actor: Actor = DEFAULT_ACTOR,
  ): Counselor {
    const counselor = store.counselors.update(workspaceId, counselorId, (draft) => {
      if (!active && draft.role === 'owner') {
        const owners = store.counselors.list(workspaceId, (c) => c.role === 'owner' && c.active && c.id !== counselorId);
        if (owners.length === 0) {
          throw new PlatformError({ code: 'INVALID_TRANSITION', message: '마지막 owner는 비활성화할 수 없습니다.' });
        }
      }
      draft.active = active;
    });
    audit(workspaceId, actor, `counselor.${active ? 'activate' : 'deactivate'}`, 'counselor', counselorId);
    return counselor;
  }

  // ---------- 고객 포털 링크 (US-06 — 본인 열람·삭제/철회 요청) ----------

  function createPortalLink(
    workspaceId: string,
    clientId: string,
    input: { expiresAt?: IsoDateTime; ttlHours?: number } = {},
    actor: Actor = DEFAULT_ACTOR,
  ): PortalLink {
    store.clients.get(workspaceId, clientId);
    const link: PortalLink = {
      id: genId('por'),
      workspaceId,
      clientId,
      token: genToken().replace('rpt_', 'por_'),
      expiresAt: input.expiresAt ?? new Date((deps.now ?? (() => new Date()))().getTime() + (input.ttlHours ?? 720) * 3600_000).toISOString(),
      createdAt: now(),
      revokedAt: null,
      views: [],
    };
    store.portalLinks.insert(link);
    audit(workspaceId, actor, 'portal_link.create', 'portal_link', link.id);
    return link;
  }

  // 포털 링크 유효성 — 토큰은 비밀 자격증명이라 워크스페이스 스코프 없이 조회한다.
  function resolvePortalLink(token: string): { link: PortalLink; client: Client } {
    const link = store.portalLinks.byToken(token);
    if (!link) {
      throw new PlatformError({ code: 'NOT_FOUND', message: '포털 링크를 찾을 수 없습니다.' });
    }
    if (link.revokedAt !== null) {
      throw new PlatformError({ code: 'LINK_REVOKED', message: '철회된 링크입니다.' });
    }
    if (link.expiresAt <= now()) {
      throw new PlatformError({ code: 'LINK_EXPIRED', message: '만료된 링크입니다.' });
    }
    const updated = store.portalLinks.update(link.workspaceId, link.id, (draft) => {
      draft.views.push({ viewedAt: now() });
    });
    const client = store.clients.get(link.workspaceId, link.clientId);
    return { link: updated, client };
  }

  function revokePortalLink(workspaceId: string, linkId: string, actor: Actor = DEFAULT_ACTOR): PortalLink {
    const link = store.portalLinks.update(workspaceId, linkId, (draft) => {
      if (draft.revokedAt !== null) {
        throw new PlatformError({ code: 'INVALID_TRANSITION', message: '이미 철회된 링크입니다.' });
      }
      draft.revokedAt = now();
    });
    audit(workspaceId, actor, 'portal_link.revoke', 'portal_link', linkId);
    return link;
  }

  function listPortalLinks(workspaceId: string, clientId: string): PortalLink[] {
    return store.portalLinks.list(workspaceId, (l) => l.clientId === clientId);
  }

  // ---------- 리마인더 (2단계 — 발송 채널 미정, 기록·조회만) ----------
  // 실제 발송은 채널 결정 후 연동한다. 여기서는 "발송했음"을 감사 이력에 남긴다.

  function recordReminder(
    workspaceId: string,
    appointmentId: string,
    input: { channel?: string; note?: string } = {},
    actor: Actor = DEFAULT_ACTOR,
  ): void {
    const appt = store.appointments.get(workspaceId, appointmentId);
    audit(workspaceId, actor, 'appointment.remind', 'appointment', appointmentId);
    void appt;
    void input;
  }

  // withinHours 이내의 requested/confirmed 예약 — 대시보드 리마인더 목록.
  function listDueReminders(workspaceId: string, withinHours = 48): Appointment[] {
    const horizon = (deps.now ?? (() => new Date()))().getTime() + withinHours * 3600_000;
    return store.appointments
      .list(workspaceId, (a) => a.status === 'requested' || a.status === 'confirmed')
      .filter((a) => {
        const at = new Date(a.scheduledAt).getTime();
        return at >= (deps.now ?? (() => new Date()))().getTime() && at <= horizon;
      })
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }

  // ---------- 반복 예약 (3단계 — seriesId로 묶는다) ----------

  function createRecurringAppointments(
    workspaceId: string,
    input: {
      clientId: string;
      serviceId: string;
      startAt: IsoDateTime;
      freq: 'weekly' | 'biweekly' | 'monthly';
      count: number;
      channel?: string;
      counselorId?: string | null;
    },
    actor: Actor = DEFAULT_ACTOR,
  ): { appointments: Appointment[]; warnings: AppointmentWarning[] } {
    if (!Number.isInteger(input.count) || input.count < 1 || input.count > 52) {
      throw new PlatformError({ code: 'INVALID_INPUT', message: '반복 횟수는 1~52 사이여야 합니다.' });
    }
    const seriesId = genId('series');
    const start = new Date(input.startAt);
    if (Number.isNaN(start.getTime())) {
      throw new PlatformError({ code: 'INVALID_INPUT', message: 'startAt이 올바른 일시가 아닙니다.' });
    }
    const appointments: Appointment[] = [];
    const warnings: AppointmentWarning[] = [];
    for (let i = 0; i < input.count; i++) {
      const at = new Date(start);
      if (input.freq === 'weekly') at.setUTCDate(at.getUTCDate() + 7 * i);
      else if (input.freq === 'biweekly') at.setUTCDate(at.getUTCDate() + 14 * i);
      else {
        // 월 반복: 말일이 없는 달로 넘어갈 때 오버플로(1/31→3/3)를 막기 위해
        // 목표 월의 실제 말일로 일자를 클램프한다.
        at.setUTCFullYear(start.getUTCFullYear(), start.getUTCMonth() + i, 1);
        const lastDay = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 0)).getUTCDate();
        at.setUTCDate(Math.min(start.getUTCDate(), lastDay));
      }
      const { appointment, warnings: w } = createAppointment(
        workspaceId,
        { ...input, scheduledAt: at.toISOString(), seriesId },
        actor,
      );
      appointments.push(appointment);
      warnings.push(...w);
    }
    return { appointments, warnings };
  }

  // ---------- 운영 통계 (4단계 — 분석 대시보드) ----------

  function workspaceStats(workspaceId: string) {
    const clients = store.clients.list(workspaceId);
    const sessions = store.sessions.list(workspaceId);
    const drafts = store.drafts.list(workspaceId);
    const reports = store.reportVersions.list(workspaceId);
    const appointments = store.appointments.list(workspaceId);
    const payments = store.payments.list(workspaceId);
    const by = <T>(arr: T[], key: (v: T) => string) =>
      arr.reduce<Record<string, number>>((acc, v) => {
        const k = key(v);
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});
    const recordedPayments = payments.filter((p) => p.status === 'recorded');
    return {
      clients: { total: clients.length, byStatus: by(clients, (c) => c.status) },
      sessions: { total: sessions.length, byStatus: by(sessions, (s) => s.status) },
      drafts: { total: drafts.length, byState: by(drafts, (d) => d.state) },
      reports: { total: reports.length, published: reports.filter((r) => r.status === 'published').length },
      appointments: { total: appointments.length, byStatus: by(appointments, (a) => a.status) },
      payments: {
        total: payments.length,
        recordedCount: recordedPayments.length,
        recordedAmount: recordedPayments.reduce((s, p) => s + p.amount, 0),
        refundedAmount: payments.filter((p) => p.status === 'refunded').reduce((s, p) => s + (p.refund?.amount ?? 0), 0),
      },
    };
  }

  // ---------- 감사 ----------

  function listAuditEvents(workspaceId: string, filter?: { targetType?: string; targetId?: string }): AuditEvent[] {
    return store.auditEvents.list(
      workspaceId,
      (e) =>
        (filter?.targetType ? e.targetType === filter.targetType : true) &&
        (filter?.targetId ? e.targetId === filter.targetId : true),
    );
  }

  return {
    createWorkspace,
    createClient,
    getClient,
    updateClient,
    listClients,
    searchClients,
    setClientStatus,
    recordConsentWithdrawal,
    requestClientDeletion,
    processClientErasure,
    getClientTimeline,
    recordCalculation,
    listSnapshots,
    isSnapshotStale,
    createSession,
    getSession,
    transitionSession,
    addSessionNote,
    updateSessionNote,
    setSessionOutcome,
    createDraft,
    listDrafts,
    editDraft,
    excludeDraft,
    setDraftVisibility,
    approveDraft,
    buildReportVersion,
    publishReport,
    revokeReport,
    getReportVersion,
    listReportVersions,
    createShareLink,
    resolveShareLink,
    revokeShareLink,
    listShareLinks,
    createIntakeLink,
    submitIntake,
    revokeIntakeLink,
    listIntakeLinks,
    exportClientData,
    updateCounselorProfile,
    getCounselor,
    createService,
    updateService,
    listServices,
    findConflictingAppointments,
    createAppointment,
    transitionAppointment,
    listAppointments,
    createPaymentRecord,
    markPaymentRecorded,
    refundPayment,
    listPayments,
    createCounselorAccount,
    listCounselors,
    verifyCounselorLogin,
    setCounselorPassword,
    setCounselorActive,
    createPortalLink,
    resolvePortalLink,
    revokePortalLink,
    listPortalLinks,
    recordReminder,
    listDueReminders,
    createRecurringAppointments,
    workspaceStats,
    listAuditEvents,
  };
}

export type Platform = ReturnType<typeof createPlatform>;
