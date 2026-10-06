# myeong-manseryeok-engine

MYEONG 만세력/사주 계산 엔진 — 한국 법정시 변천·서머타임(DST)·진태양시·자시 학파를 처리하는 순수 TypeScript 엔진. Node.js와 브라우저(WebView) 모두에서 동작하며 런타임 의존성이 없습니다.

## 설치

```bash
# 저장소에서 빌드 산출물(tarball) 생성
cd packages/myeong-engine
npm ci             # 빌드·검증·데이터 생성용 개발 의존성
npm test           # 빌드 + 스모크·회귀 테스트
npm pack           # myeong-manseryeok-engine-<version>.tgz 생성

# 소비 프로젝트에서
npm install /path/to/myeong-manseryeok-engine-0.4.0.tgz
```

## 사용

### 1) 직접 계산 API — `BirthInputData`

```ts
import { buildSajuResult, calculatePalja } from 'myeong-manseryeok-engine';
import type { BirthInputData } from 'myeong-manseryeok-engine';

const birth: BirthInputData = {
  isLunar: false,        // true면 음력 (isLeapMonth로 윤달 지정)
  year: 1990, month: 5, day: 15,
  hour: 14, minute: 30,  // 시간을 모르면 null
  gender: 'male',
  birthPlace: null,
};

const result = buildSajuResult(birth);
// result.palja — 년/월/일/시주 (yearGan, yearJi, ...)
// result.sipsin, result.gyeokguk, result.yongsin, result.daeun,
// result.sinsal, result.jijanggan, result.gongmang, result.naeum, ...

const palja = calculatePalja(birth, {
  trueSolarTime: false,   // 진태양시 보정
  longitude: 127.0,       // 관측지 경도
  midnightMode: 'yaja',   // 자시 학파: 'yaja'(야자시) | 'joja'(조자시)
});
```

### 2) 모듈 봉투 API — `executeEngineModuleById`

13개 역학 모듈을 통일된 계약으로 실행하고 `runId`·`inputHash`·`engineVersion`이 붙은 `EngineRunEnvelope`를 반환합니다. `inputHash` 계산에 Web Crypto(`globalThis.crypto.subtle`)를 사용하므로 Node.js 18+ 또는 최신 브라우저가 필요합니다.

```ts
import { executeEngineModuleById } from 'myeong-manseryeok-engine';

const env = await executeEngineModuleById('saju', {
  birth,                          // BirthInputData
  now: new Date().toISOString(),  // 대운/세운 기준 시각
});
// env.runId, env.engineVersion, env.inputHash, env.result, env.warnings
```

모듈 ID: `saju` `compatibility` `tojeong` `ziwei` `qimen` `daeyukim` `guseong` `hongyeon` `maehwa` `harak` `daejeong` `naming` `calendar`

### 3) 역법 유틸리티

```ts
import {
  solarToLunar, lunarToSolar,
  listSolarTermsForYear, getSolarTermOnOrBeforeDateTime,
  createNormalizedManseryeokContext, resolveKoreanLegalTime,
} from 'myeong-manseryeok-engine';

solarToLunar({ year: 2024, month: 2, day: 10 });   // → 음력 2024-01-01
lunarToSolar({ year: 2024, month: 1, day: 1, isLeapMonth: false });
listSolarTermsForYear(2024);                        // 24절기 시각(표준시)
```

## 지원 범위와 에러

- 공개 지원 범위: **1908-04-01 ~ 2101년** (`SUPPORTED_MANSERYEOK_RANGE`)
- 한국 음력: 양력 2050-12-31까지 `korean-lunar-calendar@0.4.0`의 KASI 기준표 사용.
  2051~2101년은 UTC+09:00 기준 천문 계산 확장이며 KASI 공표값은 아닙니다.
- 절기 데이터는 2102년까지 보유하여 2101년 말 출생자의 순행 대운을 계산합니다.
  공개 출생 입력의 상한은 2101년입니다.
- 범위 초과 → `ManseryeokPolicyError` (`code: 'MANSERYEOK_POLICY_ERROR'`)
- 데이터 미스 → `ManseryeokDataError` (`code: 'MANSERYEOK_DATA_ERROR'`)
- 법정시 전환점의 모호/부재 시각 → `AmbiguousCivilTimeError` / `NonexistentCivilTimeError`
- 봉투 계층에서는 위 코드가 `EngineContractError`의 `OUT_OF_RANGE` / `DATA_MISSING` / `AMBIGUOUS_CIVIL_TIME` / `NONEXISTENT_CIVIL_TIME`으로 매핑됩니다.

## 주의 사항

- 입력의 `hour`/`minute`은 한국 **법정 시계 라벨**입니다. 절기 비교는 역사적 UTC 오프셋과 DST를 모두 반영해 UTC+09:00으로 환산합니다.
- 진태양시와 자시 학파는 일·시주에 적용합니다. 년·월주와 대운까지의 경과 시간은 출생 순간을 기준으로 하므로 진태양시 옵션에 따라 바뀌지 않습니다.
- `hour`/`minute` 중 하나라도 `null`이면 시주를 생략하고, 진태양시 보정 없이 정오를 대표 시각으로 사용합니다. 절기 당일의 년·월주와 대운 시작은 잠정값이며 봉투 API는 `TIME_UNKNOWN` 경고를 반환합니다.
- 대운의 `age`는 표시용 정수이고, `isCurrent`는 `startAgeMonths`의 소수 부분까지 사용합니다. 출생 순간의 KST 날짜에 정수 개월을 달력으로 더하고(월말은 해당 월 말일로 제한), 소수 개월은 1개월=30일로 더한 구간의 시작 시각에 변경됩니다.
- `calendarType` 필드는 `ziwei` 등 일부 모듈 계약 입력에서만 쓰이며, `BirthInputData`는 `isLunar`/`isLeapMonth`를 사용합니다.
- 소비 프로젝트의 TypeScript는 `moduleResolution: "bundler"`(또는 `node16`/`nodenext`)를 권장합니다. `lib`는 ES2020 이상이면 충분합니다.

## 소스 구조

이 패키지는 코드 사본이 아닙니다. `build.mjs`가 저장소 루트의 `src/engine/`을 복사해 `@/engine/*` 별칭을 상대 경로로 재작성한 뒤 esbuild로 번들하고 tsc로 선언을 생성합니다. **엔진 수정은 항상 루트 `src/engine/`에서** 하고, 배포 전 `npm run build && npm pack`으로 산출물을 갱신하세요.

`npm run generate:data`는 잠금 파일의 개발 의존성으로 음양력 표와 2102년 절기 버퍼를
오프라인 재생성합니다. 일반 빌드는 저장된 표만 사용하므로 런타임 의존성은 없습니다.
재생성 시 한국 기준표의 월 시작일과 NASA 삭망표를 대조합니다.
출처와 라이선스는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 수록합니다.

## 0.4.0 토정비결·작명

계약 버전 2.0.0: 토정비결의 `interpretation`은 검증된 해설이 없으므로 `null`입니다.
`contentStatus: 'unverified'`를 확인하고 이전 144괘 초안을 공개하지 마세요.
기존 음력 입력은 유지하며 `calendarType: 'solar'`, `isLeapMonth`,
`leapMonthPolicy: 'regular-month' | 'reject'`를 지원합니다. `calculation`에 음력 변환·
태세/월건/일진수와 윤달/말일 보정 내역이 포함됩니다.

작명은 원격(이름 합)/형격(성+첫 이름)을 교정했습니다. `wonhyeong`은
가성수 없는 원형이정이며 `fiveGrids`는 천/인/지/외/총격(가성수 별도 규칙)입니다.
한자를 제공하면 전 글자 등록/독음 일치가 필요하며 한글 획수로 혼합 대체하지 않습니다.
한자가 전혀 없으면 기존 한글 분석을 유지하고 `strokeBasis: 'hangul'`로 표시합니다.
강희=Unicode 13 kRSKangXi 부수원획수+나머지, 현대=Unicode 17 kTotalStrokes 첫 값(G).
현대획수는 한국 자형의 통일 표준이 아닙니다. 각 결과의 `policy`를 표시하세요.

```ts
const env = await executeEngineModule('naming', {
  mode: 'recommend', surname: '김', surnameHanja: '金', birth,
  school: 'kangxi', yongsinSchool: 'gyeokguk', limit: 6,
  // givenName: '서연', // 선택: 편집 후보군에 해당 독음이 있는 경우만 추천
});
// env.result.recommendation: 선택 용신·검토 조합 수·순위 규칙
// candidates[].recommendationDetails: 일치 수·뜻·추천 이유
```

추천은 60자 편집 후보군 내 조합입니다. 자원오행/81수리 표는 프로젝트의 단일 유파 규칙이며
법적 인명용 한자 허용 여부나 삶의 결과를 보증하지 않습니다.
획수 재생성: `python3 scripts/refresh-hanja-strokes.py` (저장소 루트).
검증: `--check`는 원자료 해시와 2,137자 추출 결과의 일치를 확인합니다.

### 토정비결·작명 풀이

계산 결과를 해석 계층에 전달하면 근거와 확인 사항을 포함한 문서를 만들 수 있습니다.

```js
import {
  executeEngineModule, interpretTojeong, renderTojeongMarkdown, renderTojeongHtml,
  interpretNaming, renderNamingMarkdown, renderNamingHtml,
} from 'myeong-manseryeok-engine';

const { result: tojeong } = await executeEngineModule('tojeong', {
  birthYear: 1990, birthMonth: 1, birthDay: 15,
  calendarType: 'lunar', targetYear: 2026,
});
const explanation = interpretTojeong(tojeong);
const markdown = renderTojeongMarkdown(tojeong, explanation);
const html = renderTojeongHtml(tojeong, explanation);

const { result: naming } = await executeEngineModule('naming', {
  surname: '박', school: 'kangxi',
  candidates: [{ givenName: '화해', hanjaChars: ['朴', '花', '海'] }],
});
const candidates = interpretNaming(naming);
const namingMarkdown = renderNamingMarkdown(naming, candidates);
const namingHtml = renderNamingHtml(naming, candidates);
```

`interpretTojeong`는 개인별 괘와 산식·윤달·말일 처리만 설명합니다. 원문 해설은 미검증이므로 연간·월별 길흉 문구를 생성하지 않습니다. `interpretNaming`은 기존 한글 분석도 지원하며, 확장 결과를 주면 획수 기준·한자별 획수·사격/오격·자원오행을 추가합니다. 추천 결과의 용신 기준과 후보별 추천 이유도 풀이에 포함됩니다. 두 풀이의 `basisRefs`로 계산 정책과 선택 근거를 추적할 수 있습니다.

워크스페이스에서는 고객 화면에서 해당 계산을 실행한 뒤 상담 화면의 자동 초안에서 **토정비결·작명**을 선택합니다. 가장 최근의 해당 고객 계산을 사용하며, 출생정보 또는 계산 정책이 바뀐 결과는 재계산해야 합니다. 생성한 풀이는 기존 상담사 검수와 리포트 절차를 따릅니다.
