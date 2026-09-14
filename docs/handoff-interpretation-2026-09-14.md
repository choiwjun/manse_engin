# 핸드오프 — 해석 계층 3차·4차·5차 완료 & 다음 단계 (2026-09-14)

> 이 문서는 해석 계층 3차(동적 문장·축별 리포트·시점 서사), 4차(DB 오버라이드·문구 전수·삼합/방합·세운 십신·문서 렌더러), 5차(문구 검수 reviewed·조합키·궁합 해석)의 결과와 다음 단계를 인수인계한다.
> 이전 문서: [handoff-interpretation-2026-09-13.md](handoff-interpretation-2026-09-13.md) — 비전·제품 정의(§0)는 그대로 유효.
> 방향 결정: UI·디자인은 전부 나중. **풀이 내용의 전문가·상용화 수준 달성이 현재 유일한 과제.**

## 0-1. 5차 완료 내역 (2026-09-14 후속)

### ① 문구 전수 검수 — 50키 전부 `reviewed`

- 모든 short를 **첫형(intro) 뒤에 자연스럽게 붙는 결론형**으로 재작성
  (예: "…36.7%로 얇아(신약, 강도 뚜렷), 기반 보강(학습·수용·휴식)이 상시 과제이며, …" —
  이전처럼 결론부가 패턴명을 반복해 문장이 어긋나는 케이스 전면 정리).
- 금칙어(반드시/보장/확실/100%) 자동 린트 통과. medium·long 유지.

### ② 조합키 확장 — `saju/combo/*` 8키 (총 detector 25종 / 58키)

- 두 구조 조건의 교차 — 전문가가 만세력에서 하나하나 조합하는 판단을 키화:
  생재×신약, 생재×신강, 재노출×비겁, 관인×인과다, 신약/신강×용신운, 신약/신강×기신운.
- `detectors/combos.ts`는 다른 detector 결과에 의존하지 않고 원시 조건(계량기 판정·십신 개수·대운 오행)을 직접 판정한다.
- 우선순위 9 — 패턴 목록 선두(가장 전문가적인 판단이 먼저 보이도록). DB 문구 8건도 reviewed.
- 축별 리포트 연결: 재물(생재 조합 2종·재노출×비겁), 적성(관인×인과다).

### ③ 궁합 해석 계층 — `interpretation/compatibility.ts` + 마크다운 렌더러

- `interpretCompatibility(a, b, compat, { nameA, nameB }) → CompatibilityInterpretation`:
  - **일간 십신 상호 인식**: A 눈에 B는 정재 / B 눈에 A는 정관 — 10십신별 관계 성향 문구. 양방향이 다르다는 점이 핵심 해석 재료.
  - 일간 오행 방향(생·극·비화, 한글 읽기로 조사 처리), 배우자궁(일지) 합·충·형·해,
    강약 대비(신강×신약 보완 / 둘 다 신약 소모 / 둘 다 신강 주도권), 오행 보완 점수 해석, 일지 원진 교차.
  - strengths / frictions / guidance 분리 — 마찰 축마다 대응하는 운영 가이드가 나온다.
- `renderCompatibilityMarkdown(compat, narrative, opts)`: 궁합 상담 문서(관계 구조 → 점수 구성 → 강점 → 주의 축 → 운영 가이드).
- 궁합은 MVP 4권 중 두 번째 해석 계층. 작명·택일이 다음 순서.

## 0. 4차 완료 내역 (2026-09-14 후속)

### ① DB 문구 오버라이드 연결 — 콘텐츠 파이프라인이 실제 풀이에 반영되기 시작

- `build.mjs` §2.5: 빌드 타임에 `content/entries` YAML 전체를 검증(스키마·금칙어) 후
  `interpretation/content-db.generated.json`으로 번들. 런타임 파일시스템 비의존 유지.
  (루트 소스에는 빈 `{}` 플레이스홀더가 커밋됨 — build.mjs가 복사 트리에서 덮어씀)
- `interpretation/content.ts`: `getContentEntry`·`conclusionFor` — 문구 우선순위는
  **DB body.short > 레지스트리 conclusion > defaultText**. 감지 패턴에 `contentId` 부착.
- YAML 파서는 `packages/myeong-engine/content-db.mjs`로 공유(build/validate 양쪽) — 외부 의존성 없음.

### ② 문구 전수 작성 — 50/50키 커버리지 100%

- 미작성 45키 + 신규 2키(삼합·방합) = 47건을 전문가 등급 초안으로 작성
  (short 한 줄 + medium 2~3문장, 핵심 패턴 8건은 long 심층 문단까지).
- 전부 `status: linted` — **사람 검수(reviewed) 전 단계**. 검수 시 수정만 하면 되고 게이트는 자동.
- sampleBirth/assert는 골든 명식(1985-01-10 16:45 남)으로 통일 — 엔진 재실행 대조 기준점.
- 패턴의 조합키 = DB 파일 경로 = 레지스트리 키 1:1 유지.

### ③ 삼합·방합 detector (`detectors/sanbang.ts`) — 총 24종 detector / 50키

- 지지 3개가 생왕묘 삼합(4세트) 또는 계절 3지 방합(4세트)을 이루면 감지.
  문장: "년지(申)·월지(子)·시지(辰)로 삼합 申子辰 수국을(를) 이루어".
- 4자리에서 삼합·방합 동시 성립은 불가(필요 지지 5개 초과) — 삼합 우선 체크.

### ④ 시점 서사 고도화 (`narrative.ts`)

- 세운에 **일간 대비 십신** 명시: "올해 병오(丙午) 세운은 일간 대비 정인 운(화), 기신 방향 — 규모 조절과…".
- 판정을 라벨('용신 방향')과 판 문장으로 분리해 이중 대시 제거. 간지 한글 읽기(병오)로 조사 자연화.

### ⑤ 풀이 문서 렌더러 (`markdown.ts`)

- `renderReportMarkdown(report, opts?) → string`: 헤드라인 → 원국 표기 → 오행 계량 →
  5축 섹션(적성→재물→연애→건강→육친) → 시점 서사 → 상담 확인 질문.
- 섹션에 `patterns`가 실려 DB body.long을 심층 문단으로 삽입 — 상담사가 그대로 읽을 수 있는 문서.
- 텍스트 뼈대만 제공(디자인은 후속 단계) — HTML/PDF는 이 문자열 위에 얹는다.

### 4차 품질·계약

- 테스트 추가 골든: DB 오버라이드 문장(contentId+body.short 반영), 삼합 금국·방합 화국 감지 문장,
  세운 십신(丙 vs 己=정인), 마크다운 섹션 헤더 전부 + DB long 삽입 + 누수 방지.
- `npm test` = smoke + 회귀 36건 + interpretation + content:validate(50건) 전부 통과.

## 1. 3차 완료 내역

### ① 동적 문장 생성기 (`interpretation/sentence.ts`) — 2차 문서의 "최대 변곡점"

- `DetectedPattern`에 **슬롯 데이터(`slots`: 자리·글자·십신·묶음)**와 **수치 재료(`figures`)**가 실렸다.
  detector는 flow·relation·cross·imbalance·timing 전반이 slots/figures를 채운다. `sipsin-groups.ts`의 `toPatternSlot()`·`posLabel()` 사용.
- `renderPattern(pattern)`: `{첫형}({짧은 제목}, 강도 {최상/뚜렷/보통/약}), {결론형}` 형태로 조립.
  - 첫형: 카테고리별 생성기 — flow는 "시지의 상관(申)이 시간의 정재(壬)를 생하여", imbalance는 "일간의 축(비겁+인성)이 36.7%로 얇아" 등.
  - 결론형: 레지스트리 전 48키에 `conclusion` 필드 추가(기존 defaultText에서 뽑아 정리).
  - 재료 부족 시 기존 `{title}: {defaultText}`로 안전하게 fallback.
- 조사 처리: `josa()` — 십신명·라벨(Hangul) 기준으로 종성 판정. Hanja 글자는 괄호 표기라 조사가 붙지 않는다.
- 골든 출력 예: `시지의 상관(申)이 시간의 정재(壬)를 생하여(식상생재, 강도 최상), 기술·표현이 실물 수입으로 정산되는 구조로, …`

### ② 축별 조립 (`interpretation/report.ts`) — 상담 문서의 목차

- `assembleReport(result, { gender? }) → SajuReport`:
  - `sections`: **연애·배우자 / 재물 / 적성·일 / 건강 / 육친** 5축. 각 축은 `{ axis, title, headline, lines[] }`.
  - 연애: 일지(배우자궁) 십신 성향 + 일지 합·충 + 배우자성(남명 재성/여명 관성, 미지정 시 생략) + 도화·홍염.
  - 재물: 재성 점유율·노출·결오행 + 식상생재/재생관/재성 공망 등 패턴.
  - 적성: 격국 설명 + 관성 vs 식상 비율 판단 + 장성·화개 교차.
  - 건강: 오행→신체 매핑(수=신장·방광·호르몬 등)으로 왕오행 과열·결오행 관리·계절 민감도.
  - 육친: 년~시 4궁 궁역 해석 + 비겁(형제)·자녀 축 점유율.
  - 성별 미지정(`gender` 옵션 생략)으로도 예외 없이 조립된다(배우자성·자녀성 문장만 생략).

### ③ 시점 서사 (`interpretation/narrative.ts`)

- `buildTimingNarrative(result) → TimingNarrative`: 현재 대운 판정(용신/기신/중립 — `judgeOhaeng`) → 세운 → 월운 → 다음 대운 전환점 → 대운×세운 결합 문장("큰 판(辛巳 대운, 용신 방향) 위에서 올해(丙午)는 역풍 구간…").
- **역검증 확인 질문**: 과거 대운을 돌며 용신 축이면 "기회 확장이 있었는지 확인", 기신 축이면 "축소·정리·건강 이슈가 있었는지 확인" 질문을 최대 3개 생성 — 상담사의 실전 기술을 시스템화. 판정은 `judgeOhaeng`과 동일 축이라 서사와 모순되지 않는다.

### ⑤ detector 확장 (19종 → 22종, 레지스트리 40키 → 48키)

- **조후 5종** (`detectors/johu.ts`): 계절(월지 왕오행)×일간 오행 관계 — season-support / season-command(당령) / season-pressure / season-control / season-drain. 카테고리 `johu` 신설.
- **원진** (`detectors/relations.ts` `detectWonjin`): `result.wonjin` facts를 소비.
- **대운×세운 이중 교차** (`detectors/timing.ts` `detectDaeunSeunCross`): 큰 판과 연 판이 모두 용신(또는 기신) 축일 때만 감지 — 드물지만 정보량이 큰 조합.

### ④ 문구 DB 콘텐츠 파이프라인 기반

- `content/entries/{module}/{category}/{pattern}.yaml` — 경로가 곧 조합키. 한글 신살명은 한글 파일명 그대로.
- 스키마: `id, title, audience(counselor|learner|public), status(draft→linted→reviewed→published), sampleBirth, assert, body{short,medium,long}, tags`. 자세한 규약은 [content/README.md](../content/README.md).
- `packages/myeong-engine/validate-content.mjs` — 의존성 없는 최소 YAML 부분집합 파서 포함. ①경로=키=레지스트리 등록 ②스키마 ③sampleBirth로 엔진 재실행해 assert 대조 ④금칙어(반드시/보장/확실/100%) 린트. **`npm test` 체인에 포함됨** (`content:validate` 스크립트로 단독 실행도 가능).
- 샘플 3건 통과: sangsaeng-saengjae(reviewed) / daeun-fit(linted) / sinsal-장성-siksang(draft, 한글 키 검증).

### 품질·계약

- `interpretation.test.mjs`에 3차 골든 값 잠김: 동적 문장 구조(첫형+제목+강도+결론), 신약 36.7% 수치 반영, 조후 당령 키, 원진 키=facts 일치, 5축 섹션 최소 문장 수, 시점 서사(辛巳=fit), buildTimingNarrative↔리포트 일치, 시각 미상 조립.
- 계약 테스트가 **renderPattern 전수 검사**로 확장: 렌더 결과에 undefined/null 누수 금지, 슬롯 있으면 위치 문구 존재.
- 공개 API 추가(루트 `src/engine/index.ts` + 패키지 `src/index.ts` 동시 반영 완료): `assembleReport`, `buildTimingNarrative`, `judgeOhaeng`, `renderPattern`, `strengthLabel`, 타입 `SajuReport/ReportSection/ReportAxis/TimingNarrative/TimingVerdict/PatternSlot/PatternFigures/AssembleReportOptions`.

## 2. 다음 단계 (우선순위 순)

1. **조합키 확장 지속** — 현재 8종의 combo는 시작점. 강약×조후, 십신 과다×신살, 원진×일지 등
   전문가 조합을 계속 키화(각각 detector 조건 + 레지스트리 + DB 문구 3벌). 목표는 수백 키 규모.
2. **작명·택일 해석 계층** — 계산 엔진은 완성. 궁합과 같은 패턴(analyze → narrative → markdown)으로 확장.
3. **시점 서사 2단계** — 월운×세운 교차, 대운 경계(전환 6개월 전) 서사, 세운 십신별 행동 가이드 문구.
4. **문서 산출물 확장** — 사주/궁합 마크다운 위에 HTML·PDF 출력, 상담사 브랜드 프리앰블(이름·연락처).
5. **문구 운영 사이클** — 상담사 베타 피드백 → short·medium 튜닝 → `published`. 조합키와 세분 키 확장이 병행될 때 문구 수가 수백~수천으로 성장한다.
6. **제품·사업** — 문구 콘텐츠가 전문가 수준에 도달한 뒤에야 화면(워크스테이션)·사전판매로 진행 (사용자 결정: 디자인은 제일 나중).

## 3. 작업 시 주의 (2차 문서의 교훈 + 3차 추가)

- 골든 값은 **코드에서 읽어** 테스트에 박는다. 손계산 금지.
- 계절·오행 키는 한자(`丑`) — 팔자 글자가 한자라서. 한글 키로 조회하면 조용히 빈 값.
- 새 export는 **루트 `src/engine/index.ts`와 패키지 `packages/myeong-engine/src/index.ts` 둘 다**.
- esbuild 플랫폼 불일치가 나면 `npm ci`.
- 문구를 코드에 추가할 때: 레지스트리(키+conclusion) → detector(slots/figures) → sentence 첫형(필요 시) → 테스트 순서. sentence의 첫형은 재료 부족 시 자동 fallback이므로 detector만 고쳐도 동작한다.
