# 플랫폼 도메인 코어 핸드오프 — 상담사 워크스페이스 저장 계약 (2026-09-16)

> 기반 문서: [product-plan-counselor-workspace-2026-09-16.md](product-plan-counselor-workspace-2026-09-16.md) (discovery PRD)
> 마스터 핸드오프: [handoff-master-2026-09-15.md](handoff-master-2026-09-15.md)

## 0. 한 줄 요약

PRD §15의 지시("게이트 통과 전에는 데이터 경계·검수 흐름·계산 재현성을 먼저 구현한다")에 따라
**상담사 워크스페이스 플랫폼의 도메인 코어**를 `src/platform/`에 착수했다.
서버·DB·인증·UI는 §15의 미결정 게이트이므로 제외하고, 저장 계약(타입·상태기계·저장소 인터페이스)과
인메모리 구현 + 도메인 서비스 파사드까지만 구현했다.

## 1. 구조

```
src/platform/                canonical 소스 (이것만 수정)
  types.ts                   §6.1 객체 11종 + 상태 유니온
  errors.ts                  PlatformError (코드 열거)
  transitions.ts             세션·예약·결제·리포트 상태기계
  util.ts                    stableStringify·sha256Hex·id/token 생성·deepClone
  store.ts                   PlatformStore 계약 + createInMemoryStore
  service.ts                 createPlatform 파사드 — 유스케이스 + 감사 기록
  index.ts                   공개 표면
packages/myeong-platform/    배포 패키지 (build.mjs: 복사 → esbuild ESM/CJS → tsc d.ts)
  platform.test.mjs          도메인 회귀 24건 (node --test, dist 대상)
```

엔진과의 경계(§4.2): 플랫폼은 엔진 타입을 import하지 않는다. `CalculationEnvelope`가
`EngineRunEnvelope`와 구조적 호환인 최소 계약이고, envelope는 불투명하게 보존한다.
테스트는 가짜 envelope로 검증한다.

## 2. PRD → 코드 매핑

| PRD | 구현 |
|---|---|
| §6.1 객체 11종 | `types.ts` — workspace·counselor·client·service·appointment·payment_record·session·calculation_snapshot·interpretation_draft·report_version·audit_event (+share_link) |
| §5.2 세션 상태 | `planned→prepared→in_progress→review→delivered→archived` — `SESSION_TRANSITIONS` |
| §5.2 예약 상태 | `requested→confirmed→completed/cancelled/no_show` — 취소 시 사유 필수(MISSING_REASON) |
| §5.2 결제 | `unpaid→recorded→refunded` 수동 원장 — 외부 거래 식별자·확인자·시각·환불 사유·금액, `events[]` 대사 이력 |
| §6.2 스냅샷 불변 | `snapshots` 컬렉션은 update 없음(ImmutableEntityStore). runId 중복 적재 멱등 |
| §6.2 출생정보 수정 | 스냅샷 유지 + `subjectHash` 비교로 `isSnapshotStale` 판정 → 재계산 유도 |
| §6.2 리포트 버전 | 발행본 덮어쓰기 없음 — `buildReportVersion`이 session당 version+1 생성 |
| §7.4 검수 게이트 | `publishReport`가 ①draft 상태 ②전 섹션 approved·customer·본문 일치 ③금칙어 ④검수자·시각을 강제. 빌드 후 초안 수정 시 STALE_SECTION |
| §7.4 금칙어 | `FORBIDDEN_CUSTOMER_PHRASES`(반드시·보장·확실·100%) — content validator와 동일 목록, 생성·수정·발행 시 린트 |
| §7.1 테넌트 경계 | 모든 조회가 workspaceId 스코프. 타 테넌트 엔티티는 존재 자체를 숨기기 위해 NOT_FOUND |
| §7.1 공유 링크 | `rpt_`+48hex 무작위 토큰, 만료·철회·열람 로그, 철회된 리포트의 링크는 NOT_PUBLISHED |
| §7.1 삭제 요청 | `requestClientDeletion`→`processClientErasure`: PII 제거, 결제 기록·감사·스냅샷은 별도 보존 |
| §13 data_subject/entered_by | `Client.dataSubject`('self'·'minor'·'other')와 `enteredBy`('counselor'·'client'·'guardian') 분리 |
| US-03 충돌 방지 | `updateSessionNote`의 `expectedUpdatedAt` 낙관적 잠금 → CONFLICT |
| US-05 경고 | `createAppointment`가 SCHEDULE_CONFLICT(시간 겹침)·MISSING_INTAKE(사전질문 누락) 경고 반환 |
| 감사 | 모든 변경 유스케이스가 `audit_event` 기록 (actor·action·target·시각·requestId) |

## 3. 사용 예시

```ts
import { createPlatform, createInMemoryStore } from 'myeong-manseryeok-platform';
import { executeEngineModule } from 'myeong-manseryeok-engine';

const platform = createPlatform(createInMemoryStore());
const { workspace } = platform.createWorkspace({ name: '역학원', owner: { displayName: '홍길동', brand: { name: '홍사주' } } });
const client = platform.createClient(workspace.id, {
  displayName: '김고객', birth: { isLunar: false, year: 1985, month: 1, day: 10, hour: 16, minute: 45, gender: 'male', birthPlace: null },
  timeAccuracy: 'exact', consent: { purpose: '사주 상담' },
}, actor);

const envelope = await executeEngineModule('saju', { birth: client.birth, now: new Date().toISOString() });
const snapshot = await platform.recordCalculation(workspace.id, { clientId: client.id, envelope });
```

## 4. 내부 프로토타입 앱 (PRD 로드맵 1단계)

`apps/workspace/` — 준비→검수 리포트 수직 슬라이스. 외부 의존성 0(node:http + dist 번들).

```
apps/workspace/
  sqlite-store.mjs     PlatformStore의 SQLite 구현체 (node:sqlite, 기본 저장소)
  file-store.mjs       PlatformStore의 JSON 파일 구현체 (STORE=file 시 대체)
  engine-adapter.mjs   executeEngineModule→스냅샷, assembleReport/시점서사→주제별 초안
  views.mjs            서버렌더 HTML (esc 필수 사용)
  server.mjs           라우터·토큰 인증·폼 핸들러
  data/store.sqlite    영속 데이터 (gitignore)
```

실행: `node apps/workspace/server.mjs` (사전에 루트 `npm run build`).
인증: `MYEONG_TOKEN` 또는 시작 시 생성 토큰. `PORT`, `STORE_PATH`, `STORE=file`로 조정.

화면: 고객 CRUD/동의·삭제요청, 명식 계산→스냅샷(stale 배지), 세션 상태기계·메모·주제별 초안 생성·수정/승인/제외/공개전환, 리포트 버전·발행 체크리스트·공유 링크(72h)·철회, 예약(중복·사전질문 경고)·결제 원장(수금 확인·환불), 감사 로그 조회, `/r/:token` 공개 리포트.

추가 (2차):
- **사전 입력 링크** — `/intake`에서 `int_` 토큰 링크 생성(TTL 기본 168h)/철회, 공개 폼 `/i/:token`에서 고객이 출생정보(음력 윤달 포함)·상담 목적을 직접 입력 → `enteredBy='client'`·`dataSubject='self'`로 고객 생성, 링크별 제출 이력 추적
- **고객 데이터 열람 export** — `GET /clients/:id/export?for=client|counselor` JSON 다운로드. 고객본은 세션 메모·미승인/내부 초안·미발행 리포트 제외, `client.export_*` 감사 기록
- **브랜드 설정** — `/settings`에서 상담사 이름·브랜드(명·연락처·로고·색상·서명) 부분 수정 → 공개 리포트에 반영
- **음력 윤달** — `ClientBirth.isLeapMonth` 지원 (고객 등록 폼·사전 입력 폼 모두)

추가 (3차):
- **상담사 계정 로그인** — `loginId`+비밀번호(scrypt, 해시는 `credentials` 컬렉션에 분리 보관)·인메모리 세션 쿠키·역할(owner/counselor). 소유자 부트스트랩은 `MYEONG_PASSWORD` 또는 출력된 비밀번호, `loginId=bootstrap`+서버 토큰으로도 진입 가능. 계정 관리·삭제 처리는 owner 전용
- **고객 포털** — `por_` 토큰 `/c/:token`: 고객이 본인 등록 정보·발행 리포트 열람, 동의 철회·삭제 요청 직접 접수(US-06). 링크 만료·철회·열람 로그
- **리마인더** — 대시보드 48시간 내 예약 목록 + 발송 기록 버튼(`appointment.remind` 감사). 실제 채널 발송은 미연동
- **반복 예약** — 주/격주/월 단위 시리즈(`seriesId`), 담당 상담사 배정(`counselorId`)
- **인쇄/PDF** — `/reports/:id/print` 인쇄용 뷰(발행본만, `window.print()`), 공유 페이지에도 print CSS
- **운영 통계** — `/stats`: 고객/세션/리포트 발행률/예약 상태/수금·환불 합계/초안 상태

curl 엔드투엔드 검증 완료: 고객 등록→명식 계산→세션→주제 초안 3건→전부 승인→발행본→검수자 발행→공유 링크→공개 페이지 "상담사 검수 완료" 렌더 확인.

## 5. 검증

- `npm test` (루트): 엔진 전체(스모크+회귀 55+해석 골든+콘텐츠 160건) + 플랫폼 34건 전량 통과
- 플랫폼 단독: `cd packages/myeong-platform && npm test`
- 앱 구동: `node apps/workspace/server.mjs`

## 6. 다음 작업 (PRD 게이트 순서)

| 상태 | 항목 |
|---|---|
| 외부 필요 | 전문가 검수·상담사 인터뷰·법무 검토 — §15 상위 게이트 전부 |
| 미결정 | 알림 채널(카카오/SMS/이메일)·PG 연동 여부 — 현재 발송 기록만, 실제 발송 없음 |
| 부분 완료 | 인증: 상담사 계정+역할 완료(MFA·운영자 break-glass는 외부 인증 제공자 필요). 저장소: SQLite 완료(Postgres는 계약 구현만). 알림: 리마인더 집계·기록 완료(채널 발송 미연동). 고객 포털: 열람·철회·삭제요청 완료. PDF: 인쇄 뷰 완료(파일 다운로드 정책은 §12 미결정) |

**주의:** 이 프로토타입은 상담사 1인의 내부 관찰 테스트용이다. §12 미결정 사항
(고객 직접 입력, 알림 채널, PDF 다운로드 허용 등)이 확정되기 전에는 외부 공개·베타 배포를 하지 않는다.
