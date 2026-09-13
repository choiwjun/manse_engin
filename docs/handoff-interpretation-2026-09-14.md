# 핸드오프 — 해석 계층 3차 완료 & 다음 단계 (2026-09-14)

> 이 문서는 `feat: 동적 문장 생성기·축별 리포트·시점 서사`(3차)의 결과와 다음 단계를 인수인계한다.
> 이전 문서: [handoff-interpretation-2026-09-13.md](handoff-interpretation-2026-09-13.md) — 비전·제품 정의(§0)는 그대로 유효.

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

1. **DB 문구 오버라이드 연결** — 조립기가 `content/entries`의 문구를 `defaultText`/`conclusion` 대신 쓰도록. 빌드 타임에 YAML→JSON 번들링(엔진은 런타임 파일시스템 비의존 유지) 또는 `status: published`만 번들. 오버라이드는 "레지스트리 키가 같으면 문구만 교체" 1줄 구조.
2. **문구 확충** — 미작성 45키(총 48키 중 3키 작성). LLM 초안(엔진 facts 바인딩) → 검수 → `reviewed`. 축별 리포트가 DB 문구를 소비하면 문장 다양성이 급증한다.
3. **detector 확장 잔여** — 삼합/방합 세분(지지 합을 육합·삼합·방합으로 구분하는 엔진 1층 작업 먼저), 종격·특수격 분기(gyeokguk 1층 판정 결과에 따른 분기), 진태양시 적용 여부 리포트 표기.
4. **리포트 내보내기** — `SajuReport`→마크다운/HTML 렌더러(상담사 브랜드 리포트의 최소 형태). 섹션 순서·제목·`timing` 서사를 문서로 뽑는 얇은 레이어.
5. **시점 서사 고도화** — 세운 십신(일간 대비) 명시, 월운×세운 교차, 대운 경계(전환 6개월 전) 서사.
6. **제품·사업** — 2차 문서 §2-6 그대로 (워크스테이션·MVP 4권·사전판매).

## 3. 작업 시 주의 (2차 문서의 교훈 + 3차 추가)

- 골든 값은 **코드에서 읽어** 테스트에 박는다. 손계산 금지.
- 계절·오행 키는 한자(`丑`) — 팔자 글자가 한자라서. 한글 키로 조회하면 조용히 빈 값.
- 새 export는 **루트 `src/engine/index.ts`와 패키지 `packages/myeong-engine/src/index.ts` 둘 다**.
- esbuild 플랫폼 불일치가 나면 `npm ci`.
- 문구를 코드에 추가할 때: 레지스트리(키+conclusion) → detector(slots/figures) → sentence 첫형(필요 시) → 테스트 순서. sentence의 첫형은 재료 부족 시 자동 fallback이므로 detector만 고쳐도 동작한다.
