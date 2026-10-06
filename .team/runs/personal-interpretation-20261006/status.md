# 토정비결·작명 풀이엔진 연결

- 범위 승인: 사용자 “풀이엔진에도 토정비결 작명을 추가해줘”. 기존 승인 명세의 풀이 계층·상담 연결 확장.
- 명세: docs/planning/tojeong-naming.md
- 명세 SHA-256: 9f63507c02e37bbbc25c719349d6600fd3f1ea8c7747202573eb364307ac8855
- 소유 경로: src/engine/interpretation, 엔진 공개 barrel, workspace adapter/server/views, 관련 테스트·문서. 기존 턴의 계산/DB 변경 보존. 에이전트 위임 없음.

## 구현
- interpretTojeong, renderTojeongMarkdown/Html 및 공개 타입 추가. 개인 입력·괘·산식·윤달/말일·정책을 설명하며 미검증 보관 문구는 소비하지 않음.
- interpretName/Naming 및 사주 교차 변형에 정책·획수·사격/오격·자원오행·추천 근거 반영. 기존 한글 분석 호환 유지.
- 상담 주제에 토정비결·작명 추가. 해당 고객의 모듈별 최신 계산으로 초안 생성. 누락/출생정보 변경/구 정책은 생성 전 거부. 중복 선택 중복 생성 방지.
- 기존 검수 상태와 리포트 게이트 유지. generateTopicDrafts의 비동기 검증에 맞춰 서버 호출 await.
- 고객 문장에 옮겨지는 용신 설명의 “반드시 필요하다”를 전통 해석으로 완화.

## 실행 증거
- 변경 전 새 공개 API 테스트 2건 실패 확인: interpretTojeong 부재, 한자 획수 풀이 부재.
- 최종 npm test: 엔진/플랫폼 104개 테스트 통과(55+9+1+4+35), smoke 및 콘텐츠 검증 통과. full-tests.log, exit 0.
- workspace-qa.log: 서비스 4개 테스트 및 HTTP 72 PASS / 0 FAIL. 토정/작명 승인 후 공개 리포트 포함 확인.
- browser.json, desktop.png, mobile.png: Chromium에서 사주 계산 없이 토정·작명 두 초안 생성, 명시적 label, 390px 키보드 탭 순서, 브라우저 오류 없음.
- 최종 CommonJS export 직접 호출 및 git diff --check 통과. HTML title/브랜드 escape 테스트 통과.
- 최종 workspace QA 재실행: 서비스 4개 테스트 및 HTTP 72개 모두 통과, exit 0.
- 인수 판정: 위 승인 범위 PASS.

## 제한
토정 연간·월별 운세 원문은 미검증이므로 계속 비노출. 작명 추천은 기존 편집 후보군 60자 범위이며 신고 허용 여부를 보증하지 않음. 배포·커밋 없음.
