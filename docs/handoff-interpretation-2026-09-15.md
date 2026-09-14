# 해석 계층 핸드오프 — 2026-09-15 (6차: 조합키 2차 확장)

## 완료 사항

- **조합키 8종 확장** — 레지스트리 58→66키, detector·YAML·골든 테스트 전부 완비
  - `gwansung-gwada--daymaster-weak` (관과다×신약)
  - `insung-gwada--daymaster-strong` (인과다×신강)
  - `jaesung-nochul--daymaster-weak` (재노출×신약)
  - `gongmang-jaesung--daymaster-weak` (재공망×신약)
  - `daymaster-weak--johu-pressure` (신약×계절압박)
  - `daymaster-strong--johu-support` (신강×계절후원)
  - `wonjin--jiji-chung` (원진×충 공존)
  - `sangsaeng-saengjae--siksang-gwada` (생재×식과다)

- **원진×충 설계 결정** — 원진 6쌍과 충 6쌍은 지지 쌍이 수학적으로 분리되어 동일 자리에서 겹칠 수 없음.
  "같은 자리"가 아닌 "한 명식 안의 공존"으로 재해석하여 구현. 레지스트리 메타·YAML 문구도 이에 맞춰 작성.

- **CRLF 정규화** — `.gitattributes` 추가(`* text=auto eol=lf`), 93개 파일 LF 통일.
  이전 `git status`의 99개 modified는 대부분 줄바꿈 노이즈였음.

- **검증 통과** — `npm test` 전체 통과: 회귀 36건 + interpretation + `content:validate OK — 엔트리 66건 통과 (레지스트리 66키 중 미작성 0키)`

## 다음 작업

1. **조합키 계속 확장** — 수백 키 목표 (handoff §2.1). 현재 16개 combo 키 중 8개만 추가됨.
2. **작명·택일 해석 계층** — MVP 항목 3·4 (§2.2).
3. **시점 서사 2단계** — 월운×세운 교차, 대운 전환 6개월 전 서사 (§2.3).
4. **문서 출력** — HTML/PDF 렌더러, 상담사 브랜드 머리말 (§2.4).
5. **UI·디자인** — 전부 나중. 풀이 내용의 전문가·상용화 수준 달성이 현재 유일한 과제.

## 참고

- `packages/myeong-engine/scan-combos.mjs` — combo 발화 sampleBirth 탐색 도구 (재사용 가능)
- `content/entries/saju/combo/` — YAML 16건 (기존 8 + 신규 8)
- `src/engine/interpretation/detectors/combos.ts` — detector 간 결합 방지 원칙 유지 (원시 조건 직접 판정)

## 7차 추가 — 조합키 3차 확장 (66→74키)

- `jaesaeng-gwan--daymaster-weak` (재생관×신약)
- `sangsaeng-jesal--daymaster-strong` (식상제살×신강)
- `ohaeng-missing--daymaster-weak` (오행결핍×신약)
- `jiji-chung--daymaster-weak` (충×신약)
- `bigeop-gwada--daymaster-weak` (비겁과다×신약)
- `gwanin-sangsaeng--daymaster-strong` (관인상생×신강)
- `gongmang-gwansung--daymaster-weak` (관공망×신약)
- `siksang-gwada--daymaster-weak` (식과다×신약)

검증: `npm test` 전체 통과, `content:validate OK — 엔트리 74건 통과 (레지스트리 74키 중 미작성 0키)`
