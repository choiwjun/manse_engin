# myeong-manseryeok-engine

MYEONG 만세력/사주 계산 엔진 — 한국 법정시 변천·서머타임(DST)·진태양시·자시 학파를 처리하는 순수 TypeScript 엔진. Node.js와 브라우저(WebView) 모두에서 동작하며 런타임 의존성이 없습니다.

## 설치

```bash
# 저장소에서 빌드 산출물(tarball) 생성
cd packages/myeong-engine
npm install        # esbuild, typescript (빌드 전용)
npm run build
npm pack           # myeong-manseryeok-engine-<version>.tgz 생성

# 소비 프로젝트에서
npm install /path/to/myeong-manseryeok-engine-0.1.0.tgz
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
- 범위 초과 → `ManseryeokPolicyError` (`code: 'MANSERYEOK_POLICY_ERROR'`)
- 데이터 미스 → `ManseryeokDataError` (`code: 'MANSERYEOK_DATA_ERROR'`)
- 법정시 전환점의 모호/부재 시각 → `AmbiguousCivilTimeError` / `NonexistentCivilTimeError`
- 봉투 계층에서는 위 코드가 `EngineContractError`의 `OUT_OF_RANGE` / `DATA_MISSING` / `AMBIGUOUS_CIVIL_TIME` / `NONEXISTENT_CIVIL_TIME`으로 매핑됩니다.

## 주의 사항

- 입력의 `hour`/`minute`은 한국 **법정 시계 라벨**입니다. DST 기간(1948~1960, 1987~1988)에는 엔진이 표준시로 자동 환산해 절기를 비교합니다.
- `calendarType` 필드는 `ziwei` 등 일부 모듈 계약 입력에서만 쓰이며, `BirthInputData`는 `isLunar`/`isLeapMonth`를 사용합니다.
- 소비 프로젝트의 TypeScript는 `moduleResolution: "bundler"`(또는 `node16`/`nodenext`)를 권장합니다. `lib`는 ES2020 이상이면 충분합니다.

## 소스 구조

이 패키지는 코드 사본이 아닙니다. `build.mjs`가 저장소 루트의 `src/engine/`을 복사해 `@/engine/*` 별칭을 상대 경로로 재작성한 뒤 esbuild로 번들하고 tsc로 선언을 생성합니다. **엔진 수정은 항상 루트 `src/engine/`에서** 하고, 배포 전 `npm run build && npm pack`으로 산출물을 갱신하세요.
