/** 획수와 수리/오행 해석은 독립적인 정책이다. */
export const NAMING_POLICY = {
  id: 'wonhyeong-real-strokes-v2',
  grids: '원=이름 합 · 형=성+첫 이름 · 이=성+끝 이름 · 정=전체 합',
  singleName: '외자에도 가성수(+1)를 넣지 않는 실획수 사격. 오격부상법과 구별합니다.',
  kangxi: 'Unicode 13.0 kRSKangXi: 강희 부수 원획수 + 나머지 획수',
  modern: 'Unicode 17.0 kTotalStrokes 첫 값(G 기준). 한국 자형의 통일 표준을 뜻하지 않습니다.',
  elements: '자원오행: 프로젝트 기존 분류(유파에 따라 달라질 수 있음)',
  suri81: '프로젝트 기존 81수리 길/흉 이분표 v1, 81 초과는 81 주기. 유파 공통 정답이 아닙니다.',
  registration: '인명용 한자 신고 허용 여부는 별도 확인이 필요합니다.',
} as const;
export type NamingPolicy = typeof NAMING_POLICY;
