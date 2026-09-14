# 문구 DB (content) — 파이프라인

해석 문구의 3층 콘텐츠 DB. 레지스트리(`src/engine/interpretation/registry.ts`)의 `defaultText`·`conclusion`은
fallback이고, 이 DB에 문구가 있으면 조립기가 그 문구를 우선 사용한다(오버라이드).

## 파일 규약

- 경로 = 조합키 그대로: `entries/{module}/{category}/{pattern}.yaml` ↔ 키 `{module}/{category}/{pattern}`
  - 한글 신살명은 한글 그대로 쓴다 (예: `saju/cross/sinsal-장성-siksang.yaml`). 로마자 혼용 금지 — 실제 버그가 난 지점.
- 스키마:

```yaml
id: saju/flow/sangsaeng-saengjae      # 경로와 일치해야 하고, 패턴 레지스트리에 등록돼 있어야 한다
title: 식상생재(食傷生財)               # 레지스트리 title과 일치 권장
audience: counselor                   # counselor(상담사) | learner(학습자) | public(일반)
status: draft                         # draft → linted → reviewed → published
sampleBirth:                          # 문구를 검증한 실제 명식 (엔진 재실행 대조용)
  year: 1985
  month: 1
  day: 10
  hour: 16
  minute: 45
  gender: male                        # male | female
  isLunar: false
assert:                               # 엔진 재실행 결과와 대조할 필드 (부분 허용)
  palja: 甲丁己壬                     # 연월일시 천간 연결
  gyeokguk: 비견격                    # 격국 이름
  yongsin: 금                         # 용신 오행
body:
  short: 한 줄 요약 (리포트 헤드라인용)
  medium: 두세 문장 (리포트 섹션 본문용)
  long: 다단락 심층 문구 (상담 리포트 첨부용)
tags: [재물, 식상, 흐름]
```

## 네임스페이스

| 접두사 | 대상 | sampleBirth/assert |
|---|---|---|
| `saju/*` | 패턴 레지스트리 키 (flow·imbalance·relation·cross·combo·timing·johu) | 필수 — 엔진 재실행 대조 |
| `naming/*` | 작명 해석 문구 (`naming/grade/*` 등급 가이드, `naming/structure/*` 구조 해석) | 불필요 (명식 무관) |
| `taekil/*` | 택일 해석 문구 (`taekil/sinsal12/*` 십이직별 note·suited·avoid) | 불필요 (날짜 무관) |

`saju/*` 키는 `PATTERN_REGISTRY` 등록이 필수고 `sampleBirth`/`assert`로 엔진 재실행을 대조한다.
`naming/*`·`taekil/*` 키는 패턴이 아니라 해석 문구 조각이라 레지스트리·sampleBirth 대상이 아니다 — `body.short`(필수) 외에 `body.note`·`body.suited`·`body.avoid` 같은 커스텀 필드를 쓴다.

## 검증 (`content:validate`)

`packages/myeong-engine/validate-content.mjs`가 전체 엔트리에 대해 다음을 검사한다. 하나라도 실패하면 CI가 깨진다.

1. `id` ↔ 파일 경로 일치. `saju/*` 키는 패턴 레지스트리 등록 여부까지 검사
2. `status`·`audience` enum, `body.short` 존재
3. `saju/*` 키만: `sampleBirth`로 엔진 재실행 → `assert` 필드 대조 (palja·gyeokguk·yongsin)
4. 금칙어 린트: `반드시`, `보장`, `확실`, `100%` — 역학 해석에 단정적 표현 금지

## 문구 생산 흐름

1. LLM 초안을 만들 때 엔진 facts(`DetectedPattern.evidence`)를 그대로 바인딩해 준다.
2. 사람이 검수하면 `status: reviewed`로 올린다.
3. 발행 전 `npm run content:validate` — assert 대조와 금칙어가 자동으로 걸러준다.
4. 조립기 오버라이드 연결(레지스트리 문구 대신 DB 문구 사용)은 다음 단계 과제 — 핸드오프 문서 참고.
