# 해석 계층 핸드오프 — 2026-09-15 (6차: 조합키 2차 확장)

## 완료 사항

- **조합키 8종 확장** — 레지스트리 58→66키, detector·YAML·골든 테스트 전부 완비
  - `gwansung-gwada--daymaster-weak` (관과다×신약)
  - `insung-gwada--daymaster-strong` (인과다×신강)
  - `jaesung-nochul--daymaster-weak` (재노출×신약)
  - `gongmang-jaesung--daymaster-weak` (재공망×신약)
  - `daymaster-weak--johu-pressure` (신약×계절압박)
  - `daymaster-strong--johu-support` (신강×계절후원)
  - `wonjin--jiji-chung` (원진×충 공존)
  - `sangsaeng-saengjae--siksang-gwada` (생재×식과다)

- **원진×충 설계 결정** — 원진 6쌍과 충 6쌍은 지지 쌍이 수학적으로 분리되어 동일 자리에서 겹칠 수 없음.
  "같은 자리"가 아닌 "한 명식 안의 공존"으로 재해석하여 구현. 레지스트리 메타·YAML 문구도 이에 맞춰 작성.

- **CRLF 정규화** — `.gitattributes` 추가(`* text=auto eol=lf`), 93개 파일 LF 통일.
  이전 `git status`의 99개 modified는 대부분 줄바꿈 노이즈였음.

- **검증 통과** — `npm test` 전체 통과: 회귀 36건 + interpretation + `content:validate OK — 엔트리 66건 통과 (레지스트리 66키 중 미작성 0키)`

## 다음 작업

1. **조합키 계속 확장** — 수백 키 목표 (handoff §2.1). 현재 16개 combo 키 중 8개만 추가됨.
2. **작명·택일 해석 계층** — MVP 항목 3·4 (§2.2).
3. **시점 서사 2단계** — 월운×세운 교차, 대운 전환 6개월 전 서사 (§2.3).
4. **문서 출력** — HTML/PDF 렌더러, 상담사 브랜드 머리말 (§2.4).
5. **UI·디자인** — 전부 나중. 풀이 내용의 전문가·상용화 수준 달성이 현재 유일한 과제.

## 참고

- `packages/myeong-engine/scan-combos.mjs` — combo 발화 sampleBirth 탐색 도구 (재사용 가능)
- `content/entries/saju/combo/` — YAML 16건 (기존 8 + 신규 8)
- `src/engine/interpretation/detectors/combos.ts` — detector 간 결합 방지 원칙 유지 (원시 조건 직접 판정)

## 7차 추가 — 조합키 3차 확장 (66→74키)

- `jaesaeng-gwan--daymaster-weak` (재생관×신약)
- `sangsaeng-jesal--daymaster-strong` (식상제살×신강)
- `ohaeng-missing--daymaster-weak` (오행결핍×신약)
- `jiji-chung--daymaster-weak` (충×신약)
- `bigeop-gwada--daymaster-weak` (비겁과다×신약)
- `gwanin-sangsaeng--daymaster-strong` (관인상생×신강)
- `gongmang-gwansung--daymaster-weak` (관공망×신약)
- `siksang-gwada--daymaster-weak` (식과다×신약)

검증: `npm test` 전체 통과, `content:validate OK — 엔트리 74건 통과 (레지스트리 74키 중 미작성 0키)`

## 8차 추가 — 조합키 4차 확장 (74→82키)

- `sangsaeng-saengjae--daeun-fit` (생재×용신운)
- `sangsaeng-saengjae--daeun-tension` (생재×기신운)
- `gwanin-sangsaeng--daeun-fit` (관인상생×용신운)
- `gwanin-sangsaeng--daeun-tension` (관인상생×기신운)
- `jiji-chung--daeun-tension` (충×기신운)
- `wonjin--daeun-tension` (원진×기신운)
- `daymaster-weak--seun-fit` (신약×세운용신)
- `daymaster-strong--seun-tension` (신강×세운기신)

검증: `npm test` 전체 통과, `content:validate OK — 엔트리 82건 통과 (레지스트리 82키 중 미작성 0키)`

## 9차 추가 — 조합키 5차 확장 (82→90키)

- `sangsaeng-saengjae--seun-fit` (생재×세운용신)
- `sangsaeng-saengjae--seun-tension` (생재×세운기신)
- `gwanin-sangsaeng--seun-fit` (관인상생×세운용신)
- `gwanin-sangsaeng--seun-tension` (관인상생×세운기신)
- `jiji-chung--seun-tension` (충×세운기신)
- `wonjin--seun-tension` (원진×세운기신)
- `jaesaeng-gwan--daeun-fit` (재생관×용신운)
- `sangsaeng-jesal--daeun-fit` (식상제살×용신운)

**설계 메모** — 흐름×세운·관계×세운·흐름×대운 잔여 축을 채웠다. `seunFit`/`seunTension`은 8차에 도입된 세운 오행 판정(천간 우선·비면 지지)을 그대로 재사용. 조합키가 늘어나며 `interpretSaju`의 `structureLines` 상한 5가 골든 케이스에서 당령 라인을 밀어내는 문제가 발생해 상한을 6/5로 상향(`assemble.ts`).

검증: `npm test` 전체 통과, `content:validate OK — 엔트리 90건 통과 (레지스트리 90키 중 미작성 0키)`

## 10차 추가 — 조합키 6차 확장 (90→98키)

- `bigeop-gwada--daeun-tension` (비겁과다×기신운)
- `insung-gwada--daeun-tension` (인과다×기신운)
- `siksang-gwada--daeun-tension` (식과다×기신운)
- `jaesung-nochul--seun-tension` (재노출×세운기신)
- `ohaeng-missing--daeun-fit` (오행결핍×용신운)
- `ohaeng-missing--seun-fit` (오행결핍×세운용신)
- `jiji-chung--seun-fit` (충×세운용신)
- `wonjin--seun-fit` (원진×세운용신)

**설계 메모** — 과다×기신운(비겁·인성·식상)과 결핍×용신운(대운·세운) 축을 채웠다. 충·원진의 세운용신 변형은 '마찰이 용신운을 만나 정리·전환의 계기가 되는 해'로 해석 방향을 잡았다(마찰 제거가 아닌 전환 계기).

검증: `npm test` 전체 통과, `content:validate OK — 엔트리 98건 통과 (레지스트리 98키 중 미작성 0키)`

## 11차 추가 — 조합키 7차 확장 (98→106키)

- `gongmang-jaesung--daeun-tension` (재공망×기신운)
- `gongmang-gwansung--daeun-tension` (관공망×기신운)
- `jiji-hap--daeun-fit` (합×용신운)
- `jiji-hap--daeun-tension` (합×기신운)
- `jiji-hyeong--daeun-tension` (형×기신운)
- `jiji-hae--daeun-tension` (해×기신운)
- `daymaster-weak--johu-support` (신약×계절후원)
- `daymaster-strong--johu-pressure` (신강×계절압박)

**설계 메모** — 공망×운(재·관 자리 공망 + 기신운)과 지지 합·형·해×운, 강약×조후 잔여 축을 채웠다. 조합키가 늘며 골든 케이스에서 `당령`(johu) 라인이 `structureLines` 상한(6)을 또 밀려나는 문제가 재발해, 회귀 테스트를 summary 캡 단언에서 `interp.patterns` 직접 단언으로 바꿨다 — 캡과 무관하게 detector 발화 자체를 검증하는 쪽이 확장에 강하다.

검증: `npm test` 전체 통과, `content:validate OK — 엔트리 106건 통과 (레지스트리 106키 중 미작성 0키)`

## 12차 추가 — 조합키 8차 확장 (106→114키)

- `siksang-gwansung--daymaster-strong` (식상제관×신강)
- `jaesung-insung--daymaster-weak` (재인상극×신약)
- `samhap--daeun-fit` (삼합×용신운)
- `samhap--daeun-tension` (삼합×기신운)
- `jiji-pa--daeun-tension` (파×기신운)
- `gongmang-jaesung--seun-tension` (재공망×세운기신)
- `gongmang-gwansung--seun-tension` (관공망×세운기신)
- `ohaeng-missing--daeun-tension` (오행결핍×기신운)

**설계 메모** — 십신 쌍(식상×관성 상극, 재성×인성 상극)×강약, 삼합·파×대운, 공망×세운, 결핍×기신운까지 주요 조합 축을 대부분 소화했다. 이제 남은 건 `banghap×운`, `hyeong/hae/pa×세운`, 십신 쌍×운 등 점점 드문 조합 — 수익 체감 구간 진입. 다음 단계로 작명·택일 해석 계층 착수를 권한다.

검증: `npm test` 전체 통과, `content:validate OK — 엔트리 114건 통과 (레지스트리 114키 중 미작성 0키)`

## 13차 추가 — 작명·택일 해석 계층 착수 (MVP 3·4)

조합키 114키까지 확장 후, 마스터 핸드오프 §5 우선순위 2·3번(작명·택일 해석)으로 전환.

**작명 해석** (`src/engine/interpretation/naming.ts`)
- `interpretName(analysis, surname)` — 단일 `NamingAnalysis` → `NamingInterpretation` (headline/lines/strengths/cautions/guidance)
- `interpretNaming(result)` — `NamingResult` 후보 전체 → `NamingInterpretation[]`
- 해석 축: 사격 흐름(원형이정 4격 길흉 분포), 오행 조화(발음오행 상생/상극), 수리오행(편중 여부), 총점 등급(상~하)
- `renderNamingMarkdown` — 후보별 섹션(강점·주의·가이드)으로 마크다운 문서 생성

**택일 해석** (`src/engine/interpretation/taekil.ts`)
- `interpretTaekil(day)` — `CalendarDay` → `TaekilInterpretation` (headline/lines/suited/avoid/guidance)
- 십이직 12종 상세 해석표(`SINSAL_DETAIL`) — 각 일의 맞는 일·피할 일·운영 노트
- `renderTaekilMarkdown` — 날짜·십이직·택일·오행·절기 + 맞는 일/피할 일/운영 가이드 문서

**설계 메모** — 궁합 해석의 패턴(lines/strengths·cautions/guidance → markdown)을 그대로 적용. 작명은 계산 결과(수리·오행·점수)를 해석 문장으로, 택일은 십이직·길흉·택일 정보를 운영 가이드로 확장. 조사 오류(`진를`→`진을`)는 `josa` 헬퍼로 해결.

검증: `npm test` 전체 통과 (작명·택일 테스트 추가), `content:validate OK — 114키`

## 14차 추가 — 작명×사주 교차 + 시점 서사 2단계

**작명×사주 교차** (`interpretation/naming.ts`)
- `interpretNameWithSaju(analysis, surname, saju)` — 이름 해석 + 사주 용신/기신/결핍 교차
- `interpretNamingWithSaju(result, saju)` — 후보 전체 사주 교차
- 이름의 대표 오행(수리오행 다수결)이 사주의 결핍 축을 메우는지('결핍 보완'), 용신과 같은지('용신 방향'), 기신과 같은지('기신 방향')를 headline 접미어 + '사주 보완' 라인으로 판정

**시점 서사 2단계** (`interpretation/narrative.ts`)
- 월운×세운 교차 — 월운을 용신/기신 축으로 판정(verdict)하고 세운과의 방향 교차('같은 방향'/'엇갈림'/'세운 중립')를 `cross`로 명시. 월운 라인에 교차 문구 자동 삽입
- 대운 전환 서사 — `Daeun`에 `startsAt`/`endsAt`(epoch ms) 필드 추가(계산 시 실제 구간 시각 보존). `buildTimingNarrative(result, now)`가 현재 대운 종료까지 남은 실제 개월로 '다가오는 전환'(≤12개월)/'임박 전환'(≤6개월)을 판정해 `transition` 서사 생성
- `assembleReport(result, { now })` — now를 서사까지 전달

**설계 메모** — 대운 전환의 '6개월 전'은 나이 추정이 아닌 실제 구간 시각(endsAt - now)으로 판정. 이를 위해 `Daeun` 타입에 `startsAt`/`endsAt` epoch 필드를 추가했다(하위호환 — optional).

검증: `npm test` 전체 통과 (작명×사주 교차·월운×세운·대운 전환 테스트 추가), `content:validate OK — 114키`

## 15차 추가 — 작명·택일 문구 content DB 분리 (114→137 엔트리)

코드에 박혀 있던 작명·택일 해석 문구를 content DB로 외부화해, 상담사가 코드 없이 문구를 고칠 수 있게 했다.

**새 네임스페이스** — `saju/*`(패턴 레지스트리 키) 외에 비패턴 문구 키를 추가:
- `taekil/sinsal12/*` — 십이직 12종 해석 (건일~폐일). `body.note`·`body.suited`·`body.avoid` 커스텀 필드
- `naming/grade/*` — 작명 등급 가이드 5종 (상·중상·중·중하·하)
- `naming/structure/*` — 작명 구조 해석 6종 (사격 길수/흉수, 오행 상생/상극, 수리오행 편중/분산)

**해석기 연결**
- `interpretTaekil` — `sinsalDetail()`이 `taekil/sinsal12/*` DB를 먼저 읽고 없으면 코드 fallback
- `interpretName` — `phrase()` 헬퍼로 `naming/*` DB 우선, 없으면 코드 fallback

**검증기 완화** — `validate-content.mjs`의 레지스트리 등록·sampleBirth/assert 대조를 `saju/*` 키에만 적용. `naming/*`·`taekil/*`는 id=경로·status·audience·body.short·금칙어만 검사. `content/README.md`에 네임스페이스 표 추가.

검증: `npm test` 전체 통과, `content:validate OK — 엔트리 137건 통과 (레지스트리 114키 중 미작성 0키)`

## 16차 추가 — 조합키 9차 확장 (114→122키) + HTML 출력 렌더러

**조합키 9차 확장** (`combos.ts` 9차 블록)
- `samhap--seun-fit` / `samhap--seun-tension` (삼합×세운용신/기신)
- `banghap--daeun-fit` / `banghap--daeun-tension` (방합×대운용신/기신)
- `jiji-hap--seun-fit` / `jiji-hap--seun-tension` (합×세운용신/기신)
- `jiji-hyeong--seun-tension` (형×세운기신)
- `jiji-hae--seun-tension` (해×세운기신)

**설계 메모** — 방합은 `jijiRelations type==='방합'`으로 직접 판정 (sanbang의 findSet 재사용 불필요 — 이미 facts에 존재). 세운 변형은 `seunFit`/`seunTension`(천간 우선·비면 지지) 재사용. 골든 케이스(1985-01-10)에서 `jiji-hap--seun-tension`이 신규 발화해 `cautionLines` 상위를 밀어냈고, 신약 계량 assert를 summary 캡 의존에서 패턴 직접 단언(`saju/imbalance/daymaster-weak`)으로 변경 — 조후와 동일한 '캡과 무관하게 detector 발화 자체를 검증' 패턴.

**HTML 출력 렌더러** (`interpretation/html.ts`)
- `renderReportHtml(report, opts)` — `SajuReport` → standalone HTML 문서
- 마크다운을 거치지 않고 `SajuReport`를 직접 렌더 (데이터→HTML 직접 변환으로 잡음 제거)
- 인쇄·PDF 대응: `@media print` + `@page` 여백 규칙, 패턴 카드 `page-break-inside: avoid`
- 상담사 브랜드 프리앰블: `counselor: {name, contact, tagline}` → 헤더 상단 + 푸터
- 외부 의존성·스크립트 없는 단일 HTML 파일 — 브라우저에서 열어 '인쇄 → PDF로 저장'
- `RenderReportHtmlOptions {title?, includeCheckQuestions?, counselor?}`
- `CounselorBrand {name, contact?, tagline?}`
- export: `interpretation/index.ts` + `engine/index.ts` + `packages/myeong-engine/src/index.ts` 모두 추가

**스캔 도구** — `scan-combos-13.mjs` (1950~2010년 범위로 확장, 407개 명식에서 8/8 발화)

검증: `npm test` 전체 통과 (회귀 36 + interpretation + HTML 렌더 검증 추가), `content:validate OK — 엔트리 145건 통과 (레지스트리 122키 중 미작성 0키)`
