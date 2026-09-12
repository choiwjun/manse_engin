// @TASK ZIWEI-SELF - 자미두수(紫微斗數) 자체 엔진
// @SPEC docs/planning/06-tasks.md#자미두수-자체엔진

import type { ZiweiResult } from '@/engine/types';
import { calculateZiweiSelf, calculateZiweiByLunarSelf } from './calculator';

// ---------- 시진 인덱스 매핑 ----------

const HOUR_TO_TIME_INDEX: Record<number, number> = {
  23: 0, 0: 0,   // 자시 (23~01)
  1: 1, 2: 1,    // 축시 (01~03)
  3: 2, 4: 2,    // 인시 (03~05)
  5: 3, 6: 3,    // 묘시 (05~07)
  7: 4, 8: 4,    // 진시 (07~09)
  9: 5, 10: 5,   // 사시 (09~11)
  11: 6, 12: 6,  // 오시 (11~13)
  13: 7, 14: 7,  // 미시 (13~15)
  15: 8, 16: 8,  // 신시 (15~17)
  17: 9, 18: 9,  // 유시 (17~19)
  19: 10, 20: 10, // 술시 (19~21)
  21: 11, 22: 11, // 해시 (21~23)
};

/**
 * 시간(hour)을 timeIndex(0~11)로 변환한다.
 * @param hour 0~23
 * @returns timeIndex 0~11
 */
export function hourToTimeIndex(hour: number): number {
  return HOUR_TO_TIME_INDEX[hour] ?? 0;
}

// ---------- 자체 엔진 가용성 ----------

/**
 * 자미두수 엔진 가용 여부를 반환한다.
 * 자체 엔진으로 전환되어 항상 true를 반환한다.
 */
export function isZiweiProviderAvailable(): boolean {
  return true;
}

// ---------- 공개 API ----------

/**
 * 양력 생년월일시로 자미두수 명반을 생성한다.
 *
 * @param solarDate 양력 날짜 (YYYY-M-D)
 * @param hour 시간 (0~23)
 * @param gender 성별
 * @param _fixLeap 윤달 보정 여부 (자체 엔진에서는 미사용, 호환성 유지)
 * @returns ZiweiResult
 */
export function calculateZiwei(
  solarDate: string,
  hour: number,
  gender: 'male' | 'female',
  // @ts-ignore unused param kept for API compatibility
  _fixLeap = true,
): ZiweiResult {
  return calculateZiweiSelf(solarDate, hour, gender);
}

/**
 * 음력 생년월일시로 자미두수 명반을 생성한다.
 *
 * @param lunarDate 음력 날짜 (YYYY-M-D)
 * @param hour 시간 (0~23)
 * @param gender 성별
 * @param isLeapMonth 윤달 여부 (기본: false)
 * @param _fixLeap 윤달 보정 여부 (자체 엔진에서는 미사용, 호환성 유지)
 * @returns ZiweiResult
 */
export function calculateZiweiByLunar(
  lunarDate: string,
  hour: number,
  gender: 'male' | 'female',
  isLeapMonth = false,
  // @ts-ignore unused param kept for API compatibility
  _fixLeap = true,
): ZiweiResult {
  return calculateZiweiByLunarSelf(lunarDate, hour, gender, isLeapMonth);
}

// ---------- 12궁 이름 상수 ----------

export const PALACE_NAMES = [
  '명궁', '형제', '부처', '자녀', '재백', '질액',
  '천이', '노복', '관록', '전택', '복덕', '부모',
] as const;

// ---------- 14주성 이름 상수 ----------

export const MAJOR_STAR_NAMES = [
  '자미', '천기', '태양', '무곡', '천동', '염정', '천부',
  '태음', '탐랑', '거문', '천상', '천량', '칠살', '파군',
] as const;
