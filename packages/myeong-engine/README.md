# myeong-manseryeok-engine

만세력 엔진과 사주풀이 엔진의 배포 패키지입니다. 엔진 구성과 기능 설명은 저장소 루트의 [README](../../README.md)를 보세요.

## 빌드·테스트

```bash
npm ci        # 빌드·테스트 도구 설치 (esbuild, typescript, 데이터 생성용 라이브러리)
npm run build # src/engine 복사 → 문구 DB 생성 → dist/index.js(ESM)·index.cjs(CJS)·*.d.ts
npm test      # 스모크 → 회귀 → 풀이 → 문구 DB 검증
npm pack      # myeong-manseryeok-engine-<버전>.tgz
```

다른 프로젝트에서는 만든 tarball을 설치해서 씁니다.

```bash
npm install ./myeong-manseryeok-engine-0.5.0.tgz
```

## 파일

| 파일 | 역할 |
|---|---|
| `build.mjs` | 루트 `src/engine` 복사, `@/engine/*` 경로 변환, 문구 DB(YAML → JSON) 생성, 번들·타입 선언 생성 |
| `src/index.ts` | 패키지 공개 API |
| `content-db.mjs` | 문구 YAML 수집·스키마 검사 (빌드·검증 공용) |
| `validate-content.mjs` | 문구 DB 검증. 레지스트리 일치, 스키마, 샘플 명식 재계산 대조, 금칙어 |
| `generate-data.mjs` | 음양력·절기 데이터 재생성 (`npm run generate:data`, 근거: `src/engine/core/data/README.md`) |
| `scripts/scan-combos.mjs` | 패턴 키가 실제로 감지되는 샘플 명식 탐색 (문구 작성용) |
| `fixtures/nasa-new-moons-2050-2102.json` | 2051년 이후 음력 검증용 NASA 삭 시각 |
| `smoke.test.mjs`, `regression.test.mjs`, `interpretation.test.mjs` | 테스트 |

빌드 중에 생성되는 `src/engine/`과 `dist/`는 커밋하지 않습니다.

## 런타임 요구 사항

- Node.js 18 이상 또는 최신 브라우저
- 계약 봉투(`executeEngineModule`)의 입력 해시에는 `crypto.subtle`, 실행 ID에는 `crypto.randomUUID`가 필요합니다.
- 런타임 의존성은 없습니다. 데이터 생성용 라이브러리의 고지는 `THIRD_PARTY_NOTICES.md`에 있습니다.
