# 핸드오프 — 해석 계층 2차 이후 로드맵 (2026-09-13)

> 이 문서는 `feat: 해석 계층 1차 구현` 커밋(44fe6fc)의 다음 단계를 인수인계한다.
> 세션 컨텍스트 없이 이 문서 + 코드만으로 작업을 이어갈 수 있게 쓴다.

## 0. 프로젝트 비전 (왜 이 레이어를 만드는가)

- 엔진 13모듈(사주·자미·기문·육임·매화·토정·작명·궁합 등)은 계산 완성. 부족한 것은 **해석 깊이**.
- 해결 아키텍처: 4층 구조.
  1. **Facts** — `SajuResult`(완성)
  2. **Detector** — 구조 패턴 감지 (예: 식상생재, 공망×관성) ← 1차 구현 완료
  3. **문구 DB** — 패턴 키별 짧은/중간/긴 해석 문구 (미구현)
  4. **Assembler** — 패턴 조립 + 질문 컨텍스트 + 학파 분기 (1차 기본 구현)
- 사업 목표: ① 전문가용 "만세력 도우미" 일회성 라이선스 + 연 갱신 ② 해석 문구 제작을 콘텐츠(블로그/쇼츠/스레드)로 병행해 사전마케팅 겸용.

## 1. 완료 상태 (커밋 44fe6fc)

- `src/engine/interpretation/` — 기존 코드 미수정, `SajuResult`만 소비하는 순수 함수 레이어.
  - `types.ts` / `registry.ts`(패턴 36종) / `sipsin-groups.ts`(십신 묶음 헬퍼)
  - `detectors/` 15종: 흐름 4(식상생재·관인상생·재생관·식상제살), 과부족 5(인성·비겁·식상·관성 과다, 재성노출), 관계 2(천간합 5종, 지지 합·충·형·해는 `analyzeJijiRelations` 재사용), 교차 3(공망×십신, 격국×용신 동심/이축, 신살×십신 8조합), 시점 1(대운×용신)
  - `assemble.ts` — `interpretSaju()`: 우선순위→강도 정렬, **동일 키 병합**(강도 최대·근거 합침), 미등록 키 게이트, baseline(1층 문구) 보존
- 공개 API: `interpretSaju`, `runDetectors`, `runAllDetectors`, `DETECTORS`, `PATTERN_REGISTRY`, `isRegisteredPattern` (루트 + 패키지 index 둘 다 export)
- 테스트: `packages/myeong-engine/interpretation.test.mjs` — test 스크립트에 등록됨. 골든 케이스(1985-01-10 16:45 남: 甲子 丁丑 己酉 壬申 비견격) + 계약 일관성 + 레지스트리 무결성.

### 품질 규칙 (반드시 유지)

1. 조합키는 `saju/{category}/{pattern}` — **향후 content DB의 entry ID와 1:1 대응**. 한글 신살명은 한글 그대로(예: `saju/cross/sinsal-장성-siksang`). 로마자·한글 혼용 금지(1차에서 실제로 버그 났던 지점).
2. 레지스트리에 없는 키는 조립기가 버린다(문구 품질 게이트). 신살×십신 교차는 등록된 8조합만 내보낸다.
3. 모든 패턴에 `evidence` 필수, 강도 0~1, 과장 금지 문구(반드시/100%/보장 등).
4. 기존 계산 코드·기존 테스트는 절대 수정하지 않는다. detector는 `SajuResult`만 입력으로 받는다.
5. 십신 묶음 관계(식상→재성 등)는 오행 정의상 항상 상생이므로, flow detector의 감지 조건은 **존재+자릿수+인접 배치**로 판단한다.

### 환경 노트

- `packages/myeong-engine`의 `npm ci`가 필요했었음(esbuild 플랫폼 불일치 — node_modules가 다른 플랫폼에서 설치된 적 있음). 테스트 실패 시 먼저 확인.
- `buildSajuResult(input, { now })`의 `now`는 **Date 객체**. 봉투 API `executeEngineModuleById`의 `now`는 ISO 문자열. 혼동 주의.
- 빌드는 `packages/myeong-engine/src/index.ts`(패키지 전용 index)에서 번들링하므로, 새 export는 **루트 `src/engine/index.ts`와 패키지 index 둘 다**에 추가해야 함.

## 2. 다음 단계 (우선순위 순)

### A. saju detector 30개까지 확장 (2~3주)

1차 15종에 추가할 것:

- **조후(調후)**: 월지 계절 × 일간 오행 → 조후 오행 부존재 감지 (예: 한겨울 己土의 화 필요). 격국용신과 병기하는 학파 분기 — `school-resolver`와 연계해 학파별 키 분리(예: `saju/timing/chohu-insung` vs 격국용신 라인).
- **원진(元辰)**: `analyzeWonjin` 재사용 → `saju/relation/wonjin`.
- **지지 반합/삼합·방합 상세**: 현재 '합' 통합 키를 `saju/relation/samhap-{국}` 등으로 세분.
- **용신형 케이스**: 종격·특수격 감지 시 키 분기.
- **대운×세운 이중 교차**: 현재 대운 오행 + 올해 세운 오행이 용신/기신과 어떤 관계인지 3×3 판정.
- **질문 컨텍스트 detector**: 재물/연애/이직 프레임별로 관련 패턴만 필터링하는 4층 함수(`interpretSaju(result, { context: 'money' | 'love' | 'career' })`).

각 detector 추가 절차: `registry.ts`에 키+기본 문구 등록 → detector 함수 작성 → `DETECTORS` 배열 추가 → `interpretation.test.mjs`에 골든/부정 케이스 추가.

### B. content DB + 문구 파이프라인 (detector 30개와 병행 가능)

- `content/entries/{module}/{combo-key}.yaml` — 스키마: `id, title, audience(pro|public|both), status(draft→linted→reviewed→published), evidence(sampleBirth + assert), hooks/shorts, body{short,medium,long}, tags`.
- **CI 검증이 핵심**: `content:validate`가 sampleBirth로 엔진을 실제 실행해 `assert` 대조(예: "식상 2·재성 2") + 금칙어 린트(반드시/보장/실존인물명).
- 조립기 수정 1줄: DB에 해당 키 문구가 있으면 `defaultText` 대신 사용.
- 문구 생산: LLM 초안(엔진 facts 바인딩 프롬프트) → 사람 검수 → `reviewed`. 검수 게이트 절대 생략 금지.

### C. 콘텐츠 사전마케팅 파이프라인 (B 완성 후)

- Remotion: 챠트 카드 PNG + 쇼츠 MP4 (엔진 출력 → 템플릿 렌더).
- 발행 어댑터: YouTube Data API(쿼터상 하루 ~6개) / Threads API / IG Graph API(비즈니스 계정 필요) / Tistory MetaWeblog. Naver 블로그는 공식 쓰기 API 없음 — 수동.
- 시리즈 순서: 십신(40) → 신살(20) → 격국 → 궁합 → 작명·택일. 특집 2편: 서머타임 출생자, 진태양시 보정으로 시주 변동 사례(전문가 신뢰 영업).
- 랜딩: Astro/Next + Vercel + Supabase(이메일). 폼에 **역할 필드(상담사/학습자/일반)** — 예약자 중 상담사 비율이 진짜 KPI. 채널별 UTM.
- 8주 마일스톤·비용(월 3~5만원)은 세션 논의 기준: W1 스키마+랜딩+카드 템플릿 → W2 초안 CLI+자동 발행 → W3 쇼츠 파이프라인 → W5-6 십신 완결·첫 점검 → W7-8 사전예약 300.

### D. 제품(만세력 도우미) 쪽 (콘텐츠 검증 후)

- 워크스테이션 기능: 고객 DB·원클릭 브리핑·시간 미상 안전 모드(야자/조자 비교·진태양시)·다인 비교·상담사 브랜드 리포트.
- 판매: 일회성 19~29만(활성화 서버) + 연 갱신 5~9만(세운·문구 DB 확장). MVP 권 = 사주+궁합+작명+택일 4권.
- 사전판매(역학 카페·학원, 100명)로 시장 검증 후 본 개발.

## 3. 참고 자료

- 세션에서 산출한 풀이 샘플(1985-01-10 명식 전문 풀이)은 본 문서 말고 대화 기록에 있음 — 톤의 기준 예시로 사용.
- 리서치 파일: `.firecrawl/`(KOCCA 게임지원, Fab, 유산/실록 API 등 — 게임 에셋·역사 콘텐츠 확장 시 재활용).
- 시장 벤치마크: 사주나루 연매출 400억(상담 중개), 포스텔러·점신(운세 앱), 중화권 문묘천기(다학문 전문가 도구 — 한국 시간 처리에서 우리가 우위).
