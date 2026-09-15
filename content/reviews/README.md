# 콘텐츠 검수 기록 (Review Records)

상용화 전문가 검수의 감사 추적(audit trail). `status: reviewed`만으로는 부족하므로,
엔트리별로 **누가(검수자)·어떤 기준으로(학파/관점)·언제(일자)** 검수했는지를 별도 기록한다.

## 파일 규칙

- 검수 라운드 1회 = 파일 1개: `content/reviews/{YYYYMMDD}-{round}.md`
- 한 파일 안에 여러 검수자(페르소나)의 판정을 엔트리별로 나란히 기록한다.
- 확장 라운드는 기존 전수 라운드와 분리해 `r2`처럼 기록하고, 코드 변경의 검수 결과와 적용 내용을 함께 남긴다.

## 기록 형식

```markdown
## {entry-id}
- file: content/entries/{module}/{category}/{pattern}.yaml
- verdicts:
  - {reviewer-id} | {basis} | {date} | pass|revise|reject | {note}
- applied: {반영 내용 또는 "변경 없음"}
```

## 검수자(페르소나) 등록부

| ID | 관점 | 기준(basis) |
|---|---|---|
| myeongri-classical-1 | 고전 명리 | 자평명리·삼명통회 체계 — 격국·용신·십신 의미의 전통적 정확성 |
| myeongri-modern-1 | 현대 실전 | 강약·조후 중심 실전 해석 — 상담 현장에서 통하는 표현 |
| counseling-safety-1 | 상담 윤리 | 단정·지시·공포조장 금지, 의료·재정·관계 결정의 전문가 이관, 금칙어 |
| naming-specialist-1 | 작명학 | 수리81·발음오행·자원오행 해석의 정확성 |
| taekil-specialist-1 | 택일 | 십이직·신살 전통 의미와 길흉 판정의 정확성 |

> ⚠️ 페르소나 검수는 1차 게이트다. 상용화 전에 실제 역학 전문가의 대표 명식 대조 검수가 별도로 필요하다.

## 라운드 색인

| 라운드 | 대상 | 결과 |
|---|---|---|
| [20260915-r1](20260915-r1.md) | 기존 145건 전수 검수 | pass 139 / revise 6 / reject 0 |
| [20260915-r2](20260915-r2.md) | 10차·cross·flow 확장 및 작명×사주 교차 | 신규 YAML pass 10 / 작명 교차 revise 후 반영 |
| [20260915-r3](20260915-r3.md) | 11차 조후×강약 4건 + 작명·택일·궁합 HTML 렌더러 | pass 4 / revise 0 |
