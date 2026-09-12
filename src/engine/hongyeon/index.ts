// @TASK P7-R1-T1 - 홍연기문(洪衍奇門) 계산 엔진
// @SPEC docs/planning/02-trd.md#홍연기문-엔진

import type { Ohaeng, Palja } from '@/engine/types';

// ---------- 공개 타입 정의 ----------

/** 홍연기문 전체 분석 결과 */
export interface HongyeonResult {
  /** 선천수: 4주 천간의 하도수 합 */
  seoncheonsu: number;
  /** 홍국수: 선천수 % 9 (0이면 9), 범위 1-9 */
  hongguksu: number;
  /** 본명성 이름 (예: 일백수성(一白水星)) */
  bonmyeongseong: string;
  /** 본명성의 오행 */
  bonmyeongOhaeng: Ohaeng;
  /** 구궁 배치 (9개 위치) */
  gugung: GugungPosition[];
  /** 통기도: 인접 구궁 간 오행 흐름 분석 */
  tonggido: TonggiEntry[];
  /** 종합 해석 텍스트 */
  interpretation: string;
}

/** 구궁의 한 위치 */
export interface GugungPosition {
  /** 위치 번호 (1-9), 낙서 구궁 위치 */
  position: number;
  /** 구성 이름 */
  star: string;
  /** 해당 구성의 오행 */
  ohaeng: Ohaeng;
  /** 중궁(5번 위치) 여부 */
  isCenter: boolean;
}

/** 통기도 한 항목: 인접 위치 간 오행 관계 */
export interface TonggiEntry {
  /** 출발 오행 */
  from: Ohaeng;
  /** 도착 오행 */
  to: Ohaeng;
  /** 관계: 상생(생해주는), 상극(극하는), 비화(같은 오행) */
  relation: '상생' | '상극' | '비화';
}

// ---------- 상수 데이터 ----------

/**
 * 천간별 하도수(河圖數) 매핑
 *
 * 甲/己 = 1, 乙/庚 = 2, 丙/辛 = 3, 丁/壬 = 4, 戊/癸 = 5
 * 이 수는 선천수를 구성하는 기본 단위이다.
 */
const HADOSU_MAP: Record<string, number> = {
  '甲': 1, '己': 1,
  '乙': 2, '庚': 2,
  '丙': 3, '辛': 3,
  '丁': 4, '壬': 4,
  '戊': 5, '癸': 5,
};

/**
 * 구성(九星) 정보 배열 (인덱스 0 = 1번 구성)
 *
 * 각 구성의 이름과 오행:
 *   1: 일백수성 - 수
 *   2: 이흑토성 - 토
 *   3: 삼벽목성 - 목
 *   4: 사록목성 - 목
 *   5: 오황토성 - 토
 *   6: 육백금성 - 금
 *   7: 칠적금성 - 금
 *   8: 팔백토성 - 토
 *   9: 구자화성 - 화
 */
const GUSEONG_DATA: ReadonlyArray<{ name: string; ohaeng: Ohaeng }> = [
  { name: '일백수성(一白水星)', ohaeng: '수' },
  { name: '이흑토성(二黑土星)', ohaeng: '토' },
  { name: '삼벽목성(三碧木星)', ohaeng: '목' },
  { name: '사록목성(四綠木星)', ohaeng: '목' },
  { name: '오황토성(五黃土星)', ohaeng: '토' },
  { name: '육백금성(六白金星)', ohaeng: '금' },
  { name: '칠적금성(七赤金星)', ohaeng: '금' },
  { name: '팔백토성(八白土星)', ohaeng: '토' },
  { name: '구자화성(九紫火星)', ohaeng: '화' },
];

/**
 * 낙서(洛書) 구궁 기본 배열
 *
 * 위치 번호는 1-9이며 배열 인덱스에 대응:
 *   인덱스: 0=위치1, 1=위치2, ..., 8=위치9
 *
 * 기본 낙서 구궁 배치 (5가 중앙):
 *   4 9 2
 *   3 5 7
 *   8 1 6
 *
 * 위치 매핑:
 *   position 1 = 하단 중앙 (북)  -> 별 1
 *   position 2 = 상단 우측 (남서) -> 별 2
 *   position 3 = 중단 좌측 (동)  -> 별 3
 *   position 4 = 상단 좌측 (남동) -> 별 4
 *   position 5 = 중앙 (중궁)     -> 별 5
 *   position 6 = 하단 우측 (북서) -> 별 6
 *   position 7 = 중단 우측 (서)  -> 별 7
 *   position 8 = 하단 좌측 (북동) -> 별 8
 *   position 9 = 상단 중앙 (남)  -> 별 9
 */
const NAKSEO_BASE: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * 낙서 구궁에서 인접한 위치 쌍
 *
 * 낙서 배열:
 *   4 9 2
 *   3 5 7
 *   8 1 6
 *
 * 인접 관계 (상하좌우 + 대각):
 *   위치 5(중궁)는 모든 주변 위치와 인접
 *   모서리 위치는 인접한 변 + 중궁과 연결
 */
const ADJACENT_PAIRS: ReadonlyArray<[number, number]> = [
  // 중궁(5)과 주변 8방 연결
  [5, 1], [5, 2], [5, 3], [5, 4],
  [5, 6], [5, 7], [5, 8], [5, 9],
  // 낙서 배열 기준 수평 인접
  // 상단: 4-9, 9-2
  [4, 9], [9, 2],
  // 중단: 3-7 (3-5, 5-7은 이미 포함)
  [3, 7],
  // 하단: 8-1, 1-6
  [8, 1], [1, 6],
  // 수직 인접
  // 좌: 4-3, 3-8
  [4, 3], [3, 8],
  // 중: 9-1 (9-5, 5-1은 이미 포함)
  [9, 1],
  // 우: 2-7, 7-6
  [2, 7], [7, 6],
];

/**
 * 오행 상생 쌍 (방향 있음)
 *
 * 목->화, 화->토, 토->금, 금->수, 수->목
 */
const SANGSAENG_PAIRS: ReadonlySet<string> = new Set([
  '목-화', '화-토', '토-금', '금-수', '수-목',
]);

/**
 * 본명성별 해석 텍스트
 */
const INTERPRETATION_DATA: Record<number, string> = {
  1: '일백수성은 물의 기운을 받아 지혜롭고 유연하며, 주변 환경에 잘 적응합니다. 학문과 예술에 재능이 있으며, 인간관계에서 포용력이 뛰어납니다. 다만 우유부단할 수 있으니 결단력을 기르는 것이 좋습니다.',
  2: '이흑토성은 대지의 기운을 받아 성실하고 안정적입니다. 내조의 덕이 있으며, 꾸준한 노력으로 성과를 이룹니다. 다만 보수적 성향이 강할 수 있으니 변화에 유연하게 대처하는 것이 좋습니다.',
  3: '삼벽목성은 나무의 기운을 받아 활발하고 진취적입니다. 새로운 시작과 도전에 강하며, 성장과 발전의 에너지가 넘칩니다. 다만 성급할 수 있으니 인내심을 기르는 것이 좋습니다.',
  4: '사록목성은 부드러운 나무의 기운을 받아 온화하고 사교적입니다. 인간관계가 원만하며, 문학이나 교육 분야에 재능이 있습니다. 다만 우유부단할 수 있으니 주관을 세우는 것이 좋습니다.',
  5: '오황토성은 중앙 대지의 기운을 받아 강한 리더십과 통솔력을 가집니다. 큰 포부가 있으며 주변에 영향력을 미칩니다. 다만 독선적일 수 있으니 겸손함을 유지하는 것이 좋습니다.',
  6: '육백금성은 하늘의 금기운을 받아 품위 있고 결단력이 있습니다. 리더십과 지도력이 뛰어나며, 정의감이 강합니다. 다만 완벽주의적 성향이 있으니 타인을 배려하는 것이 좋습니다.',
  7: '칠적금성은 붉은 금기운을 받아 사교적이고 즐거움을 추구합니다. 말재주가 좋고 유머 감각이 뛰어납니다. 다만 향락에 빠지기 쉬우니 절제하는 것이 좋습니다.',
  8: '팔백토성은 산의 기운을 받아 의지가 굳고 변함없습니다. 재물운이 좋으며, 축적과 저축에 능합니다. 다만 고집이 셀 수 있으니 유연한 사고를 기르는 것이 좋습니다.',
  9: '구자화성은 불의 기운을 받아 총명하고 화려합니다. 예술적 감각이 뛰어나고 직관력이 좋습니다. 다만 감정 기복이 있을 수 있으니 안정을 추구하는 것이 좋습니다.',
};

// ---------- 공개 함수 ----------

/**
 * 천간에 대응하는 하도수(河圖數)를 반환한다.
 *
 * 甲/己=1, 乙/庚=2, 丙/辛=3, 丁/壬=4, 戊/癸=5
 * 유효하지 않은 천간이면 0을 반환한다.
 *
 * @param gan - 천간 한자 (甲~癸)
 * @returns 하도수 (1~5), 유효하지 않으면 0
 */
export function getHadosuForGan(gan: string): number {
  return HADOSU_MAP[gan] ?? 0;
}

/**
 * 팔자에서 선천수(先天數)를 계산한다.
 *
 * 년간, 월간, 일간, 시간의 하도수를 모두 합산한다.
 * 시간이 없으면(hourGan이 빈 문자열) 3주의 하도수만 합산한다.
 *
 * @param palja - 사주팔자 (Palja 타입)
 * @returns 선천수 (합산값)
 */
export function calculateSeoncheonsu(palja: Palja): number {
  const yearHadosu = getHadosuForGan(palja.yearGan);
  const monthHadosu = getHadosuForGan(palja.monthGan);
  const dayHadosu = getHadosuForGan(palja.dayGan);
  const hourHadosu = getHadosuForGan(palja.hourGan);

  return yearHadosu + monthHadosu + dayHadosu + hourHadosu;
}

/**
 * 선천수에서 홍국수(洪局數)를 계산한다.
 *
 * 선천수를 9로 나눈 나머지를 사용한다.
 * 나머지가 0이면 9로 치환한다.
 * 결과 범위: 1~9
 *
 * @param seoncheonsu - 선천수
 * @returns 홍국수 (1~9)
 */
export function calculateHongguksu(seoncheonsu: number): number {
  const remainder = seoncheonsu % 9;
  return remainder === 0 ? 9 : remainder;
}

/**
 * 홍국수에서 본명성(本命星) 정보를 반환한다.
 *
 * 홍국수 1~9에 대응하는 구성(九星)의 이름과 오행을 반환한다.
 *
 * @param hongguksu - 홍국수 (1~9)
 * @returns 본명성 이름과 오행
 */
export function getBonmyeongseong(hongguksu: number): { name: string; ohaeng: Ohaeng } {
  const data = GUSEONG_DATA[hongguksu - 1];
  return { name: data.name, ohaeng: data.ohaeng };
}

/**
 * 홍국수를 기반으로 구궁(九宮) 배치를 구성한다.
 *
 * 기본 낙서 배열에서 홍국수(본명성)가 중궁에 오도록 모든 별을 회전한다.
 * 기본 낙서의 중궁 별은 5이므로, 차이(offset = hongguksu - 5)만큼
 * 각 위치의 별 번호를 이동시킨다.
 *
 * 회전 공식: newStar = ((baseStar + offset - 1) % 9 + 9) % 9 + 1
 *
 * @param hongguksu - 홍국수 (1~9), 중궁에 배치할 별 번호
 * @returns 9개 위치의 구궁 배치 배열
 */
export function buildGugung(hongguksu: number): GugungPosition[] {
  const offset = hongguksu - 5;

  return NAKSEO_BASE.map((baseStar, index) => {
    const position = index + 1;
    // 각 위치에 배치될 별 번호 계산
    const newStar = ((baseStar + offset - 1) % 9 + 9) % 9 + 1;
    const starData = GUSEONG_DATA[newStar - 1];

    return {
      position,
      star: starData.name,
      ohaeng: starData.ohaeng,
      isCenter: position === 5,
    };
  });
}

/**
 * 구궁 배치에서 통기도(通氣道)를 분석한다.
 *
 * 낙서 구궁의 인접한 위치 쌍에 대해 오행 관계를 판별한다.
 * - 상생: 목->화, 화->토, 토->금, 금->수, 수->목
 * - 상극: 상생도 비화도 아닌 관계
 * - 비화: 같은 오행
 *
 * @param positions - 구궁 배치 (9개)
 * @returns 통기 엔트리 배열
 */
export function analyzeTonggido(positions: GugungPosition[]): TonggiEntry[] {
  const positionMap = new Map<number, GugungPosition>();
  for (const pos of positions) {
    positionMap.set(pos.position, pos);
  }

  const entries: TonggiEntry[] = [];

  for (const [posA, posB] of ADJACENT_PAIRS) {
    const a = positionMap.get(posA);
    const b = positionMap.get(posB);

    if (!a || !b) continue;

    const relation = getOhaengRelation(a.ohaeng, b.ohaeng);
    entries.push({
      from: a.ohaeng,
      to: b.ohaeng,
      relation,
    });
  }

  return entries;
}

/**
 * 팔자에서 홍연기문 전체 분석을 수행한다.
 *
 * 1. 팔자 4주 천간에서 하도수를 추출하여 선천수를 계산
 * 2. 선천수에서 홍국수(1~9)를 도출
 * 3. 홍국수로 본명성을 결정
 * 4. 구궁을 본명성 기준으로 배치
 * 5. 통기도로 인접 구궁 간 오행 관계를 분석
 * 6. 본명성에 따른 해석 텍스트를 첨부
 *
 * @param palja - 사주팔자 (Palja)
 * @returns HongyeonResult
 */
export function analyzeHongyeon(palja: Palja): HongyeonResult {
  // 1. 선천수 계산
  const seoncheonsu = calculateSeoncheonsu(palja);

  // 2. 홍국수 계산
  const hongguksu = calculateHongguksu(seoncheonsu);

  // 3. 본명성 결정
  const bonmyeong = getBonmyeongseong(hongguksu);

  // 4. 구궁 배치
  const gugung = buildGugung(hongguksu);

  // 5. 통기도 분석
  const tonggido = analyzeTonggido(gugung);

  // 6. 해석 텍스트
  const interpretation = INTERPRETATION_DATA[hongguksu] ?? '';

  return {
    seoncheonsu,
    hongguksu,
    bonmyeongseong: bonmyeong.name,
    bonmyeongOhaeng: bonmyeong.ohaeng,
    gugung,
    tonggido,
    interpretation,
  };
}

// ---------- 내부 헬퍼 ----------

/**
 * 두 오행 간의 관계를 판별한다.
 *
 * 방향성 있는 상생: 목->화, 화->토, 토->금, 금->수, 수->목
 * 양방향 모두 상생으로 판단 (예: 화->목도 상생)
 * 같은 오행이면 비화
 * 그 외는 상극
 *
 * @param a - 첫 번째 오행
 * @param b - 두 번째 오행
 * @returns 관계
 */
function getOhaengRelation(a: Ohaeng, b: Ohaeng): '상생' | '상극' | '비화' {
  if (a === b) return '비화';

  const keyAB = `${a}-${b}`;
  const keyBA = `${b}-${a}`;

  if (SANGSAENG_PAIRS.has(keyAB) || SANGSAENG_PAIRS.has(keyBA)) {
    return '상생';
  }

  return '상극';
}
