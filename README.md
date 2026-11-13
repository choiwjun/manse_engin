# MYEONG 만세력 엔진 · 사주풀이 엔진 · 역학 모듈

출생 정보를 받아 **사주 명식을 계산하는 만세력 엔진**, 그 명식에서 구조를 찾아 **풀이 리포트로 조립하는 사주풀이 엔진**,
그리고 같은 만세력 위에서 동작하는 **역학 모듈 12종**(궁합·토정비결·작명·택일·자미두수·기문둔갑·대육임·구성·홍연·매화역수·하락리수·대정수)입니다.
`manse_engin` 저장소에서 엔진만 분리한 브랜치입니다. 상담 플랫폼·워크스페이스 앱은 포함하지 않습니다.

- 순수 TypeScript입니다. 런타임 의존성이 없고 Node.js 18 이상과 브라우저(WebView)에서 동작합니다.
- 엔진 `0.5.0` · 계약 `2.0.0` · 데이터 `2026.10.06`
- 지원 범위: 양력 **1908-04-01 ~ 2101-12-31** 출생. 대한제국 표준시가 시작된 1908-04-01부터 지원합니다.

```
 출생 정보 (양력·음력, 시각, 성별)
        │
        ▼
 ┌─ 만세력 엔진 ─────────────────────────────────────────────┐
 │ 한국 법정시·서머타임 → 절기·음양력 → 연·월·일·시 4주 간지    │
 │ → 십신·지장간·12운성·신살·합충 → 격국·용신·강약·대운          │
 └───────────────────────────────────────────────────────────┘
        │  SajuResult
        ▼
 ┌─ 사주풀이 엔진 ───────────────────────────────────────────┐
 │ 오행 계량기 → 감지기(detector) 25개 → 패턴 137종             │
 │ → 동적 문장·문구 DB → 5개 축 리포트·시점 서사                 │
 └───────────────────────────────────────────────────────────┘
        │
        ▼
 Markdown / HTML 풀이 리포트

 ┌─ 역학 모듈 (만세력 엔진의 간지·절기·음양력·법정시를 공유) ─────┐
 │ 궁합 · 토정비결 · 작명 · 택일(만세력 달력)   → 풀이·리포트 포함 │
 │ 자미두수 · 기문둔갑 · 대육임                → 판 계산 (+기문·육임 해석) │
 │ 구성 · 홍연 · 매화역수 · 하락리수 · 대정수   → 계산 + 해석 문구  │
 └───────────────────────────────────────────────────────────┘
```

---

## 빠른 시작

```bash
npm ci --prefix packages/myeong-engine   # 빌드·테스트 도구 설치
npm run build                            # dist/ (ESM·CJS·타입 선언) 생성
npm test                                 # 스모크·회귀·풀이·문구 DB 검증
npm run pack                             # 배포용 tarball 생성
```

```js
import {
  buildSajuResult, interpretSaju, assembleReport,
  renderReportMarkdown, renderReportHtml, applyPractitionerOverride,
} from 'myeong-manseryeok-engine';

const birth = {
  isLunar: false, year: 1985, month: 1, day: 10,
  hour: 16, minute: 45, gender: 'male', birthPlace: null,
};
const now = new Date('2026-09-13T12:00:00+09:00');

// 만세력 엔진 — 명식 계산
const saju = buildSajuResult(birth, { now });
saju.palja;                     // 甲子 丁丑 己酉 壬申
saju.gyeokguk.name;             // '비견격'
saju.yongsin.ohaeng;            // '목'
saju.strengthAssessment.label;  // '중화신강'

// 사주풀이 엔진 — 패턴 요약과 리포트
interpretSaju(saju).summary.headline;
// '비견격 · 일간 신약(身弱) 36.7% · 용신 목 — 비견격에서 록겁용관(祿劫用官)의 원리로 …'
const report = assembleReport(saju, { gender: 'male', now });
const markdown = renderReportMarkdown(report);
const html = renderReportHtml(report, { counselor: { name: '명 상담실' } });

// 역술인이 다른 학파의 용신을 택하면 그 판단이 풀이 전체에 반영된다
const johu = applyPractitionerOverride(saju, { yongsinSchool: 'johu', note: '조후 우선' });
johu.yongsin.ohaeng;            // '화'
```

실행 가능한 예시는 두 개입니다(`npm run build` 후 실행).
- [`examples/usage.mjs`](examples/usage.mjs): 만세력·사주풀이
- [`examples/modules.mjs`](examples/modules.mjs): 역학 모듈 12종

리포트 전체 예시는 [`examples/report-1985-01-10.md`](examples/report-1985-01-10.md)에 있습니다.

---

## 1. 만세력 엔진

출생 시각을 한국 법정시 기준으로 해석하고, 절기와 음양력 데이터로 사주 4주를 세운 뒤, 명리 분석 값을 계산합니다.

### 구성

| 경로 | 역할 |
|---|---|
| `src/engine/core/korean-legal-time.ts` | 한국 법정시 변천과 서머타임 규칙. 시계 시각을 표준시·UTC로 해석 |
| `src/engine/core/solar-terms.ts` | 24절기 시각 조회 (1899~2102, 초 단위, 한국시 UTC+9) |
| `src/engine/core/lunar-solar.ts` | 양력↔음력 변환, 윤달 처리 (1899~2101) |
| `src/engine/core/ganji.ts` | 연·월·일·시 간지 계산. 연은 입춘, 월은 절입 시각 기준 |
| `src/engine/core/normalized-context.ts` | 입력을 법정시·표준시·진태양시·자시 학파 기준으로 정규화 |
| `src/engine/core/manseryeok-engine.ts` | 위 계산을 묶은 만세력 엔진 진입점 (`ManseryeokEngine`) |
| `src/engine/core/data/*.json` | 절기·음양력 데이터 (생성 근거: [`core/data/README.md`](src/engine/core/data/README.md)) |
| `src/engine/adapter/` | 진태양시 보정(경도+균시차), 야자시·조자시 분기, 한자↔오행 매핑, 받침 조사 처리 |
| `src/engine/saju/calculator.ts` | 사주팔자 계산 (`calculatePalja`) |
| `src/engine/saju/sipsin.ts` | 십신, 지장간(본기·중기·여기), 12운성 |
| `src/engine/saju/sinsal.ts` | 12신살, 지지 관계(합·충·형·파·해·삼합·방합), 공망, 납음오행 |
| `src/engine/saju/wonjin.ts` | 원진(怨嗔) 6쌍 판별 |
| `src/engine/saju/gyeokguk.ts` | 격국 판별 (정격·화격·종격, 신뢰도·근거·후보) |
| `src/engine/saju/yongsin.ts` | 용신·기신 4학파 판별, 점수제 강약 |
| `src/engine/saju/daeun.ts` | 대운(순역·대운수)·세운·월운 |
| `src/engine/saju/result-builder.ts` | 전체 계산을 `SajuResult`로 조립 (`buildSajuResult`), 역술인 판정 반영 |
| `src/engine/calendar/` | 만세력 달력. 날짜별 일진·음력·절기·십이직 (택일의 기반) |
| `src/engine/contracts/` | 실행 계약 봉투. 13개 모듈 공통의 입력 검증, 오류 코드, 버전, 입력 해시, 경고 |

### 구현된 기능

**시각 처리**
- **한국 법정시 변천**
  - 표준자오선 변경을 모두 반영합니다: 1908년 127.5°E, 1912년 135°E, 1954년 127.5°E, 1961년 135°E.
  - 서머타임 기간(1948~1951, 1955~1960, 1987~1988)을 반영합니다.
- **실재하지 않거나 겹치는 시각은 오류로 알립니다.**
  - 서머타임 시작으로 건너뛴 시각은 `NonexistentCivilTimeError`를 냅니다.
  - 서머타임 종료로 두 번 지나간 시각은 `AmbiguousCivilTimeError`를 냅니다.
- **진태양시** (선택): 출생지 경도와 균시차로 보정합니다.
- **자시 학파**: 야자시(23시대는 당일 일주)와 조자시(23시대는 다음 날 일주)를 고를 수 있습니다.
- **시각을 모를 때**: 시주를 비우고 정오를 대표 시각으로 씁니다. 결과에는 경고가 함께 붙습니다.

**역법 데이터**
- **24절기**: 1899~2102년, 초 단위 시각입니다. 연주는 입춘, 월주는 절입 순간을 경계로 바뀝니다.
- **음양력** (1899~2101년, 윤달 포함)
  - 2050년까지는 한국천문연구원(KASI) 기준표를 씁니다.
  - 2051년 이후는 천문 계산값입니다. 삭 시각은 NASA 표와 대조했습니다.
- **음력 생일 입력**: 윤달 여부까지 받아 양력으로 바꾼 뒤 계산합니다.

**명리 계산**
- **기본 값**: 사주팔자(4주 8자), 십신, 지장간 십신, 12운성
- **지지 관계와 신살**
  - 지지 관계: 육합·충·형·파·해·삼합·방합. 삼합·방합·삼형에서 같은 지지가 두 자리에 있으면 두 자리를 모두 기록합니다.
  - 그 밖에 원진, 공망, 납음오행, 12신살(일지 기준)을 계산합니다.
- **격국**
  - 정격: 정관·편관·정인·편인·식신·상관·정재·편재·비견·겁재·건록·양인격
  - 화격 5종: 갑기합화토·을경합화금·병신합화수·정임합화목·무계합화화
  - 종격 4종: 종강·종아·종재·종살
  - 판정마다 신뢰도(`확정`·`유력`·`참고`), 근거, 불성립 요소, 차순위 후보를 함께 줍니다.
  - 참고 수준인 특수격은 대표 격국으로 세우지 않고 후보로만 둡니다.
- **용신·기신 4학파**: 격국(자평진전 원칙, 예: 록겁격은 관성)·조후(궁통보감)·강약(旺相休囚死)·물상. 학파마다 따로 계산하고, 하나를 골라 대표로 씁니다(`subSchool`).
- **점수제 강약 6단계**
  - 단계: 태강·신강·중화신강·중화신약·신약·태약
  - 득령·득지·득시·득세 여부와 견제 압력을 함께 줍니다.
- **운**
  - 대운 8개: 성별·연간 음양에 따라 순행·역행하고, 절입까지의 거리로 대운수를 정합니다.
  - 세운·월운: 입춘·절입 기준입니다.
- **역술인 판정 반영** (`applyPractitionerOverride`)
  - 바꿀 수 있는 것: 용신 학파, 용신·기신 오행, 격국
  - 바뀐 판정은 운 판정과 리포트 문장에 일관되게 이어집니다.

**부가 기능**
- **만세력 달력** (`getCalendarDay`, `getMonthlyCalendar`): 날짜별 일진·음력·절기·십이직·길흉을 보여 줍니다.
- **실행 계약 봉투** (`executeEngineModule(모듈 ID, 입력)`, 13개 모듈 공통)
  - 입력을 검증하고, 오류를 코드로 정리해 줍니다.
  - 엔진·계약·데이터 버전과 입력 해시를 결과에 붙여, 결과를 재현할 수 있게 합니다.

---

## 2. 사주풀이 엔진

만세력 엔진의 `SajuResult`를 받아, 명식 안의 구조(흐름·과다·관계·교차·조합·시점)를 감지하고 풀이 문장과 리포트로 조립합니다. 아래 4개 층으로 나뉩니다.

```
1층 계산      SajuResult (만세력 엔진)
2층 감지      detector 25개 → 감지된 패턴 (위치·글자·강도 포함)
3층 레지스트리 패턴 137종 — 분류·극성·우선순위 + 문구 DB(YAML 137건)
4층 조립      interpretSaju(요약) · assembleReport(5개 축 리포트 + 시점 서사)
렌더          renderReportMarkdown · renderReportHtml
```

### 구성

| 경로 | 역할 |
|---|---|
| `src/engine/interpretation/meter.ts` | 오행 계량기. 지장간 가중(본기·중기·여기)과 월지 2배로 오행 점유율·일간 세력을 계산 |
| `src/engine/interpretation/detectors/` | 감지기 25개. 흐름(`flow`)·과다(`imbalance`)·강약(`strength`)·관계(`relations`)·삼합방합(`sanbang`)·교차(`crossings`)·조후(`johu`)·시점(`timing`)·조합(`combos`) |
| `src/engine/interpretation/registry.ts` | 패턴 레지스트리 137키. 제목·분류·극성·우선순위 |
| `src/engine/interpretation/sentence.ts` | 동적 문장 생성기. 위치·글자·강도를 반영하고 받침에 맞는 조사를 붙임 |
| `src/engine/interpretation/content.ts` | 문구 DB 조회 (`content/entries/saju/**/*.yaml`을 빌드 때 JSON으로 묶음) |
| `src/engine/interpretation/assemble.ts` | 패턴 정렬·요약 (`interpretSaju`, `runDetectors`) |
| `src/engine/interpretation/report.ts` | 5개 축 리포트 조립 (`assembleReport`) |
| `src/engine/interpretation/narrative.ts` | 시점 서사. 대운·세운·월운을 천간·지지 두 축으로 판정 (`buildTimingNarrative`, `judgeGanJi`) |
| `src/engine/interpretation/markdown.ts`, `html.ts` | 리포트 렌더러 (Markdown, 인쇄·PDF용 standalone HTML) |
| `content/entries/saju/` | 패턴별 풀이 문구 137건 (short·medium·long, 검증용 샘플 명식 포함) |

### 패턴 137종

| 분류 | 수 | 예시 |
|---|---:|---|
| 흐름 `flow` | 6 | 식상생재, 관인상생, 재생관, 식상제살, 인성생비겁, 비겁생식상 |
| 과다·강약 `imbalance` | 9 | 신강, 신약, 오행 편중, 결오행, 인성 과다, 비겁 편중, 재성 노출, 식상 과다, 관성 과다 |
| 관계 `relation` | 12 | 천간합 5종(갑기·을경·병신·정임·무계), 지지 합·충·형·해, 원진, 삼합, 방합 |
| 교차 `cross` | 19 | 십신별 공망 5종, 격국·용신 동심/이축, 신살(장성·화개·도화·역마)×십신 |
| 조후 `johu` | 5 | 계절 후원, 당령 일간, 계절 압박, 계절 제어, 계절 배출 |
| 시점 `timing` | 6 | 용신·기신·중립·혼재 대운, 대운·세운 동향, 대운·세운 동압 |
| 조합 `combo` | 80 | 생재×신약, 관인×인과다, 신강×기신운, 재공망×신약 등 두 구조 조건의 교차 |

극성은 긍정(`plus`) 49개, 중립(`neutral`) 24개, 주의(`caution`) 64개입니다. 조합 패턴이 가장 먼저 정렬됩니다.

### 구현된 기능

- **오행 계량**
  - 오행별 점유율, 일간 세력(비겁+인성) 점유율과 강약 판정, 계절 왕지(旺支)를 계산합니다.
  - 점수제 강약과는 별개 모델이라 둘을 함께 보여 줍니다.
- **패턴 감지**
  - 패턴마다 걸린 자리(년간·월지 등), 글자, 강도(0~1), 수치를 기록합니다.
  - 상생 흐름은 붙어 있는 기둥이면 "생한다"고 쓰고, 떨어져 있으면 간접 흐름으로 씁니다.
- **동적 문장**
  - 같은 패턴이라도 명식마다 다른 문장을 만듭니다.
  - 한자·숫자·괄호 설명 뒤에도 받침에 맞는 조사(이/가, 을/를, 은/는, 으로/로, 와/과)를 붙입니다.
- **문구 DB** (`content/entries/saju`, 137건)
  - 빌드할 때 JSON으로 묶습니다.
  - `validate-content.mjs`가 다음 네 가지를 검사합니다.
    - 경로·키가 레지스트리와 일치하는지
    - 스키마
    - 샘플 명식을 엔진으로 다시 계산한 값이 문구의 주장과 같은지
    - 단정·보장·공포 조성 금칙어가 없는지
- **5개 축 리포트**
  - 축: 적성·일, 재물, 연애·배우자, 건강, 육친
  - 배우자성·자녀성은 성별로 정합니다(남명 자녀 = 관성, 여명 자녀 = 식상).
  - 건강 축은 의료 판단을 대신하지 않도록 안내 문장을 넣습니다.
- **시점 서사**
  - 현재·다음 대운, 세운, 월운을 다룹니다.
  - 천간과 지지를 따로 판정합니다(용신·기신·준용신 → 맞음/긴장/혼재). 그래서 한 축만 보고 단정하지 않습니다.
  - 그 밖에 대운 전환 서사, 대운 흐름표, 과거 대운을 되짚는 상담 확인 질문을 만듭니다.
- **맥락 문장**: 패턴에 걸린 글자가 용신 축이나 기신 축에 닿을 때만 "이 명식에서:" 문장을 붙입니다.
- **렌더러**: Markdown과 standalone HTML을 만듭니다. HTML은 인쇄·PDF 저장용이며 상담사 브랜드 헤더를 넣을 수 있습니다.
- **시각 미상 처리**: 시주·자녀궁을 언급하지 않고, 대신 안내 문장을 넣습니다.

---

## 3. 역학 모듈 12종

날짜·시각을 받는 모듈은 만세력 엔진의 간지·절기·음양력·법정시 처리를 공유합니다. 시각을 받는 모듈(자미두수·기문둔갑·대육임)도 사주와 같은 기준을 따릅니다. 일주·시주·음력 날짜는 서머타임을 뺀 표준시로 잡고, 절기·월장은 실제 순간(UTC+9)으로 비교합니다.

### 풀이까지 제공하는 모듈

| 모듈 ID | 이름 | 입력 | 계산 | 풀이·리포트 |
|---|---|---|---|---|
| `compatibility` | 궁합 | 두 사람의 출생 정보 | 4항목 100점(아래 표)과 S~D 등급. 시각 미상이면 3주 기준 | `interpretCompatibility` → `renderCompatibilityMarkdown`·`Html`. 일간 십신·방향, 배우자궁, 강약 대비, 오행 보완 서술 |
| `tojeong` | 토정비결 | 생년월일(양력·음력, 윤달 정책), 대상 연도 | 상괘(8)·중괘(6)·하괘(3) 144괘. 음력 변환, 태세·월건·일진수, 윤달·말일 보정 내역 | `interpretTojeong` → `renderTojeongMarkdown`·`Html`. 개인별 괘와 산식만 설명 |
| `naming` | 작명 | 성·이름 후보(한자 선택), 획수 학파 | 한글·강희·현대 획수, 원형이정, 81수리, 오격(천·인·지·외·총), 발음오행, 자원오행. 사주 용신 기반 추천(`mode: 'recommend'`) | `interpretNaming`·`interpretNamingWithSaju` → `renderNamingMarkdown`·`Html` |
| `calendar` | 만세력 달력·택일 | 날짜(일·월 보기) | 일진, 음력, 절기, 십이직(건제만평…), 길흉 | `interpretTaekil` → `renderTaekilMarkdown`·`Html`. 십이직별 맞는 일·피할 일 |

궁합 4항목은 다음과 같습니다.

| 항목 | 기준 | 배점 |
|---|---|---:|
| 성격 궁합 | 일간 관계 | 30 |
| 감정 궁합 | 일지 관계 | 25 |
| 오행 균형 | 두 사람을 합친 오행 보완 | 25 |
| 기운 조화 | 본명성(구성) 관계 | 20 |

풀이 문구는 문구 DB에 있습니다. 작명 11건은 `content/entries/naming`, 택일 12건은 `content/entries/taekil`입니다.

### 판(盤)을 세우는 모듈

| 모듈 ID | 이름 | 입력 | 계산 결과 |
|---|---|---|---|
| `ziwei` | 자미두수 | 양력·음력 날짜, 시, 성별 | 명궁·신궁, 오행국, 명주·신주, 12궁(궁간·주성·보좌·잡성·밝기), 생년 사화, 대한·소한, 윤달 보정(`fixLeap`) |
| `qimen` | 기문둔갑 | 양력 날짜, 시 | 양둔·음둔, 국수, 삼원, 9궁(지반·천반 간, 팔문, 구성, 팔신), 직부·직사, 순수, 공망, 격국. 해석: `interpretQimenResult`(궁별 길흉, 용신 궁, 요약) |
| `daeyukim` | 대육임 | 양력 날짜, 시 | 월장, 천지반, 사과, 삼전(구종문 발용), 12천장, 과명, 공망. 해석: `interpretDaeyukimResult`(사과·삼전·과명) |
| `guseong` | 구성기학 | 출생 연도, 성별, 대상 날짜 | 본명성, 연반·월반·일반 구궁도(중궁성·방위), 해석 문구 |

### 수리·괘 모듈

| 모듈 ID | 이름 | 입력 | 계산 결과 |
|---|---|---|---|
| `hongyeon` | 홍연 | 사주팔자 | 선천수(천간 하도수 합) → 홍국수 → 본명성, 구궁 배치, 통기도(인접 궁 오행 흐름) |
| `maehwa` | 매화역수 | 시각·두 수·이름 획수 중 하나 | 상·하괘, 64괘, 변효, 체용과 생극 관계, 해석 |
| `harak` | 하락리수 | 생년월일 | 하도수·낙서수 → 오행·방위, 상·하괘, 64괘, 해석 |
| `daejeong` | 대정수작괘 | 사주팔자 | 천간 선천수·지지 후천수 합 → 상·하괘, 64괘, 변효, 해석 |

자미두수 유파별 분석과 기문 유파 분석은 소스에 들어 있지만, 아직 공개 API로 내보내지 않습니다.
- 자미두수(`src/engine/ziwei/schools`): 삼합·사화·중주
- 기문 유파(`src/engine/qimen/schools`): 시국·연국·월국·홍연기문

---

## 4. 공개 API (주요 함수)

| 영역 | 함수 |
|---|---|
| 명식 | `buildSajuResult`, `calculatePalja`, `applyPractitionerOverride` |
| 명리 세부 | `determineGyeokguk`, `determineYongsin`, `determineYongsinBySchool`, `assessDayganStrength`, `calculateSipsin`, `calculateJijangganSipsin`, `calculateUnsung`, `calculateSinsal`, `analyzeJijiRelations`, `calculateGongmang`, `getNaeumOhaeng`, `analyzeWonjin`, `calculateDaeun`, `calculateSeun`, `calculateWolun` |
| 역법 | `ManseryeokEngine`, `solarToLunar`, `lunarToSolar`, `listSolarTermsForYear`, `getGanji`, `resolveKoreanLegalTime`, `correctToTrueSolarTime`, `getCalendarDay`, `getMonthlyCalendar` |
| 풀이 | `interpretSaju`, `runDetectors`, `measureOhaeng`, `assembleReport`, `buildTimingNarrative`, `judgeGanJi`, `renderPattern`, `PATTERN_REGISTRY`, `getContentEntry` |
| 렌더 | `renderReportMarkdown`, `renderReportHtml` |
| 궁합 | `calculateCompatibility`, `interpretCompatibility`, `renderCompatibilityMarkdown`, `renderCompatibilityHtml` |
| 토정비결 | `analyzeTojeong`, `interpretTojeong`, `renderTojeongMarkdown`, `renderTojeongHtml` |
| 작명 | `analyzeName(s)`, `analyzeNameExtended`, `analyzeNamesExtended`, `recommendNames`, `calculateFiveGrids`, `lookupHanja`, `getHanjaStrokes`, `searchHanjaByReading`, `interpretName(ing)`, `interpretNameWithSaju`, `interpretNamingWithSaju`, `renderNamingMarkdown`, `renderNamingHtml` |
| 택일 | `getCalendarDay`, `getMonthlyCalendar`, `getSinsal12`, `getGilhyung`, `getTaekilInfo`, `interpretTaekil`, `renderTaekilMarkdown`, `renderTaekilHtml` |
| 판·괘 | `calculateZiwei`, `calculateZiweiByLunar`, `calculateQimen`, `interpretQimenResult`, `calculateDaeyukim`, `interpretDaeyukimResult`, `calculateGuseong`, `analyzeHongyeon`, `divineByTime`, `divineByNumber`, `divineByName`, `calculateHarak`, `calculateDaejeong` |
| 계약 | `executeEngineModule`, `executeEngineModuleById`, `ENGINE_MODULE_IDS`, `ENGINE_VERSION`, `ENGINE_CONTRACT_VERSION`, `ENGINE_DATA_VERSION` |

타입 선언(`dist/index.d.ts`)이 함께 생성됩니다.

---

## 5. 검증

`npm test`는 다음을 모두 실행합니다.

| 테스트 | 내용 |
|---|---|
| `smoke.test.mjs` | ESM·CJS 산출물의 핵심 회귀 (4주, 子월 지장간, 서머타임 절기 경계, 범위 오류, 계약 봉투) |
| `regression.test.mjs` | 회귀 82건. 절기·음양력·법정시·대운 경계, 격국·용신·강약 규칙, 원진·삼합, 자미두수·기문·대육임·토정·궁합·하락·작명 계산, 서머타임 표준시 처리, 조사, 풀이 판정 논리 |
| `naming-tojeong.test.mjs` | 작명(획수 학파·오격·추천)과 토정비결(괘 산식·윤달·말일) 9건 |
| `interpretation.test.mjs` | 골든 명식 리포트, 패턴 감지·조합키 46종 샘플, 궁합·작명·택일 풀이, 렌더 출력, 문구 안전성 |
| `personal-interpretation.test.mjs` | 토정비결·작명 개인 풀이 4건 |
| `validate-content.mjs` | 문구 DB 160건(사주 137·작명 11·택일 12)의 레지스트리·스키마·샘플 명식 재계산·금칙어 검사 |

개발 중에 외부 기준과 따로 대조한 결과입니다(대조 스크립트는 이 브랜치에 포함하지 않았습니다).

- **법정시·서머타임**: IANA `Asia/Seoul` 시간대와 213만 표본을 대조해 불일치 0건
- **절기**: 천문 계산과 4,848개를 대조해 평균 오차 수 초, 최대 62초
- **음양력**: 1900~2101년 7만여 일을 대조해 불일치 0건
- **4주 간지**: 독립 구현(lunar-javascript)과 3만 표본을 대조해 불일치 0건
- **풀이**: 무작위 명식 수천 건에서 예외·조사 오류·누락 0건. 관계 판정은 4,000건을 독립 재계산과 대조해 불일치 0건
- **자미두수**: 외부 라이브러리 iztro와 3,700여 명반 대조. 다른 날짜는 입춘 경계 8일뿐이며, 한국시(UTC+9)와 중국시(UTC+8) 차이 때문
- **기문둔갑**: 시주를 사주 엔진과 1950~2100년 5,924건 대조
  - 5,923건이 일치했습니다.
  - 나머지 1건(1956-05-20 0시)은 서머타임으로 실재하지 않는 시각이라, 두 엔진 모두 오류를 낸 경우입니다.
- **역학 모듈 전체**: 사주·자미두수·기문·대육임·구성·홍연·매화·하락·대정·토정·궁합·작명 오격을 무작위 입력 400건씩 실행
  - 예외·비정상 값은 0건입니다.
  - 토정 18건은 대상 연도가 생년보다 앞선 입력이라 의도대로 거절된 경우입니다.

---

## 6. 알아둘 점

- **격국·용신·강약은 학파 판단입니다.** 엔진은 정한 규칙대로 계산하며, 규칙의 타당성은 전문가 검수 대상입니다. 검수 기준과 대표 명식은 [`docs/expert-review-checklist-2026-09-15.md`](docs/expert-review-checklist-2026-09-15.md)에 있습니다.
- **절기 시각에는 수 초~1분 정도 오차가 있습니다.** 절입 순간 바로 앞뒤에 태어난 경우에만 월주가 달라질 수 있습니다.
- **진태양시 보정은 분 단위로 반올림합니다.** 시 경계 1분 안쪽에서는 정밀 계산과 시주가 다를 수 있습니다.
- **2051년 이후 음력은 천문 계산값입니다.** KASI가 공표한 값이 아닙니다.
- **1908-04-01 이전 출생은 지원하지 않습니다.** 서머타임 때문에 실재하지 않는 시각을 넣으면 오류가 납니다.
- **풀이 문장은 상담 참고 자료입니다.** 의료·재정·관계 결정을 지시하지 않도록 쓰였습니다.
- **역학 모듈은 단일 참조 학파 기준입니다.** 실행 계약 봉투도 같은 내용을 `warnings`로 알려 줍니다.
  - 토정비결: 원문 해설과의 대응을 검증하지 못해, 해설(`interpretation`)은 `null`, `contentStatus`는 `'unverified'`입니다. 괘 산식은 원문 대조를 하지 않았습니다.
  - 자미두수: 사화 표와 일부 유성 배치가 유파마다 다릅니다.
  - 기문둔갑: 원(元)은 부두법으로 판별합니다.
  - 대육임: 일부 특수과(팔전·별책·묘성 등)의 초전은 간이 규칙으로 둡니다.
  - 구성: 일반(日盤)은 일원갑자법을 따릅니다.
  - 하락리수: 년간지를 입춘이 아닌 역년(曆年) 기준으로 잡습니다.
- **작명 자료에는 한계가 있습니다.**
  - 자원오행·81수리 표는 단일 유파 규칙입니다.
  - 인명용 한자 허용 여부를 보증하지 않습니다.
  - 현대 획수(Unicode kTotalStrokes)는 한국 자형 표준이 아닙니다.
  - 추천은 60자 편집 후보군 안의 조합입니다.
- **궁합 점수는 이 엔진의 4항목 규칙에 따른 값입니다.**

---

## 7. 디렉터리

```
.
├─ README.md
├─ package.json                  # build / test / pack 스크립트
├─ src/engine/
│  ├─ core/                      # 만세력: 법정시·절기·음양력·간지 (+ data/)
│  ├─ adapter/                   # 진태양시·자시 학파·한자 매핑·조사
│  ├─ saju/                      # 명리 계산: 십신·신살·격국·용신·강약·대운
│  ├─ calendar/                  # 만세력 달력(일진·십이직) — 택일의 기반
│  ├─ compatibility/             # 궁합
│  ├─ tojeong/                   # 토정비결
│  ├─ naming/                    # 작명 (획수 자료 2,137자·추천)
│  ├─ ziwei/  qimen/  daeyukim/  # 자미두수 · 기문둔갑 · 대육임
│  ├─ guseong/  hongyeon/        # 구성기학 · 홍연
│  ├─ maehwa/  harak/  daejeong/ # 매화역수 · 하락리수 · 대정수
│  ├─ contracts/                 # 실행 계약 봉투(13개 모듈)·입력 검증·버전
│  ├─ interpretation/            # 사주풀이 엔진 + 궁합·토정·작명·택일 풀이·렌더러
│  └─ types.ts
├─ content/entries/              # 풀이 문구 DB — saju 137 · naming 11 · taekil 12 (작성 규칙: content/README.md)
├─ packages/myeong-engine/       # 배포 패키지: 빌드 스크립트·테스트·데이터 생성기
├─ scripts/refresh-hanja-strokes.py  # 작명 한자 획수 자료 재생성 (Unicode Unihan)
├─ docs/                         # 전문가 검수 체크리스트·대표 명식 fixture
└─ examples/                     # 사용 예시(usage.mjs·modules.mjs)·풀이 리포트 예시
```

`src/engine`이 원본 소스입니다. `packages/myeong-engine/build.mjs`가 빌드할 때 이 소스를 패키지로 복사하고, 문구 DB(YAML → JSON)를 생성한 뒤 ESM·CJS 번들과 타입 선언을 만듭니다.
