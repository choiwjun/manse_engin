# 콘텐츠 승격 워크플로 — reviewed → published (2026-09-15)

> 목적: `status: reviewed`(코드·페르소나 1차 검수 완료)를 `status: published`(실제 전문가 승인·상담 전달 가능)로 올리는 기준·절차·기록을 고정한다.
> 전제: `published` 승격은 반드시 실제 역학 전문가의 대조 검수를 거친다 — 코드 기반 검수만으로는 승격하지 않는다.

## 1. 상태 정의

| 상태 | 의미 | 진입 조건 |
|---|---|---|
| `draft` | 초안 | YAML 작성, validator 통과 |
| `linted` | 린트 통과 | `content:validate` 통과 (자동) |
| `reviewed` | 1차 검수 완료 | 코드 기반 페르소나 검수 또는 자동 검수 통과 + `content/reviews/` 기록 |
| `published` | 상담 전달 승인 | 실제 역학 전문가의 대조 검수 pass + 승격 기록 |

## 2. 승격 기준

엔트리가 `published`가 되려면 다음을 모두 충족한다.

1. **전문가 대조 검수 pass** — `docs/expert-review-checklist-2026-09-15.md`의 절차로 해당 엔트리가 속한 fixture에서 `verdict: pass`를 받는다.
2. **검수 기록 존재** — `content/reviews/{date}-expert.md`에 reviewer·basis·date·verdict가 기록되어 있다.
3. **안전성 문구** — 단정·보장·공포 조성 없이 의료·재정·관계 결정을 지시하지 않는다 (전문가 확인).
4. **validator 통과** — 승격 시점에 `npm run content:validate`가 통과한다.

## 3. 승격 절차

1. 전문가가 `docs/fixtures/expert-fixtures-2026-09-15.json`의 명식을 자신의 도구로 대조한다.
2. 판정 결과를 `content/reviews/{YYYYMMDD}-expert.md`에 기록한다 (형식은 체크리스트 §5).
3. `pass`를 받은 엔트리의 YAML `status`를 `published`로 변경한다.
4. `content/reviews/`에 승격 기록(날짜·승격자·근거 리뷰 파일)을 남긴다.
5. `npm test`로 전체 검증을 돌린다.

## 4. 상담사 베타 피드백 수집 양식

전문가 검수와 별도로, 상담사가 실제 상담에서 쓴 피드백을 모은다. 피드백은 `content/reviews/beta-{date}.md`에 기록한다.

```markdown
## {entry-id} — {fixture-id}
- 상담사: {이름/소속}
- 사용 일자: {YYYY-MM-DD}
- 사용 맥락: {상담 유형 — 연애/재물/적성/건강/종합}
- 문구 등급: A(그대로 사용) | B(약간 수정) | C(다시 씀) | D(사용 불가)
- 수정한 문구: {실제 상담에서 쓴 문구}
- 사유: {왜 수정했는지}
```

피드백 규칙:

- B 이하가 2건 이상 모인 엔트리는 문구를 튜닝한다.
- D가 1건이라도 나오면 해당 엔트리의 `published`를 `reviewed`로 강등하고 원인을 기록한다.
- A만 모인 엔트리는 장기적으로 `body.long`을 보강할 후보가 된다.

## 5. 현재 상태 (2026-09-15)

- `reviewed` 155건 / `published` 0건
- 코드 기반 페르소나 검수 r1·r2 완료 (`content/reviews/`)
- 실제 전문가 대조 검수: **미착수** — 체크리스트·fixture 준비 완료, 검수자 섭외가 다음 행동
- 상담사 베타: **미착수** — 수집 양식 준비 완료, 베타 상담사 모집이 다음 행동
