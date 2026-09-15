# 마스터 핸드오프 — manse_engin 전체 진행 내역 & 다음 작업 (2026-09-15, 최종)

> 세션 컨텍스트 없이 이 문서 + 코드만으로 프로젝트 전체를 이어갈 수 있게 쓴 총괄 인수인계 문서.
> 이전 마스터: [handoff-master-2026-09-14.md](handoff-master-2026-09-14.md) — 이 문서가 최신이다.

## 0. 프로젝트 한 줄 정의

한국 법정시 변천·서머타임(DST)·진태양시·자시 학파를 처리하는 **순수 TypeScript 역학 계산 엔진**(13모듈) 위에,
전문 상담사가 만세력 책을 펼치고 하나하나 조합하는 수준의 **풀이 문서를 엔진이 통째로 생성**하는 해석 계층을 얹은 제품.
**UI·디자인은 전부 나중 — 풀이 콘텐츠의 전문가·상용화 수준 달성이 현재 유일한 과제** (사용자 결정).

## 1. 현재 상태 요약 (2026-09-15 기준, 커밋 `088e2a1`)

| 영역 | 상태 |
|------|------|
| 계산 엔진 13모듈 | ✅ 완성 — 외부 피드백 기반 결함 전량 수정·검증 ([feedback-merged-2026-09-12.md](feedback-merged-2026-09-12.md) §7 전량 ✅) |
| 해석 계층 (사주) | ✅ 완성 — detector 26종 / 패턴 레지스트리 **136키** / 동적 문장 / 5축 리포트 / 시점 서사 |
| 문구 DB (content) | ✅ **159건** / 레지스트리 136키 커버리지 100%, 전부 `reviewed` (사람 최종 검수 전 단계까지 자동 완료) |
| 콘텐츠 파이프라인 | ✅ YAML→빌드타임 JSON 번들, sampleBirth 엔진 재실행 대조, 금칙어 린트 — `npm test`에 통합 |
| 문서 렌더러 | ✅ 사주·궁합·작명·택일 **Markdown + standalone HTML**(인쇄→PDF, 상담사 브랜드 프리앰블) |
| 해석 계층 (궁합) | ✅ 완성 — 십신 상호 인식·생극 방향·강약 대비·오행 보완·운영 가이드 + Markdown·HTML |
| 해석 계층 (작명) | ✅ 완성 — `interpretName`/`interpretNameWithSaju`(사주 교차) + `renderNamingMarkdown`/`renderNamingHtml` |
| 해석 계층 (택일) | ✅ 완성 — `interpretTaekil` + `renderTaekilMarkdown`/`renderTaekilHtml`, 십이직 12건 content DB 분리 |
| 전문가 검수 기준 | ✅ 문서화 완료 — [expert-review-checklist-2026-09-15.md](expert-review-checklist-2026-09-15.md) + [fixtures JSON](fixtures/expert-fixtures-2026-09-15.json) |
| 승격 워크플로 | ✅ 문서화 완료 — [publish-workflow-2026-09-15.md](publish-workflow-2026-09-15.md) (reviewed→published 기준·베타 피드백 양식) |
| 실제 전문가 검수 | ❌ **미착수 — 차단** — 체크리스트·fixture 준비 완료, 검수자 섭외가 다음 행동 |
| 콘텐츠 `published` | ❌ 0건 — 전문가 검수 pass가 선행 조건 |
| UI·워크스테이션 | ❌ 의도적 미착수 — 풀이 콘텐츠 완성 후 착수. 진입 조건: 전문가 검수 pass + published 승격 + 베타 피드백 A 등급 다수 |
| 검증 | ✅ `npm test` = 스모크 + 회귀 36건 + 해석 골든 + 콘텐츠 159건. CJS/ESM 이중 번들 스모크 통과 |

## 2. 콘텐츠 현황

### 엔트리 수 (159건)

| 네임스페이스 | 건수 | 내용 |
|---|---|---|
| `saju/combo/` | 80 | 조합키 — 구조×강약·구조×운·관계×운·조후×강약 등 |
| `saju/cross/` | 19 | 신살×십신·공망×십신·격국×용신 교차 |
| `saju/flow/` | 6 | 인접 십신 흐름 (식상생재·관인상생·재생관·인성생비겁·비겁생식상·식상제살) |
| `saju/imbalance/` | 9 | 강약·과다·결핍·노출 |
| `saju/johu/` | 5 | 조후 5분기 (득령·후원·설기·압박·제절) |
| `saju/relation/` | 12 | 간합·지지합충형해·원진·삼합·방합·공망 |
| `saju/timing/` | 5 | 대운 용신·기신·중립·대운×세운 동향·동압 |
| `naming/grade/` | 5 | 작명 등급 가이드 (상·중상·중·중하·하) |
| `naming/structure/` | 6 | 작명 구조 해석 (사격·수리·오행·발음) |
| `taekil/sinsal12/` | 12 | 십이직별 note·suited·avoid |

### 검수 기록

| 라운드 | 대상 | 결과 | 파일 |
|---|---|---|---|
| r1 | 기존 145건 전수 | pass 139 / revise 6 / reject 0 | `content/reviews/20260915-r1.md` + `20260915-ledger.md` |
| r2 | 10차·cross·flow 확장 + 작명 교차 | 신규 YAML pass 10 / 작명 교차 revise 후 반영 | `content/reviews/20260915-r2.md` |
| r3 | 11차 조후×강약 4건 + HTML 렌더러 | pass 4 / revise 0 | `content/reviews/20260915-r3.md` |

검수자는 모두 코드 기반 페르소나(research-analyst subagent). **실제 역학 전문가 대조 검수는 아직 미착수** — 상용화 전 필수.

## 3. 진행 내역 (커밋 히스토리 전체, 30커밋)

### 1단계 — 엔진 구축·정정 (`5018601` ~ `3271bf7`)

- `5018601` 리포 초기 구성: `src/engine`(canonical) + `packages/myeong-engine`(배포 패키지, build.mjs가 복사·번들) 구조
- `8579249` 한국 음력·만세력 시간·대운 계산 오류 수정
- `3271bf7` 파생 모듈 전면 정정 — 외부 피드백(A·B) 통합: 자미두수 5건, 기문 `乙` 지반+절기 시각, 격국 특수격 경로, 대육임 월장·과명·삼전, 토정 전통 작괘법, 하락 괘 반전, 매화 modulo, 궁합 분모, 계약 검증 강화 등

### 2단계 — 해석 계층 구축 (`44fe6fc` ~ `d21accb`)

- `44fe6fc` 해석 계층 1차: `SajuResult`만 소비하는 순수 함수 레이어 — detector 15종 + 조립기 `interpretSaju()`, 조합키=content DB ID 규칙 확립
- `e6c5816` 강약 계량기: `measureOhaeng()` (지장간 본기/중기/여기 가중 + 월지 ×2), detector 4종 추가 → 19종/40키
- `d21accb` export 누락분 수정

### 3단계 — 해석 계층 3차 (`8ed30d9`)

- 동적 문장 생성기 `sentence.ts`: detector가 패턴의 **slots(자리·글자·십신)·figures(수치)**를 채우고 `renderPattern()`이 "{첫형}({제목}, 강도 {라벨}), {결론형}"을 조립. 조사 자동 부착(`josa`)
- 축별 조립 `report.ts`: `assembleReport()` — 연애·재물·적성·건강·육친 5축 섹션
- 시점 서사 `narrative.ts`: 대운·세운·월운 판정 문장 + **과거 대운 역검증 "확인 질문"**
- detector 확장: 조후 5종(계절×일간), 원진, 대운×세운 이중 교차

### 4단계 — 콘텐츠 파이프라인·문구 전수 (`6802d25`, `dd225a0`)

- `6802d25` 파이프라인 기반: `content/entries/{module}/{category}/{pattern}.yaml` (경로=조합키), 검증기 `validate-content.mjs`
- `dd225a0` 4차:
  - **DB 오버라이드 연결** — build.mjs가 YAML을 빌드타임에 검증 후 JSON 번들, 문구 우선순위 **DB body.short > 레지스트리 conclusion > defaultText**, 패턴에 `contentId` 부착
  - 문구 47건 신규 작성 → 50키 커버리지
  - 삼합·방합 detector(생왕묘 4세트 + 계절 3지 4세트)
  - 시점 서사: 세운 십신 명시, 간지 한글 읽기 조사 자연화
  - `renderReportMarkdown()` — 헤드라인→원국→오행 계량→5축→시점 서사→확인 질문 문서

### 5단계 — 검수·조합키·궁합 (`aa431d1`)

- 문구 전수 검수: 50키 short를 첫형 뒤에 자연스럽게 붙는 결론형으로 재작성, 전부 `reviewed` 승격
- **조합키** `saju/combo/*` 8종 — 두 구조 조건의 교차. detector 간 결합 없이 원시 조건 직접 판정, 우선순위 9. 총 **25종 detector / 58키**
- **궁합 해석 계층** `compatibility.ts` + `renderCompatibilityMarkdown()`: 일간 십신 상호 인식, 생극 방향, 배우자궁 합·충·형·해, 강약 대비, 오행 보완 → strengths/frictions/guidance 분리

### 6단계 — 조합키 대량 확장 (`9282c86` ~ `bd11163`, 6~12차)

- 6차(`9282c86`): 관과다×신약·인과다×신강·재노출×신약·재공망×신약·신약×계절압박·신강×계절후원·원진×충·생재×식과다 → 66키
- 7차(`888b344`): 재생관×신약·식상제살×신강·오행결핍×신약·충×신약·비겁과다×신약·관인상생×신강·관공망×신약·식과다×신약 → 74키
- 8차(`763dbcc`): 생재×용신운·생재×기신운·관인상생×용신운·관인상생×기신운·충×기신운·원진×기신운·신약×세운용신·신강×세운기신 → 82키
- 9차(`33fee1f`): 생재·관인상생×세운용신/기신, 충·원진×세운기신, 재생관·식상제살×용신운 → 90키
- 10차(`cecfb18`): 비겁·인성·식상 과다×기신운, 재노출×세운기신, 오행결핍×용신·세운용신, 충·원진×세운용신 → 98키
- 11차(`d41047d`): 재·관공망×기신운, 합·형·해×대운, 신약×계절후원, 신강×계절압박 → 106키
- 12차(`bd11163`): 식상제관×신강, 재인상극×신약, 삼합×용신·기신운, 파×기신운, 재·관공망×세운기신, 오행결핍×기신운 → 114키

### 7단계 — 작명·택일 해석 + 시점 서사 2단계 (`4ab0405` ~ `5cf7611`)

- `4ab0405` 13차: 작명 해석 계층 착수 — `interpretName`/`interpretNaming` (수리81·발음오행·자원오행 → lines/strengths/cautions/guidance), `interpretTaekil` (십이직·길흉·택일 → lines/suited/avoid/guidance), `renderNamingMarkdown`/`renderTaekilMarkdown`
- `852113a` 14차: `interpretNameWithSaju` — 사주 결핍·용신·기신과 이름 오행 교차, 시점 서사 2단계(월운×세운 교차, 대운 전환 6개월 전 서사, 세운 십신별 행동 가이드)
- `5cf7611` 15차: 작명·택일 문구 content DB 분리 — `naming/grade/*` 5건 + `naming/structure/*` 6건 + `taekil/sinsal12/*` 12건 → 137건

### 8단계 — 품질·안전성·HTML (`5e0d7b2` ~ `1a310ef`)

- `5e0d7b2` 상세 사주 풀이 리포트 출력 — 전체 구조 해설(모든 패턴 상세), DB body.long 심층 문단
- `440ba39` QA — 특수격 cross 누락·연살 키 불일치·시각미상 시주 언급·명식별 맥락 문장
- `2ca27e0` 풀이 품질 1순위 — 템플릿 변수 치환(`{dayGan}` 등), 연애/건강 맥락 보강, 대운 전체 흐름 서사
- `46d9f5d` 9차 조합키 확장(122키) + `renderReportHtml` — standalone HTML(인쇄→PDF), 상담사 브랜드 프리앰블
- `dfaf1b6` 핸드오프 16차
- `1a310ef` 상담 안전성 감사 — 건강·재정·관계·진로·시기·택일 문구를 참고 신호·조건 확인 중심으로 전면 완화, 금칙어 린트 강화

### 9단계 — 전수 검수·대규모 확장 (`d900dc8`)

- 기존 145건 전수 검수: pass 139 / revise 6 / reject 0 — `content/reviews/20260915-r1.md` + `20260915-ledger.md`
- 10차 구조×강약 반대축 4건 (관인상생×신약·식상제살×신약·재생관×신강·지지충×신강)
- 신살×십신 cross 4건 (장성+비겁·장성+재성·화개+재성·역마+관성)
- 인접 십신 flow 2건 (인성생비겁·비겁생식상) — `detectAdjacentFlow()` 제네릭 헬퍼
- 작명×사주 안전성 보강 — "메웁니다/돕습니다" 등 인과 단정 표현 제거
- 확장 검수: `content/reviews/20260915-r2.md` → **155건·132키**

### 10단계 — 전문가 검수 준비·HTML 확장·조후×강약 (`088e2a1`, 19차)

- **전문가 검수 기준**: `docs/expert-review-checklist-2026-09-15.md` — 검수 범위·13개 fixture·판정 기준·기록 형식·서명부
- **fixture JSON**: `docs/fixtures/expert-fixtures-2026-09-15.json` — 13개 대표 명식의 엔진 출력(팔자·격국·용신·기신·십신·신살·패턴) 고정, 전문가 수기 대조란 `expertFill` 포함
- **HTML 렌더러 확장**: `renderCompatibilityHtml`·`renderNamingHtml`·`renderTaekilHtml` — 사주와 같은 standalone 구조
- **11차 조합 확장**: `johuRelation`을 `johuFull` 5분기로 확장, 조후 잔여 축×강약 4건 (득령×신강·득령×신약·설기×신약·제절×신약) → **159건·136키**
- **승격 워크플로**: `docs/publish-workflow-2026-09-15.md` — reviewed→published 기준·상담사 베타 피드백 양식
- **문서 정합성**: `content/README.md` 오버라이드 연결 완료 표기, 핸드오프 수치 갱신
- 검수 기록: `content/reviews/20260915-r3.md` (신규 4건 pass)

## 4. 아키텍처 한눈에 (작업 시 필독)

```
src/engine/                      canonical 소스 (이것만 수정)
  core/                          만세력 코어 — 음양력·절기·역사 시각·대운
  saju/                          사주 계산 — 팔자·십신·격국·용신·대운·세운
  compatibility/                 궁합 계산
  naming/                        작명 계산 — 수리81·발음오행·자원오행
  calendar/                      달력 — 일진·십이직·길흉·택일
  ziwei/ qimen/ daeyukim/ ...    자미두수·기문·대육임·구성·하락·홍연·매화·토정·대정
  adapter/                       학파 해석기·시각 보정
  contracts/                     입력 계약·검증
  interpretation/                해석 계층 (SajuResult만 소비, 계산 코드 미수정)
    detectors/                   26종 — flow·imbalance·relation·cross·johu·timing·combos
      combos.ts                  조합 detector (1330줄 — 80개 combo 키의 원시 판정)
      crossings.ts               신살×십신·공망×십신·격국×용신 교차
      flow.ts                    인접 십신 흐름 (detectAdjacentFlow 제네릭)
      imbalance.ts               강약·과다·결핍·노출
      johu.ts                    조후 5분기
      relations.ts               간합·지지관계·원진
      sanbang.ts                 삼합·방합
      strength.ts                신강·신약·오행 편중·결오행
      timing.ts                  대운 용신·기신·대운×세운
    meter.ts                     강약 계량기 (지장간 가중 + 월지 ×2)
    registry.ts                  패턴 사전 136키 (title·defaultText·conclusion·polarity)
    content.ts                   DB 접근 (content-db.generated.json — build.mjs가 content/에서 생성)
    sentence.ts                  동적 문장 (slots/figures → 첫형 + 결론형)
    report.ts / narrative.ts     5축 리포트 / 대운×세운×월운 서사
    compatibility.ts             궁합 해석
    naming.ts                    작명 해석 (interpretName·interpretNameWithSaju)
    taekil.ts                    택일 해석 (interpretTaekil)
    markdown.ts                  문서 렌더러 (사주·궁합·작명·택일 마크다운)
    html.ts                      문서 렌더러 (사주·궁합·작명·택일 standalone HTML)
  index.ts                       루트 공개 API — packages/myeong-engine/src/index.ts와 항상 쌍으로 수정
packages/myeong-engine/          배포 패키지 (build.mjs: 복사 → 별칭 재작성 → content DB 번들 → esbuild ESM/CJS → tsc d.ts)
  interpretation.test.mjs        해석 골든·회귀 테스트
  regression.test.mjs            경계값 회귀 36건
  smoke.test.mjs                 스모크
  validate-content.mjs           콘텐츠 validator (id↔경로·enum·sampleBirth 대조·금칙어)
  scan-combos*.mjs               조합 발견 스캔 도구 (brute-force)
content/entries/                 문구 DB (경로=조합키, status: draft→linted→reviewed→published)
content/reviews/                 검수 기록 (r1·r2·r3 + ledger + README)
docs/                            핸드오프·피드백·검수 기준·승격 워크플로
  fixtures/                      전문가 대조용 명식 JSON
```

**작업 규칙 (실제 버그가 났던 지점들):**
1. 새 export는 루트 `src/engine/index.ts` **와** 패키지 `packages/myeong-engine/src/index.ts` 둘 다.
2. 골든 값은 코드 실행에서 읽어 테스트에 박는다 — 손계산 금지.
3. 계절·오행 키는 한자(`丑`) — 팔자 글자가 한자라서. 한글 키 조회는 조용히 빈 값.
4. 새 패턴 추가 순서: 레지스트리(키+conclusion) → detector(slots/figures) → 필요 시 sentence 첫형 → content YAML → 테스트. 첫형은 재료 부족 시 자동 fallback이라 detector만 고쳐도 동작한다.
5. esbuild 플랫폼 불일치가 나면 `npm ci`.
6. 문구 금칙어: 반드시·보장·확실·100% — 검증기가 빌드·CI를 깬다.
7. 신규 조합은 `scan → detector → registry → YAML → golden test` 순서로 추가한다 (TDD).
8. registry에 없는 detector 키는 `runDetectors`에서 버려지므로 detector·registry·YAML·테스트를 함께 갱신해야 한다.
9. 최소 YAML 파서는 중첩 list of maps를 지원하지 않으므로 검수 메타데이터는 `content/reviews/` 외부 기록으로 관리한다.
10. 작명 교차 문구는 이름이 결과를 직접 만든다는 인과 표현("부를 때마다", "효과", "메웁니다", "돕습니다")을 금지한다.

## 5. 다음 작업 (우선순위 순)

### 즉시 가능 (코드)

1. **조합키 지속 확장** — 현재 136키. 남은 후보: 십신 과다×신살, 원진×일지, 격국×대운, 신살×대운·세운, 조후×대운·세운. `scan-combos*.mjs`로 발화 명식 탐색 → detector·registry·YAML·테스트.
2. **시점 서사 2단계 잔여** — 월운×세운 교차 문장 일부 구현됨. 대운 경계(전환 6개월 전) 서사, 세운 십신별 행동 가이드 문구 세트 보강.
3. **`body.long` 확대** — 현재 `body.long`이 있는 엔트리가 소수. 장문 상담 리포트의 깊이를 위해 combo·cross·flow 중심으로 보강.
4. **작명·택일 심화** — 후보 비교 근거·순위, 수리·발음·자원오행 근거 노출, 학파별 정책, 택일 장문 리포트.

### 외부 인력 필요 (차단)

5. **실제 역학 전문가 대조 검수** — `docs/expert-review-checklist-2026-09-15.md` + `docs/fixtures/expert-fixtures-2026-09-15.json` 준비 완료. 검수자 섭외 → 대조 → `content/reviews/{date}-expert.md` 기록.
6. **상담사 베타 피드백** — `docs/publish-workflow-2026-09-15.md` §4 양식 준비 완료. 베타 상담사 모집 → 피드백 수집 → 문구 튜닝.
7. **`published` 승격** — 전문가 검수 pass + 검수 기록 + 안전성 문구 + validator 통과 후 `docs/publish-workflow-2026-09-15.md` 절차로 진행.

### 콘텐츠 완성 후 (의도적 후순위)

8. **워크스테이션 UI** — 만세력 화면·원클릭 브리핑·시간 미상 안전 모드·고객 DB·다인 비교·상담사 브랜드 리포트. **진입 조건: 전문가 검수 pass + published 승격 + 베타 피드백 A 등급 다수.**
9. **사업 검증** — 라이선스·활성화 서버, 사전판매(역학 카페·학원 100명), MVP 4권(사주+궁합+작명+택일) 패키징.

## 6. 검증 검수 결과 (2026-09-15, 커밋 `088e2a1`)

- `npm test` 전체 통과: 스모크 + 회귀 36건 + 해석 골든(interpretation.test.mjs) + 콘텐츠 159건 검증
- `content:validate OK — 엔트리 159건 통과 (레지스트리 136키 중 미작성 0키)`
- `git diff --check` 통과
- 신규 HTML 렌더러(궁합·작명·택일) 테스트 통과 — `<!DOCTYPE html>`·`lang="ko"`·섹션·브랜드·누수 검사
- 11차 조후×강약 combo 4건 detector·registry·YAML·골든 테스트 완비
- 워킹 트리 clean, 생성물(dist·패키지 src/engine)은 gitignore로 관리

## 7. 잔여 리스크 및 제한사항

- 명리 학파별 자녀 배속·강약·용신 기준, 절입·자시·시각 보정·윤달 경계는 외부 기준과 독립 대조가 더 필요하다.
- 규칙 기반 해석은 상담사의 문진·내담자 상황·현실 자료를 대체하지 않는다. 건강·재정·관계 결정은 의료·재무·법률 전문가 및 당사자의 판단을 우선한다.
- 현재 산출물은 전문가 검수 전 상담 초안 엔진이며, `reviewed` 표기만으로 상용 상담 전달을 승인하지 않는다.
- 2050년까지의 음양력 대조는 데이터 생성에 사용한 동일 라이브러리와의 일치 검사이며, 전체 절기 연도의 독립 천문 검증은 아니다. 외부 KASI 절기 시각 fixture는 2024년 24개뿐이다.
- 74,144일 전수 테스트는 ESM 빌드에만 걸려 있다 (CJS는 경계 테스트만).

## 8. 세부 핸드오프 인덱스

| 문서 | 내용 |
|------|------|
| 본 문서 | 프로젝트 총괄 — 전체 내역·상태·규칙·다음 작업 |
| [handoff-interpretation-2026-09-15.md](handoff-interpretation-2026-09-15.md) | 해석 계층 6~19차 기술 상세 |
| [handoff-interpretation-2026-09-14.md](handoff-interpretation-2026-09-14.md) | 해석 계층 3~5차 기술 상세 |
| [handoff-interpretation-2026-09-13.md](handoff-interpretation-2026-09-13.md) | 프로젝트 비전·제품 정의·사업 구조 (§0 유효) |
| [handoff-master-2026-09-14.md](handoff-master-2026-09-14.md) | 이전 마스터 핸드오프 (2026-09-14 기준) |
| [feedback-merged-2026-09-12.md](feedback-merged-2026-09-12.md) | 엔진 결함 통합 검토 + 처리 상태표 (전량 ✅) |
| [expert-review-checklist-2026-09-15.md](expert-review-checklist-2026-09-15.md) | 실제 역학 전문가 검수 기준·fixture·기록 형식 |
| [publish-workflow-2026-09-15.md](publish-workflow-2026-09-15.md) | reviewed→published 승격 기준·베타 피드백 양식 |
| [content/README.md](../content/README.md) | 문구 DB 스키마·파이프라인 규약 |
| [content/reviews/README.md](../content/reviews/README.md) | 검수 기록 규칙·페르소나 등록부·라운드 색인 |
