# 마스터 핸드오프 — manse_engin 전체 진행 내역 & 다음 작업 (2026-09-14)

> 세션 컨텍스트 없이 이 문서 + 코드만으로 프로젝트 전체를 이어갈 수 있게 쓴 총괄 인수인계 문서.
> 세부 로드맵: [handoff-interpretation-2026-09-14.md](handoff-interpretation-2026-09-14.md) (3~5차 기술 상세)
> 이전 문서: [handoff-interpretation-2026-09-13.md](handoff-interpretation-2026-09-13.md) (비전·제품 정의), [feedback-merged-2026-09-12.md](feedback-merged-2026-09-12.md) (엔진 결함 검토·처리 기록)

## 0. 프로젝트 한 줄 정의

한국 법정시·DST·진태양시·자시 학파를 처리하는 **순수 TypeScript 역학 계산 엔진(만세력·사주·자미·기문 등 13모듈)** 위에,
전문 상담사가 만세력 책을 펼치고 하나하나 조합하는 수준의 **풀이 문서를 엔진이 통째로 생성**하는 해석 계층을 얹은 제품.
**UI·디자인은 전부 나중 — 풀이 콘텐츠의 전문가·상용화 수준 달성이 현재 유일한 과제** (사용자 결정).

## 1. 현재 상태 요약 (2026-09-14 기준)

| 영역 | 상태 |
|------|------|
| 계산 엔진 13모듈 | ✅ 완성 — 외부 피드백 기반 결함 전량 수정·검증 (§2 참고) |
| 해석 계층 (사주) | ✅ 완성 — detector 25종 / 패턴 레지스트리 58키 / 동적 문장 / 5축 리포트 / 시점 서사 |
| 문구 DB (content) | ✅ 58/58키 커버리지 100%, 전부 `reviewed` (사람 최종 검수 전 단계까지 자동 완료) |
| 콘텐츠 파이프라인 | ✅ YAML→빌드타임 JSON 번들, sampleBirth 엔진 재실행 대조, 금칙어 린트 — `npm test`에 통합 |
| 문서 렌더러 | ✅ 사주 리포트 + 궁합 리포트 마크다운 (HTML·PDF는 미구현) |
| 해석 계층 (궁합) | ✅ 완성 — 십신 상호 인식·생극 방향·강약 대비·오행 보완·운영 가이드 |
| 해석 계층 (작명·택일) | ❌ 미착수 — 계산 엔진은 완성, 해석은 궁합과 같은 패턴으로 확장 예정 |
| UI·워크스테이션 | ❌ 의도적 미착수 — 풀이 콘텐츠 완성 후 착수 |
| 검증 | ✅ `npm test` = 스모크 + 회귀 36건 + 해석 골든 + 콘텐츠 58건. 128건 다중 샘플 스트레스(결정론성·누수·강도·궁합 문서) 통과. CJS/ESM 이중 번들 스모크 통과 |

## 2. 진행 내역 (커밋 히스토리 전체, 12커밋)

### 1단계 — 엔진 구축·정정 (`5018601` ~ `3271bf7`)

- `5018601` 리포 초기 구성: `src/engine`(canonical) + `packages/myeong-engine`(배포 패키지, build.mjs가 복사·번들) 구조
- `8579249` 한국 음력·만세력 시간·대운 계산 오류 수정
- `3271bf7` 파생 모듈 전면 정정 — 외부 피드백(A·B) 통합: 자미두수 5건(오행국·납음표·궁간·궁명 방향·자미성 기궁), 기문 `乙` 지반+절기 시각, 격국 특수격 경로, 대육임 월장·과명·삼전, 토정 전통 작괘법, 하락 괘 반전, 매화 modulo, 궁합 분모, 계약 검증 강화 등 (처리 상태표: feedback-merged §7 전부 ✅)

### 2단계 — 해석 계층 구축 (`44fe6fc` ~ `d21accb`)

- `44fe6fc` 해석 계층 1차: `SajuResult`만 소비하는 순수 함수 레이어 — detector 15종 + 조립기 `interpretSaju()`, 조합키=content DB ID 규칙 확립
- `e6c5816` 강약 계량기: `measureOhaeng()` (지장간 본기/중기/여기 가중 + 월지 ×2), detector 4종 추가 → 19종/40키, 골든값 회귀 테스트 잠금
- `d21accb` export 누락분 수정

### 3단계 — 해석 계층 3차 (`8ed30d9`)

- 동적 문장 생성기 `sentence.ts`: detector가 패턴의 **slots(자리·글자·십신)·figures(수치)**를 채우고 `renderPattern()`이 "{첫형}({제목}, 강도 {라벨}), {결론형}"을 조립. 조사 자동 부착(`josa` — Hangul 종성 판정, Hanja는 괄호 표기). 레지스트리 48키에 `conclusion`(결론형) 추가
- 축별 조립 `report.ts`: `assembleReport()` — 연애·재물·적성·건강·육친 5축 섹션(성별 옵션 선택)
- 시점 서사 `narrative.ts`: 대운·세운·월운 판정 문장 + **과거 대운 역검증 "확인 질문"** (상담사 실전 기술의 시스템화)
- detector 확장: 조후 5종(계절×일간), 원진, 대운×세운 이중 교차

### 4단계 — 콘텐츠 파이프라인·문구 전수 (`6802d25`, `dd225a0`)

- `6802d25` 파이프라인 기반: `content/entries/{module}/{category}/{pattern}.yaml` (경로=조합키), 검증기 `validate-content.mjs` (의존성 없는 YAML 부분집합 파서 — `content-db.mjs` 공유)
- `dd225a0` 4차:
  - **DB 오버라이드 연결** — build.mjs가 YAML을 빌드타임에 검증 후 JSON 번들(런타임 파일시스템 비의존), 문구 우선순위 **DB body.short > 레지스트리 conclusion > defaultText**, 패턴에 `contentId` 부착
  - 문구 47건 신규 작성 → 50키 커버리지
  - 삼합·방합 detector(생왕묘 4세트 + 계절 3지 4세트)
  - 시점 서사: 세운 십신 명시("일간 대비 정인 운(화)"), 간지 한글 읽기 조사 자연화
  - `renderReportMarkdown()` — 헤드라인→원국→오행 계량→5축→시점 서사→확인 질문 문서, DB body.long 심층 문단 삽입

### 5단계 — 검수·조합키·궁합 (`aa431d1`)

- 문구 전수 검수: 50키 short를 첫형 뒤에 자연스럽게 붙는 결론형으로 재작성, 전부 `reviewed` 승격
- **조합키** `saju/combo/*` 8종 — 두 구조 조건의 교차(생재×신약/신강, 재노출×비겁, 관인×인과다, 신약/신강×용신운/기신운). detector 간 결합 없이 원시 조건 직접 판정, 우선순위 9(패턴 목록 선두). 총 **25종 detector / 58키**
- **궁합 해석 계층** `compatibility.ts` + `renderCompatibilityMarkdown()`: 일간 십신 상호 인식(양방향이 다르다는 점이 핵심 재료), 일간 생극 방향(한글 읽기 조사), 배우자궁 합·충·형·해, 강약 대비 3유형(보완/소모/주도권), 오행 보완, 일지 원진 교차 → **strengths / frictions / guidance 분리**

## 3. 검증 검수 결과 (2026-09-14, 푸시 전 최종)

- `npm test` 전체 통과: 스모크 + 회귀 36건 + 해석 골든(interpretation.test.mjs) + 콘텐츠 58건 검증
- **스트레스 검수**: 1940~2010년 8개 연도 × 4개월 × 남녀 × 시각미상 포함 128건 — (a) 사주 리포트·궁합 문서 생성 예외 없음 (b) 동일 입력 리포트 바이트 동일(결정론성) (c) 문서에 undefined/null 누수 없음 (d) 모든 패턴 강도 0~1 범위 (e) CJS 번들 require 스모크 통과
- 골든 케이스: 1985-01-10 16:45 남 (甲子 丁丑 己酉 壬申, 비견격·용신 금, 신약 36.7%, 토 25.6%·수 32.2% 계량) — 계량·detector·동적 문장·리포트·시점 서사·조합 2종 전부 테스트로 잠김
- 워킹 트리 clean, 생성물(dist·패키지 src/engine)은 gitignore로 관리

## 4. 아키텍처 한눈에 (작업 시 필독)

```
src/engine/                      canonical 소스 (이것만 수정)
  interpretation/                해석 계층 (SajuResult만 소비, 계산 코드 미수정)
    detectors/                   25종 — flow·imbalance·relation(원진/삼합/방합)·cross·johu·timing·combos
    meter.ts                     강약 계량기 (지장간 가중 + 월지 ×2)
    registry.ts                  패턴 사전 58키 (title·defaultText·conclusion·polarity)
    content.ts                   DB 접근 (content-db.generated.json — build.mjs가 content/에서 생성)
    sentence.ts                  동적 문장 (slots/figures → 첫형 + 결론형)
    report.ts / narrative.ts     5축 리포트 / 대운×세운×월운 서사
    compatibility.ts / markdown.ts  궁합 해석 / 문서 렌더러
  index.ts                       루트 공개 API — packages/myeong-engine/src/index.ts와 항상 쌍으로 수정
packages/myeong-engine/          배포 패키지 (build.mjs: 복사 → 별칭 재작성 → content DB 번들 → esbuild ESM/CJS → tsc d.ts)
content/entries/                 문구 DB (경로=조합키, status: draft→linted→reviewed→published)
```

**작업 규칙 (실제 버그가 났던 지점들):**
1. 새 export는 루트 `src/engine/index.ts` **와** 패키지 `packages/myeong-engine/src/index.ts` 둘 다.
2. 골든 값은 코드 실행에서 읽어 테스트에 박는다 — 손계산 금지.
3. 계절·오행 키는 한자(`丑`) — 팔자 글자가 한자라서. 한글 키 조회는 조용히 빈 값.
4. 새 패턴 추가 순서: 레지스트리(키+conclusion) → detector(slots/figures) → 필요 시 sentence 첫형 → content YAML → 테스트. 첫형은 재료 부족 시 자동 fallback이라 detector만 고쳐도 동작한다.
5. esbuild 플랫폼 불일치가 나면 `npm ci`.
6. 문구 금칙어: 반드시·보장·확실·100% — 검증기가 빌드·CI를 깬다.

## 5. 작업해야할 내용 (우선순위 순)

1. **조합키 지속 확장** (콘텐츠 경쟁의 핵심) — 현재 8종 combo는 시작점. 강약×조후, 십신 과다×신살, 원진×일지, 격국×대운 등 전문가 조합을 계속 키화. 각 건 = detector 조건 + 레지스트리 + DB 문구 3벌. 목표 수백 키.
2. **작명·택일 해석 계층** — 계산 엔진 완성. 궁합과 같은 패턴(narrative → strengths/frictions/guidance → markdown)으로 확장. MVP 4권(사주✅+궁합✅+작명+택일) 완성용.
3. **시점 서사 2단계** — 월운×세운 교차 문장, 대운 경계(전환 6개월 전) 서사, 세운 십신별 행동 가이드 문구 세트.
4. **문서 산출물 확장** — 사주/궁합 마크다운 위에 HTML·PDF 출력 + 상담사 브랜드 프리앰블(이름·연락처·로고 자리). 마크다운이 단일 소스.
5. **문구 운영 사이클 가동** — 상담사 베타 피드백 → short·medium 튜닝 → `published` 승격. detector 조합 확장과 병행되면 문구가 수백~수천 규모로 성장(전문가 프로그램의 "조건-문장 쌍 + 우선순위 매칭" 구조 실현).
6. **제품·사업 (콘텐츠 완성 후)** — 워크스테이션 UI(만세력 화면·원클릭 브리핑·시간 미상 안전 모드·고객 DB), 라이선스·활성화 서버, 사전판매 검증(역학 카페·학원 100명). **사용자 결정상 UI는 마지막 단계.**

## 6. 세부 핸드오프 인덱스

| 문서 | 내용 |
|------|------|
| 본 문서 | 프로젝트 총괄 — 전체 내역·상태·규칙 |
| [handoff-interpretation-2026-09-14.md](handoff-interpretation-2026-09-14.md) | 해석 계층 3~5차 기술 상세 + 다음 단계 |
| [handoff-interpretation-2026-09-13.md](handoff-interpretation-2026-09-13.md) | 프로젝트 비전·제품 정의·사업 구조 (§0 유효) |
| [feedback-merged-2026-09-12.md](feedback-merged-2026-09-12.md) | 엔진 결함 통합 검토 + 처리 상태표 (전량 ✅) |
| [content/README.md](../content/README.md) | 문구 DB 스키마·파이프라인 규약 |
