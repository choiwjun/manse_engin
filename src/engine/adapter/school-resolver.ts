// @TASK P2-R3-T1 - 학파별 야자시/조자시 분기
// @SPEC docs/planning/02-trd.md#사주팔자-계산기
// @TEST tests/engine/calculator.test.ts

import type { MidnightMode } from '@/engine/types';

/** 학파 분기 결과 */
export interface SchoolResolution {
  /**
   * 간지 계산 엔진의 sect 값.
   * - sect 1: 조자시 (23:00~24:00을 다음날로 처리)
   * - sect 2: 야자시 (23:00~24:00을 당일로 처리)
   */
  sect: number;
  /**
   * 당일 일주를 사용하는지 여부.
   * false이면 시간 보정이 아닌 날짜 자체를 다음날로 이동해야 한다.
   */
  useCurrentDay: boolean;
}

/**
 * 야자시/조자시 학파에 따라 자시(23:00~01:00) 처리 방법을 결정한다.
 *
 * [야자시(夜子時)] - sect 2
 *   23:00~01:00 전체를 하나의 자시로 보되, 당일 일주를 사용한다.
 *   즉, 23:00~24:00도 당일의 자시이다.
 *
 * [조자시(早子時)] - sect 1
 *   23:00~24:00 = 전날 야자시 -> 다음날 일주를 사용
 *   00:00~01:00 = 당일 조자시 -> 당일 일주를 사용
 *
 * 자시가 아닌 시간(01:00~23:00)에는 두 학파 모두 동일하게 당일 일주를 사용한다.
 *
 * @param mode - 야자시('yaja') 또는 조자시('joja')
 * @param hour - 시간 (0~23)
 * @returns 학파 분기 결과
 */
export function resolveSchool(
  mode: MidnightMode,
  hour: number,
): SchoolResolution {
  const isZiHour = hour >= 23 || hour < 1;

  if (!isZiHour) {
    // 자시가 아닌 시간: 모드 무관하게 당일 일주
    return {
      sect: mode === 'joja' ? 1 : 2,
      useCurrentDay: true,
    };
  }

  if (mode === 'yaja') {
    // 야자시: 23:00~01:00 모두 당일 일주 사용
    return {
      sect: 2,
      useCurrentDay: true,
    };
  }

  // 조자시(joja)
  if (hour >= 23) {
    // 23:00~24:00: 다음날 일주 사용
    return {
      sect: 1,
      useCurrentDay: false,
    };
  }

  // 00:00~01:00: 당일 일주 사용
  return {
    sect: 1,
    useCurrentDay: true,
  };
}
