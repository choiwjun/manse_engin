// @TASK P7-R4-T1 - 구성포국(九星布局) 엔진
// @SPEC docs/planning/02-trd.md#구성포국-엔진
// @TEST tests/engine/guseong.test.ts

import type { Ohaeng, GuseongStar, GugungGrid, GuseongResult } from '@/engine/types';
import {
  getGuseongStarDescription,
  getGuseongRelationDescription,
} from './interpretation-data';

// ---------- 구성(九星) 상수 ----------

/**
 * 9개의 구성 데이터.
 *
 * 각 구성은 번호(1~9), 한글 이름, 한자 이름, 오행, 색상을 가진다.
 * 인덱스 0이 1번 구성(일백수성), 인덱스 8이 9번 구성(구자화성).
 */
export const NINE_STARS: GuseongStar[] = [
  { number: 1, name: '일백수성', hanja: '一白水星', ohaeng: '수' as Ohaeng, color: '白' },
  { number: 2, name: '이흑토성', hanja: '二黑土星', ohaeng: '토' as Ohaeng, color: '黑' },
  { number: 3, name: '삼벽목성', hanja: '三碧木星', ohaeng: '목' as Ohaeng, color: '碧' },
  { number: 4, name: '사록목성', hanja: '四綠木星', ohaeng: '목' as Ohaeng, color: '綠' },
  { number: 5, name: '오황토성', hanja: '五黃土星', ohaeng: '토' as Ohaeng, color: '黃' },
  { number: 6, name: '육백금성', hanja: '六白金星', ohaeng: '금' as Ohaeng, color: '白' },
  { number: 7, name: '칠적금성', hanja: '七赤金星', ohaeng: '금' as Ohaeng, color: '赤' },
  { number: 8, name: '팔백토성', hanja: '八白土星', ohaeng: '토' as Ohaeng, color: '白' },
  { number: 9, name: '구자화성', hanja: '九紫火星', ohaeng: '화' as Ohaeng, color: '紫' },
];

/**
 * 낙서(洛書) 순서: 중궁에서 출발하여 8방위를 순회하는 순서.
 *
 * 낙서 순서: 중궁(C) -> 서북(NW) -> 서(W) -> 동북(NE) -> 남(S) -> 북(N) -> 서남(SW) -> 동(E) -> 동남(SE)
 * 이 순서를 positions 배열의 인덱스로 표현:
 *   C=4, NW=8, W=5, NE=6, S=1, N=7, SW=2, E=3, SE=0
 */
const NAKSEO_POSITION_ORDER: number[] = [4, 8, 5, 6, 1, 7, 2, 3, 0];

/** 2024년 연반 중궁성 기준 */
const YEAR_REFERENCE = 2024;
const YEAR_REFERENCE_CENTER = 3;

// ---------- 유틸리티 함수 ----------

/**
 * 1~9 범위로 변환하는 유틸리티.
 * mod 9 결과가 0이면 9로 치환한다.
 */
function wrapStar(n: number): number {
  const mod = ((n - 1) % 9 + 9) % 9;
  return mod + 1;
}

// ---------- 공개 함수 ----------

/**
 * 구성 번호(1~9)로 해당 구성 객체를 조회한다.
 *
 * @param num - 구성 번호 (1~9)
 * @returns GuseongStar
 * @throws 번호가 1~9 범위 밖이면 에러
 */
export function getStarByNumber(num: number): GuseongStar {
  if (num < 1 || num > 9 || !Number.isInteger(num)) {
    throw new Error(`유효하지 않은 구성 번호: ${num}. 1~9 사이 정수여야 합니다.`);
  }
  return NINE_STARS[num - 1];
}

/**
 * 본명성(本命星)을 계산한다.
 *
 * 남성: (11 - (birthYear % 9)) % 9, 결과가 0이면 9
 * 여성: (birthYear % 9 + 4) % 9, 결과가 0이면 9
 *
 * @param birthYear - 생년 (양력 전체 연도, 예: 1990)
 * @param gender - 성별
 * @returns 본명성 GuseongStar
 */
export function calculateBonmyeongseong(
  birthYear: number,
  gender: 'male' | 'female',
): GuseongStar {
  let starNumber: number;

  if (gender === 'male') {
    starNumber = (11 - (birthYear % 9)) % 9;
  } else {
    starNumber = (birthYear % 9 + 4) % 9;
  }

  if (starNumber === 0) {
    starNumber = 9;
  }

  return getStarByNumber(starNumber);
}

/**
 * 연반(年盤) 중궁에 들어갈 구성 번호를 계산한다.
 *
 * 기준: 2024년 = 삼벽목성(3)이 중궁.
 * 매년 1씩 감소(역행). 결과가 0 이하이면 9로 순환.
 *
 * @param year - 대상 연도
 * @returns 중궁 구성 번호 (1~9)
 */
export function calculateYearCenterStar(year: number): number {
  const diff = year - YEAR_REFERENCE;
  // 역행이므로 기준에서 diff만큼 빼기
  const raw = YEAR_REFERENCE_CENTER - diff;
  // 1~9 범위로 조정
  return ((raw - 1) % 9 + 9) % 9 + 1;
}

/**
 * 월반(月盤) 중궁에 들어갈 구성 번호를 계산한다.
 *
 * 구성기학에서 월반은 연반의 중궁성과 월 번호에 따라 결정된다.
 * 일반적으로 매월 역행하며, 연도의 구성 그룹(상원/중원/하원)에 따라
 * 시작 성이 달라진다.
 *
 * 간략화된 공식:
 *   연도를 3그룹으로 나눈다 (상원/중원/하원).
 *   상원(1,4,7이 연반 중궁): 2월 시작 = 8
 *   중원(2,5,8이 연반 중궁): 2월 시작 = 5
 *   하원(3,6,9가 연반 중궁): 2월 시작 = 2
 *   이후 매월 1씩 감소(역행).
 *
 * @param year - 대상 연도
 * @param month - 대상 월 (1~12)
 * @returns 중궁 구성 번호 (1~9)
 */
export function calculateMonthCenterStar(year: number, month: number): number {
  const yearCenter = calculateYearCenterStar(year);

  // 상원/중원/하원 그룹 판별
  let febStart: number;
  if ([1, 4, 7].includes(yearCenter)) {
    febStart = 8; // 상원갑
  } else if ([2, 5, 8].includes(yearCenter)) {
    febStart = 5; // 중원갑
  } else {
    // 3, 6, 9
    febStart = 2; // 하원갑
  }

  // 2월 기준에서 월 차이만큼 역행
  const monthOffset = month - 2;
  const raw = febStart - monthOffset;
  return ((raw - 1) % 9 + 9) % 9 + 1;
}

/**
 * 일반(日盤) 중궁에 들어갈 구성 번호를 계산한다.
 *
 * 일반은 동지 이후의 날짜 수에 기반하여 9일 주기로 역행한다.
 * 간략화된 공식: 기준일(2024-01-01 = 일백수성)에서 날짜 차이를 계산,
 * 9일 주기로 역행.
 *
 * @param year - 대상 연도
 * @param month - 대상 월 (1~12)
 * @param day - 대상 일 (1~31)
 * @returns 중궁 구성 번호 (1~9)
 */
export function calculateDayCenterStar(year: number, month: number, day: number): number {
  // 기준일: 2024-01-01 = 구성 1이 중궁
  const baseDate = new Date(2024, 0, 1);
  const targetDate = new Date(year, month - 1, day);
  const diffDays = Math.round(
    (targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // 매일 1씩 역행, 9일 주기
  const raw = 1 - diffDays;
  return ((raw - 1) % 9 + 9) % 9 + 1;
}

/**
 * 구궁(九宮) 3x3 격자를 구성한다.
 *
 * 중궁에 지정된 구성 번호를 놓고, 낙서 순서대로 나머지 8성을
 * 순차적으로 배치한다.
 *
 * 낙서 순서: C(4) -> NW(8) -> W(5) -> NE(6) -> S(1) -> N(7) -> SW(2) -> E(3) -> SE(0)
 * 성 배치: centerN, centerN+1, centerN+2, ... (mod 9, 0은 9으로 치환)
 *
 * positions 배열 인덱스와 방위 매핑:
 *   index 0=SE, 1=S, 2=SW, 3=E, 4=C, 5=W, 6=NE, 7=N, 8=NW
 *
 * @param centerStarNumber - 중궁에 놓을 구성 번호 (1~9)
 * @returns GugungGrid
 */
export function buildGugungGrid(centerStarNumber: number): GugungGrid {
  const positions: GuseongStar[] = new Array(9);

  for (let i = 0; i < 9; i++) {
    const starNum = wrapStar(centerStarNumber + i);
    const posIndex = NAKSEO_POSITION_ORDER[i];
    positions[posIndex] = getStarByNumber(starNum);
  }

  return {
    positions,
    centerStar: positions[4],
  };
}

// ---------- 해석 생성 ----------

/**
 * 본명성과 연반 중궁성의 관계에 따라 간략한 해석을 생성한다.
 *
 * 오행 상생/상극 관계:
 *   상생: 목->화, 화->토, 토->금, 금->수, 수->목
 *   상극: 목->토, 토->수, 수->화, 화->금, 금->목
 */
function generateInterpretation(
  bonmyeongseong: GuseongStar,
  yearCenterStar: GuseongStar,
): string {
  const sangsaeng: Record<Ohaeng, Ohaeng> = {
    '목': '화',
    '화': '토',
    '토': '금',
    '금': '수',
    '수': '목',
  };

  const bonOhaeng = bonmyeongseong.ohaeng;
  const centerOhaeng = yearCenterStar.ohaeng;

  let relation: string;
  if (bonOhaeng === centerOhaeng) {
    relation = '비화(比和)';
  } else if (sangsaeng[bonOhaeng] === centerOhaeng) {
    relation = '설기(洩氣)';
  } else if (sangsaeng[centerOhaeng] === bonOhaeng) {
    relation = '생기(生氣)';
  } else {
    // 상극 관계 확인
    const sanggeuk: Record<Ohaeng, Ohaeng> = {
      '목': '토',
      '토': '수',
      '수': '화',
      '화': '금',
      '금': '목',
    };
    if (sanggeuk[bonOhaeng] === centerOhaeng) {
      relation = '극출(剋出)';
    } else {
      relation = '극입(剋入)';
    }
  }

  // 심화 해석 조합
  const starDesc = getGuseongStarDescription(bonmyeongseong.number);
  const relationDesc = getGuseongRelationDescription(relation);

  const lines: string[] = [
    `본명성 ${bonmyeongseong.name}(${bonmyeongseong.hanja}, ${bonmyeongseong.ohaeng})과 ` +
    `연반 중궁 ${yearCenterStar.name}(${yearCenterStar.hanja}, ${yearCenterStar.ohaeng})의 ` +
    `관계는 ${relation}입니다.`,
  ];

  if (starDesc) {
    lines.push(`\n[본명성 성향] ${starDesc.personality}`);
    lines.push(`[적성] ${starDesc.career}`);
    lines.push(`[건강] ${starDesc.health}`);
    lines.push(`[방위] ${starDesc.direction}`);
    lines.push(`[대인관계] ${starDesc.relationship}`);
    lines.push(`[조언] ${starDesc.advice}`);
  }

  if (relationDesc) {
    lines.push(`\n[운세 흐름] ${relationDesc}`);
  }

  return lines.join('\n');
}

// ---------- 메인 계산 함수 ----------

/**
 * 구성포국(九星布局) 전체 계산을 수행한다.
 *
 * 생년과 성별로 본명성을 구하고, 대상 연도/월/일의 구궁 배치(연반/월반/일반)를
 * 계산하여 종합 결과를 반환한다.
 *
 * @param birthYear - 생년 (양력 전체 연도, 예: 1990)
 * @param gender - 성별
 * @param targetYear - 연반 대상 연도 (미지정 시 현재 연도)
 * @param targetMonth - 월반 대상 월 (미지정 시 현재 월)
 * @param targetDay - 일반 대상 일 (미지정 시 현재 일)
 * @returns GuseongResult
 */
export function calculateGuseong(
  birthYear: number,
  gender: 'male' | 'female',
  targetYear?: number,
  targetMonth?: number,
  targetDay?: number,
): GuseongResult {
  const now = new Date();
  const year = targetYear ?? now.getFullYear();
  const month = targetMonth ?? (now.getMonth() + 1);
  const day = targetDay ?? now.getDate();

  const bonmyeongseong = calculateBonmyeongseong(birthYear, gender);

  const yearCenterNum = calculateYearCenterStar(year);
  const yearChart = buildGugungGrid(yearCenterNum);

  const monthCenterNum = calculateMonthCenterStar(year, month);
  const monthChart = buildGugungGrid(monthCenterNum);

  const dayCenterNum = calculateDayCenterStar(year, month, day);
  const dailyChart = buildGugungGrid(dayCenterNum);

  const interpretation = generateInterpretation(
    bonmyeongseong,
    getStarByNumber(yearCenterNum),
  );

  return {
    birthYear,
    gender,
    bonmyeongseong,
    yearChart,
    monthChart,
    dailyChart,
    interpretation,
  };
}
