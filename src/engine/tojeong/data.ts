// @TASK P6-R1-T1 - 토정비결 144괘 원문 해설 데이터 (통합)
// @SPEC docs/planning/06-tasks.md#P6-R1-T1

import type { TojeongInterpretation } from '@/engine/types';
import { TOJEONG_DATA_1 } from './data-1';
import { TOJEONG_DATA_2 } from './data-2';
import { TOJEONG_DATA_3 } from './data-3';

/**
 * 60갑자 납음오행(納音五行) 매핑 테이블
 *
 * 60갑자의 순서 인덱스(0~59)를 2로 나눈 몫(0~29)으로 납음오행 수를 매핑한다.
 * 각 쌍(甲子/乙丑, 丙寅/丁卯, ...)이 동일한 납음오행을 공유한다.
 *
 * 인덱스 계산: (연도 - 기준갑자년) % 60
 * 기준 갑자년: 1984
 */
export const NAPEUM_OHAENG_TABLE: readonly number[] = [
  4, 4, 2, 2, 3, 3, 5, 5, 4, 4, 2, 2, 1, 1, 5, 5, 4, 4, 3, 3,
  1, 1, 5, 5, 2, 2, 3, 3, 1, 1, 4, 4, 2, 2, 3, 3, 5, 5, 4, 4,
  2, 2, 1, 1, 5, 5, 4, 4, 3, 3, 1, 1, 5, 5, 2, 2, 3, 3, 1, 1,
];

/**
 * 납음오행 수에 대한 한국어 이름 매핑
 */
export const NAPEUM_NAMES: Record<number, string> = {
  1: '수(水)',
  2: '화(火)',
  3: '목(木)',
  4: '금(金)',
  5: '토(土)',
};

/**
 * 144괘 해설 데이터 (1~144)
 *
 * 각 괘별 고유한 원문 해설을 포함합니다.
 * data-1.ts (1~48), data-2.ts (49~96), data-3.ts (97~144)에서 통합합니다.
 */
export const TOJEONG_DATA: Record<number, TojeongInterpretation> = {
  ...TOJEONG_DATA_1,
  ...TOJEONG_DATA_2,
  ...TOJEONG_DATA_3,
};
