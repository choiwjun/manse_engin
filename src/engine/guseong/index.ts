// @TASK P7-R4-T1 - 구성포국(九星布局) 엔진
// @SPEC docs/planning/02-trd.md#구성포국-엔진

import type { Ohaeng, GuseongStar, GugungGrid, GuseongResult } from '@/engine/types';
import { ManseryeokEngine } from '@/engine/core/manseryeok-engine';
import { listSolarTermsForYear } from '@/engine/core/solar-terms';
import { toJulianDay } from '@/engine/core/temporal';
import { ManseryeokDataError } from '@/engine/core/errors';
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
 * 표준 월가구성(月家九星) 규칙 — 절기월의 첫 달(寅月, 양력 2월경)의
 * 중궁성은 해의 지지 그룹으로 정한다:
 *   子·午·卯·酉년(四仲): 寅月 = 八白(8)
 *   寅·申·巳·亥년(四孟): 寅月 = 二黒(2)
 *   辰·戌·丑·未년(四季): 寅月 = 五黃(5)
 * 이후 매월 1씩 감소(역행)한다.
 *
 * 월주 간지가 주어지면 실제 절기월을 사용하고(정확),
 * 양력 월만 주어지면 근사한다(2월=寅월, …, 12월=子월, 1월=丑월+전년도).
 *
 * @param year - 대상 연도
 * @param month - 대상 월 (1~12)
 * @param monthBranch - (선택) 해당 날짜의 절기 월주 지지
 * @param yearBranch - (선택) 해당 날짜의 절기년 년주 지지
 * @returns 중궁 구성 번호 (1~9)
 */
export function calculateMonthCenterStar(
  year: number,
  month: number,
  monthBranch?: string,
  yearBranch?: string,
): number {
  let yearBranchIdx: number;
  let monthOffset: number;

  if (monthBranch) {
    const branchIdx = DAY_BRANCHES.indexOf(monthBranch as (typeof DAY_BRANCHES)[number]);
    if (branchIdx === -1) {
      throw new ManseryeokDataError(`유효하지 않은 월지입니다: ${monthBranch}`);
    }
    // 절기월 지지 인덱스에서 寅월(2)까지의 거리
    monthOffset = ((branchIdx - 2) % 12 + 12) % 12;
    // 절기년 년지가 주어지지 않으면 추정: 丑월(1)은 전년도, 나머지는 당해
    const monthYear = yearBranch
      ? undefined
      : branchIdx === 1 ? year - 1 : year;
    yearBranchIdx = yearBranch
      ? DAY_BRANCHES.indexOf(yearBranch as (typeof DAY_BRANCHES)[number])
      : ((monthYear! - 4) % 12 + 12) % 12;
    if (yearBranchIdx === -1) {
      throw new ManseryeokDataError(`유효하지 않은 년지입니다: ${yearBranch}`);
    }
  } else {
    // 양력 월 근사: 1월(丑月)은 전년도에 속한다
    const monthYear = month === 1 ? year - 1 : year;
    yearBranchIdx = ((monthYear - 4) % 12 + 12) % 12;
    monthOffset = ((month - 2) % 12 + 12) % 12;
  }
  return monthStarForYearBranch(yearBranchIdx, monthOffset);
}

function monthStarForYearBranch(yearBranchIdx: number, monthOffset: number): number {
  const inwolStart = [0, 6, 3, 9].includes(yearBranchIdx) ? 8   // 子午卯酉
    : [2, 8, 4, 10].includes(yearBranchIdx) ? 2                // 寅申巳亥
    : 5;                                                     // 辰戌丑未
  return wrapStar(inwolStart - monthOffset);
}

// ---------- 일반(日盤) 보조 ----------

const DAY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
const DAY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

/** 양력 날짜의 60갑자 일진 인덱스(0=甲子) */
function daySexagenaryIndex(year: number, month: number, day: number): number {
  const pillar = ManseryeokEngine.getSolarDayPillar(year, month, day);
  const s = DAY_STEMS.indexOf(pillar.gan as (typeof DAY_STEMS)[number]);
  const b = DAY_BRANCHES.indexOf(pillar.ji as (typeof DAY_BRANCHES)[number]);
  for (let i = 0; i < 60; i++) {
    if (i % 10 === s && i % 12 === b) return i;
  }
  throw new ManseryeokDataError(`유효하지 않은 일진: ${pillar.gan}${pillar.ji}`);
}

/**
 * 지정 절기(동지/하지)에 가장 가까운 甲子일의 율리우스일을 반환한다.
 * 甲子일은 60일 주기로 반복되므로 절기일의 일진 인덱스에서
 * 앞뒤 30일 이내의 甲子일을 찾는다.
 */
function nearestJiaziToTerm(year: number, termName: '동지' | '하지'): number {
  const term = listSolarTermsForYear(year).find((t) => t.koreanName === termName);
  if (!term) {
    throw new ManseryeokDataError(`${year}년 ${termName} 절기 데이터가 없습니다.`);
  }
  const dayIdx = daySexagenaryIndex(term.year, term.month, term.day);
  const termJd = toJulianDay(term.year, term.month, term.day);
  // 가장 가까운 甲子일: dayIdx <= 30이면 과거, 아니면 미래 쪽
  return dayIdx <= 30 ? termJd - dayIdx : termJd + (60 - dayIdx);
}

/**
 * 일반(日盤) 중궁에 들어갈 구성 번호를 계산한다.
 *
 * 표준 일가구성(日家九星) 규칙:
 *   동지에 가장 가까운 甲子일부터 양둔(陽遁) — 甲子=一白, 매일 순행(+1)
 *   하지에 가장 가까운 甲子일부터 음둔(陰遁) — 甲子=九紫, 매일 역행(-1)
 *
 * @param year - 대상 연도
 * @param month - 대상 월 (1~12)
 * @param day - 대상 일 (1~31)
 * @returns 중궁 구성 번호 (1~9)
 */
export function calculateDayCenterStar(year: number, month: number, day: number): number {
  const target = toJulianDay(year, month, day);
  const summerAnchor = nearestJiaziToTerm(year, '하지');
  const winterAnchor = nearestJiaziToTerm(year, '동지');

  if (target >= winterAnchor) {
    // 양둔: 올해 동지 기점 이후
    return wrapStar(1 + Math.round(target - winterAnchor));
  }
  if (target >= summerAnchor) {
    // 음둔: 올해 하지 기점 이후 ~ 동지 기점 전
    return wrapStar(9 - Math.round(target - summerAnchor));
  }
  // 상반년: 작년 동지/하지 기점과 비교
  const prevWinterAnchor = nearestJiaziToTerm(year - 1, '동지');
  if (target >= prevWinterAnchor) {
    return wrapStar(1 + Math.round(target - prevWinterAnchor));
  }
  const prevSummerAnchor = nearestJiaziToTerm(year - 1, '하지');
  return wrapStar(9 - Math.round(target - prevSummerAnchor));
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

  // 실제 절기년·절기월 기준으로 월반을 계산한다
  const monthPillar = ManseryeokEngine.getMonthPillar({ year, month, day });
  const yearPillar = ManseryeokEngine.getYearPillar({ year, month, day });
  const monthCenterNum = calculateMonthCenterStar(year, month, monthPillar.ji, yearPillar.ji);
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
