// 상담사 워크스페이스 플랫폼 도메인 타입 — docs/product-plan-counselor-workspace-2026-09-16.md §6.1 기준.
// 모든 엔티티는 workspaceId를 테넌트 경계로 가진다.

export type IsoDateTime = string;

// ---------- 워크스페이스 / 상담사 ----------

export interface CounselorBrand {
  name: string;
  logoUrl?: string | null;
  color?: string | null;
  contact?: string | null;
  signature?: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  ownerCounselorId: string;
  retentionPolicyDays?: number | null;
  createdAt: IsoDateTime;
}

export type CounselorRole = 'owner' | 'counselor';

export interface Counselor {
  id: string;
  workspaceId: string;
  displayName: string;
  brand: CounselorBrand;
  // 로그인 식별자(워크스페이스 내 유일). null이면 로그인 불가 계정.
  loginId: string | null;
  role: CounselorRole;
  active: boolean;
  createdAt: IsoDateTime;
}

// 비밀번호 해시는 상담사 프로필과 분리 보관한다 — 상담사 레코드가 UI/export로
// 노출돼도 자격증명이 새지 않도록 별도 컬렉션으로 둔다.
export interface CounselorCredential {
  id: string;
  workspaceId: string;
  counselorId: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ---------- 고객 ----------

export type TimeAccuracy = 'exact' | 'approximate' | 'unknown';
export type Gender = 'male' | 'female';
export type DataSubject = 'self' | 'minor' | 'other';
export type EnteredBy = 'counselor' | 'client' | 'guardian';

export interface ClientBirth {
  isLunar: boolean;
  isLeapMonth?: boolean;
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
  gender: Gender;
  birthPlace: string | null;
}

export interface ConsentRecord {
  purpose: string;
  collectedAt: IsoDateTime;
  withdrawnAt: IsoDateTime | null;
}

export type ClientStatus = 'active' | 'archived' | 'deletion_requested' | 'erased';

export type DeletionRequestStatus = 'pending' | 'processed';

export interface DeletionRequest {
  requestedAt: IsoDateTime;
  requestedBy: EnteredBy;
  reason: string | null;
  status: DeletionRequestStatus;
  processedAt: IsoDateTime | null;
}

export interface ClientIntake {
  purpose: string | null;
  preQuestions: string[];
  memo: string | null;
}

export interface Client {
  id: string;
  workspaceId: string;
  displayName: string;
  contact: string | null;
  // 삭제 처리(erased)되면 null — 파생 스냅샷은 별도 보존한다 (§6.2)
  birth: ClientBirth | null;
  timeAccuracy: TimeAccuracy;
  consent: ConsentRecord;
  dataSubject: DataSubject;
  enteredBy: EnteredBy;
  intake: ClientIntake;
  status: ClientStatus;
  deletionRequest: DeletionRequest | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ---------- 서비스 카탈로그 ----------

export interface ServiceItem {
  id: string;
  workspaceId: string;
  name: string;
  durationMinutes: number;
  displayPrice: { amount: number; currency: string } | null;
  intakeQuestions: string[];
  cancelPolicy: string | null;
  active: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ---------- 예약 ----------

export type AppointmentStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  workspaceId: string;
  clientId: string;
  serviceId: string;
  // 담당 상담사 — 다인 조직(4단계) 배정용. null이면 워크스페이스 공통.
  counselorId: string | null;
  // 반복 예약 묶음 식별자 — 같은 시리즈끼리 같은 값.
  seriesId: string | null;
  scheduledAt: IsoDateTime;
  status: AppointmentStatus;
  channel: string | null;
  cancelReason: string | null;
  intakeAnswers: Record<string, string>;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ---------- 결제 기록 (외부 거래 수동 추적 — 자금 보관·정산 없음) ----------

export type PaymentStatus = 'unpaid' | 'recorded' | 'refunded';

export interface PaymentEvent {
  at: IsoDateTime;
  from: PaymentStatus;
  to: PaymentStatus;
  actorId: string;
  note: string | null;
}

export interface PaymentRecord {
  id: string;
  workspaceId: string;
  appointmentId: string;
  amount: number;
  currency: string;
  externalTransactionId: string | null;
  status: PaymentStatus;
  confirmedBy: string | null;
  confirmedAt: IsoDateTime | null;
  refund: { amount: number; reason: string; at: IsoDateTime } | null;
  events: PaymentEvent[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ---------- 상담 세션 ----------

export type SessionStatus = 'planned' | 'prepared' | 'in_progress' | 'review' | 'delivered' | 'archived';
export type SessionPhase = 'before' | 'during' | 'after';

export interface SessionNote {
  id: string;
  phase: SessionPhase;
  text: string;
  createdBy: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Session {
  id: string;
  workspaceId: string;
  clientId: string;
  appointmentId: string | null;
  status: SessionStatus;
  notes: SessionNote[];
  summary: string | null;
  followUp: string | null;
  startedAt: IsoDateTime | null;
  endedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ---------- 계산 스냅샷 (엔진 실행 결과의 불변 보존) ----------

export interface EngineWarningLike {
  code: string;
  message: string;
  field?: string;
}

// myeong-manseryeok-engine의 EngineRunEnvelope와 구조적으로 호환되는 최소 계약.
// 플랫폼은 엔진 내부 타입에 의존하지 않고 envelope를 불투명하게 보존한다.
export interface CalculationEnvelope {
  runId: string;
  moduleId: string;
  input: unknown;
  normalizedInput: unknown;
  result: unknown;
  engineVersion: string;
  contractVersion: string;
  policyId: string;
  dataVersion: string;
  inputHash: string;
  calculatedAt: IsoDateTime;
  warnings: EngineWarningLike[];
}

export interface CalculationSnapshot {
  id: string;
  workspaceId: string;
  clientId: string;
  sessionId: string | null;
  envelope: CalculationEnvelope;
  // 스냅샷 시점 고객 계산 입력의 해시 — 출생정보 수정 시 stale 판정에 사용
  subjectHash: string;
  createdAt: IsoDateTime;
}

// ---------- 해석 초안 (자동 초안 ↔ 상담사 확정 문장 분리) ----------

export type DraftState = 'auto' | 'edited' | 'excluded' | 'approved';
export type DraftVisibility = 'internal' | 'customer';

export interface DraftAuto {
  text: string;
  basisRefs: string[];
  generatedAt: IsoDateTime;
  engineVersion: string;
  contentVersion: string | null;
}

export interface DraftEdit {
  text: string;
  editedBy: string;
  editedAt: IsoDateTime;
}

export interface InterpretationDraft {
  id: string;
  workspaceId: string;
  sessionId: string;
  snapshotId: string | null;
  topic: string;
  auto: DraftAuto;
  edit: DraftEdit | null;
  visibility: DraftVisibility;
  state: DraftState;
  reviewedBy: string | null;
  reviewedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ---------- 리포트 버전 (덮어쓰지 않고 새 버전) ----------

export type ReportStatus = 'draft' | 'published' | 'revoked';

export interface ReportSection {
  topic: string;
  text: string;
  draftId: string | null;
}

export interface ReportRenderInput {
  title: string | null;
  sections: ReportSection[];
  engineVersions: string[];
  generatedAt: IsoDateTime;
}

export interface ReportVersion {
  id: string;
  workspaceId: string;
  sessionId: string;
  clientId: string;
  version: number;
  renderInput: ReportRenderInput;
  confirmations: string[];
  status: ReportStatus;
  reviewerId: string | null;
  reviewedAt: IsoDateTime | null;
  publishedAt: IsoDateTime | null;
  revokedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
}

// ---------- 고객 사전 입력 링크 (enteredBy='client' 수집 경로) ----------

export interface IntakeLink {
  id: string;
  workspaceId: string;
  token: string;
  label: string | null;
  expiresAt: IsoDateTime;
  createdAt: IsoDateTime;
  revokedAt: IsoDateTime | null;
  submissions: { clientId: string; at: IsoDateTime }[];
}

// ---------- 고객 포털 링크 (US-06 — 본인 정보 열람·삭제/철회 요청) ----------
// 리포트 공유 링크와 별개: 고객 본인의 데이터 전체에 접근하는 자격증명.

export interface PortalLink {
  id: string;
  workspaceId: string;
  clientId: string;
  token: string;
  expiresAt: IsoDateTime;
  createdAt: IsoDateTime;
  revokedAt: IsoDateTime | null;
  views: { viewedAt: IsoDateTime }[];
}

// ---------- 공유 링크 (무작위 토큰·만료·철회·열람 로그) ----------

export interface ShareLink {
  id: string;
  workspaceId: string;
  reportVersionId: string;
  token: string;
  expiresAt: IsoDateTime;
  createdAt: IsoDateTime;
  revokedAt: IsoDateTime | null;
  views: { viewedAt: IsoDateTime }[];
}

// ---------- 감사 ----------

export type ActorRole = 'counselor' | 'client' | 'operator' | 'system';
export type AuditResult = 'success' | 'denied' | 'error';

export interface Actor {
  id: string;
  role: ActorRole;
  requestId?: string | null;
}

export interface AuditEvent {
  id: string;
  workspaceId: string;
  actorId: string;
  actorRole: ActorRole;
  action: string;
  targetType: string;
  targetId: string;
  at: IsoDateTime;
  result: AuditResult;
  requestId: string | null;
}
