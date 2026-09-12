// @TASK P4-R2-T1 - 토정비결(土亭秘訣) 엔진
// @SPEC docs/planning/02-trd.md#토정비결-엔진

import type { TojeongResult, TojeongGwae } from '@/engine/types';
import { ManseryeokEngine } from '@/engine/core/manseryeok-engine';
import { getLunarMonthDays, lunarToSolar } from '@/engine/core/lunar-solar';
import { ManseryeokRangeError } from '@/engine/core/errors';
import { TOJEONG_DATA } from './data';

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

/** 60갑자 주기의 기준 갑자년 */
const BASE_GAPJA_YEAR = 1984;

/**
 * 선천수(先天數): 甲己子午=9, 乙庚丑未=8, 丙辛寅申=7,
 * 丁壬卯酉=6, 戊癸辰戌=5, 巳亥=4
 */
const SEONCHEON_SU: Record<string, number> = {
  '甲': 9, '己': 9, '子': 9, '午': 9,
  '乙': 8, '庚': 8, '丑': 8, '未': 8,
  '丙': 7, '辛': 7, '寅': 7, '申': 7,
  '丁': 6, '壬': 6, '卯': 6, '酉': 6,
  '戊': 5, '癸': 5, '辰': 5, '戌': 5,
  '巳': 4, '亥': 4,
};

/**
 * 중천수(中天數): 甲己辰戌丑未=11, 乙庚申酉=10, 丙辛亥子=9,
 * 丁壬寅卯=8, 戊癸巳午=7
 */
const JUNGCHEON_SU: Record<string, number> = {
  '甲': 11, '己': 11, '辰': 11, '戌': 11, '丑': 11, '未': 11,
  '乙': 10, '庚': 10, '申': 10, '酉': 10,
  '丙': 9, '辛': 9, '亥': 9, '子': 9,
  '丁': 8, '壬': 8, '寅': 8, '卯': 8,
  '戊': 7, '癸': 7, '巳': 7, '午': 7,
};

/**
 * 연도의 60갑자 인덱스를 구한다 (0~59).
 *
 * 기준: 1984년 = 갑자년 = 인덱스 0
 * 음수 결과를 방지하기 위해 modular 연산 시 60을 더한다.
 *
 * @param year - 음력 기준 연도
 * @returns 60갑자 인덱스 (0~59)
 */
function getGapjaIndex(year: number): number {
  return ((year - BASE_GAPJA_YEAR) % 60 + 60) % 60;
}

/** 음력 연도의 세주(歲柱) 간지 */
function getYearGanji(year: number): { gan: string; ji: string } {
  const idx = getGapjaIndex(year);
  return { gan: STEMS[idx % 10], ji: BRANCHES[idx % 12] };
}

/**
 * 음력 월의 월건(月建) 간지.
 * 정월(1월)=寅월이며, 월간은 년간에 오호둔(五虎遁)을 적용한다.
 */
function getLunarMonthGanji(year: number, month: number): { gan: string; ji: string } {
  const yearStemIdx = getGapjaIndex(year) % 10;
  const firstMonthStemIdx = ((yearStemIdx % 5) * 2 + 2) % 10; // 甲己년→丙寅
  const stemIdx = (firstMonthStemIdx + month - 1) % 10;
  const branchIdx = (month + 1) % 12; // 1월→寅(2), 12월→丑(1)
  return { gan: STEMS[stemIdx], ji: BRANCHES[branchIdx] };
}

/** 태세수: 당년 세주 간지의 중천수 합 */
function getTaeseSu(year: number): number {
  const { gan, ji } = getYearGanji(year);
  return JUNGCHEON_SU[gan] + JUNGCHEON_SU[ji];
}

/** 월건수: 당년 생월 월건 간지의 선천수 합 */
function getWolgeonSu(year: number, month: number): number {
  const { gan, ji } = getLunarMonthGanji(year, month);
  return SEONCHEON_SU[gan] + SEONCHEON_SU[ji];
}

/** 일진수: 당년 생일 일진의 선천수(간)+중천수(지) 합 */
function getIljinSu(year: number, month: number, day: number): number {
  const solar = lunarToSolar({ year, month, day, isLeapMonth: false });
  const pillar = ManseryeokEngine.getSolarDayPillar(solar.year, solar.month, solar.day);
  return SEONCHEON_SU[pillar.gan] + JUNGCHEON_SU[pillar.ji];
}

/**
 * 상괘(上卦)를 계산한다.
 *
 * 전통 작괘법: 상괘 = (한국나이 + 태세수) % 8, 나머지 0이면 8.
 * 한국나이 = 대상 연도 - 생년 + 1.
 * 범위: 1~8
 *
 * @param birthYear - 음력 생년
 * @param targetYear - 운세를 보려는 대상 연도
 * @returns 상괘 (1~8)
 */
export function calculateSangGwae(birthYear: number, targetYear: number): number {
  const koreanAge = targetYear - birthYear + 1;
  const remainder = (koreanAge + getTaeseSu(targetYear)) % 8;
  return remainder === 0 ? 8 : remainder;
}

/**
 * 중괘(中卦)를 계산한다.
 *
 * 전통 작괘법: 중괘 = (당년 생월의 날수(대월 30/소월 29) + 월건수) % 6,
 * 나머지 0이면 6. 범위: 1~6
 *
 * @param targetYear - 대상 연도
 * @param lunarMonth - 음력 생월 (1~12)
 * @returns 중괘 (1~6)
 */
export function calculateJungGwae(targetYear: number, lunarMonth: number): number {
  const monthDays = getLunarMonthDays(targetYear, lunarMonth);
  const remainder = (monthDays + getWolgeonSu(targetYear, lunarMonth)) % 6;
  return remainder === 0 ? 6 : remainder;
}

/**
 * 하괘(下卦)를 계산한다.
 *
 * 전통 작괘법: 하괘 = (음력 생일수 + 일진수) % 3, 나머지 0이면 3.
 * 범위: 1~3
 *
 * @param targetYear - 대상 연도
 * @param lunarMonth - 음력 생월 (1~12)
 * @param lunarDay - 음력 생일 (1~30)
 * @returns 하괘 (1~3)
 */
export function calculateHaGwae(targetYear: number, lunarMonth: number, lunarDay: number): number {
  const remainder = (lunarDay + getIljinSu(targetYear, lunarMonth, lunarDay)) % 3;
  return remainder === 0 ? 3 : remainder;
}

/**
 * 상중하 괘로 144괘 중 괘 번호를 산출한다.
 *
 * 상괘(1~8) × 중괘(1~6) × 하괘(1~3) = 144 조합으로,
 * 번호 = (상-1)*18 + (중-1)*3 + 하 이므로 모든 조합이 충돌 없이 1~144에 대응한다.
 *
 * @param sang - 상괘 (1~8)
 * @param jung - 중괘 (1~6)
 * @param ha - 하괘 (1~3)
 * @returns 괘 번호 (1~144)
 */
export function calculateGwaeNumber(sang: number, jung: number, ha: number): number {
  return (sang - 1) * 18 + (jung - 1) * 3 + ha;
}

/**
 * 토정비결 전체 분석을 수행한다.
 *
 * 전통 작괘법(作卦法)을 사용한다:
 * - 상괘: 한국나이 + 태세수(당년 세주의 중천수 합)를 8로 나눈 나머지
 * - 중괘: 당년 생월 날수(29/30) + 월건수(생월 월건의 선천수 합)를 6으로 나눈 나머지
 * - 하괘: 음력 생일 + 일진수(당년 생일 일진의 선천수·중천수)를 3으로 나눈 나머지
 *
 * 생일이 당년 생월의 말일을 넘으면(예: 30일생인데 소월) 말일로 당겨 계산한다.
 *
 * @param birthYear - 음력 생년
 * @param birthMonth - 음력 생월 (1~12)
 * @param birthDay - 음력 생일 (1~30)
 * @param targetYear - 운세를 보려는 대상 연도
 * @returns TojeongResult
 */
export function analyzeTojeong(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  targetYear: number,
): TojeongResult {
  if (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12) {
    throw new ManseryeokRangeError(`토정비결 생월은 1~12 범위여야 합니다: ${birthMonth}`, { birthMonth });
  }
  if (!Number.isInteger(birthDay) || birthDay < 1 || birthDay > 30) {
    throw new ManseryeokRangeError(`토정비결 생일은 1~30 범위여야 합니다: ${birthDay}`, { birthDay });
  }

  const monthDays = getLunarMonthDays(targetYear, birthMonth);
  const effectiveDay = Math.min(birthDay, monthDays);

  const sangGwae = calculateSangGwae(birthYear, targetYear);
  const jungGwae = calculateJungGwae(targetYear, birthMonth);
  const haGwae = calculateHaGwae(targetYear, birthMonth, effectiveDay);
  const gwaeNumber = calculateGwaeNumber(sangGwae, jungGwae, haGwae);
  const gwaeCode = `${sangGwae}${jungGwae}${haGwae}`;

  const gwae: TojeongGwae = {
    sangGwae,
    jungGwae,
    haGwae,
    gwaeCode,
    gwaeNumber,
  };

  const interpretation = TOJEONG_DATA[gwaeNumber] ?? TOJEONG_DATA[1];

  return {
    birthYear,
    targetYear,
    gwae,
    interpretation,
  };
}
