# manse_engin — MYEONG 만세력/사주 엔진

한국 법정시 변천·서머타임(DST)·진태양시·자시 학파를 처리하는 순수 TypeScript 역학 계산 엔진입니다. Node.js 18+ 와 브라우저(WebView)에서 동작하며 런타임 의존성이 없습니다.

## 구조

```
src/engine/                엔진 소스 (canonical)
packages/myeong-engine/    배포용 npm 패키지 (빌드·번들·타입 선언)
```

- `src/engine/`이 유일한 소스입니다. 엔진 수정은 여기서 합니다.
- `packages/myeong-engine/build.mjs`가 `src/engine`을 복사해 `@/engine/*` 별칭을 상대 경로로 재작성한 뒤 ESM/CJS 번들과 `.d.ts`를 생성합니다.

## 빌드 & 패킹

```bash
cd packages/myeong-engine
npm install        # 빌드 전용 devDeps (esbuild, typescript)
npm run build      # dist/ 생성
node smoke.test.mjs  # 산출물 회귀 검증
npm pack           # myeong-manseryeok-engine-0.1.0.tgz
```

## 설치 (소비 프로젝트)

```bash
npm install /path/to/myeong-manseryeok-engine-0.1.0.tgz
```

```ts
import { buildSajuResult } from 'myeong-manseryeok-engine';

const r = buildSajuResult({
  isLunar: false, year: 1990, month: 5, day: 15,
  hour: 14, minute: 30, gender: 'male', birthPlace: null,
});
```

자세한 API·입력 형식·에러 계약은 [packages/myeong-engine/README.md](packages/myeong-engine/README.md)를 참고하세요.
