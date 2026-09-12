// @TASK P4-R2-T1 - 토정비결(土亭秘訣) 엔진
// @SPEC docs/planning/02-trd.md#토정비결-엔진
// @TEST tests/engine/tojeong.test.ts

import type { TojeongResult, TojeongGwae } from '@/engine/types';
import { NAPEUM_OHAENG_TABLE, TOJEONG_DATA } from './data';

/** 60갑자 주기의 기준 갑자년 */
const BASE_GAPJA_YEAR = 1984;

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

/**
 * 60갑자 납음오행 수를 반환한다.
 *
 * 각 연도의 60갑자 인덱스로 납음오행 테이블을 조회하여
 * 금(4), 수(1), 목(3), 화(2), 토(5) 중 하나를 반환한다.
 *
 * @param year - 음력 기준 연도
 * @returns 납음오행 수 (1~5)
 */
export function getNapEumNumber(year: number): number {
  const index = getGapjaIndex(year);
  return NAPEUM_OHAENG_TABLE[index];
}

/**
 * 상괘(上卦)를 계산한다.
 *
 * 전통 토정비결에서 상괘는 **대상 연도(太歲)**의 납음오행 수를 사용한다.
 * 이렇게 해야 매년 다른 운세가 산출된다.
 * 범위: 1(수) ~ 5(토)
 *
 * @param targetYear - 운세를 보려는 대상 연도
 * @returns 상괘 (1~5)
 */
export function calculateSangGwae(targetYear: number): number {
  return getNapEumNumber(targetYear);
}

/**
 * 중괘(中卦)를 계산한다.
 *
 * 음력 월을 8로 나눈 나머지를 사용한다.
 * 나머지가 0이면 8으로 치환한다.
 * 범위: 1~8
 *
 * @param lunarMonth - 음력 월 (1~12)
 * @returns 중괘 (1~8)
 */
export function calculateJungGwae(lunarMonth: number): number {
  const remainder = lunarMonth % 8;
  return remainder === 0 ? 8 : remainder;
}

/**
 * 하괘(下卦)를 계산한다.
 *
 * 음력 일을 8로 나눈 나머지를 사용한다.
 * 나머지가 0이면 8으로 치환한다.
 * 범위: 1~8
 *
 * @param lunarDay - 음력 일 (1~30)
 * @returns 하괘 (1~8)
 */
export function calculateHaGwae(lunarDay: number): number {
  const remainder = lunarDay % 8;
  return remainder === 0 ? 8 : remainder;
}

/**
 * 상중하 괘 조합으로 144괘 중 괘 번호를 산출한다.
 *
 * 공식: ((상괘-1) * 32 + (중괘-1) * 4 + ((하괘-1) % 4)) % 144 + 1
 *
 * 이 공식은 상괘(1~5), 중괘(1~8), 하괘(1~8) 조합을 1~144 범위로 매핑한다.
 * 하괘 8개를 4개씩 2그룹으로 묶어 동일 상중 조합에서 해설 단위를 축소한다.
 *
 * @param sang - 상괘 (1~5)
 * @param jung - 중괘 (1~8)
 * @param ha - 하괘 (1~8)
 * @returns 괘 번호 (1~144)
 */
export function calculateGwaeNumber(sang: number, jung: number, ha: number): number {
  const raw = (sang - 1) * 32 + (jung - 1) * 4 + ((ha - 1) % 4);
  return (raw % 144) + 1;
}

/**
 * 토정비결 전체 분석을 수행한다.
 *
 * 생년(음력), 생월(음력), 생일(음력), 대상 연도를 받아
 * 상중하 3괘를 계산하고 144괘 해설 데이터에서 해석을 조회한다.
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
  const sangGwae = calculateSangGwae(targetYear);
  const jungGwae = calculateJungGwae(birthMonth);
  const haGwae = calculateHaGwae(birthDay);
  const gwaeNumber = calculateGwaeNumber(sangGwae, jungGwae, haGwae);
  const gwaeCode = `${sangGwae}-${jungGwae}-${haGwae}`;

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
