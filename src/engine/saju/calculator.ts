// @TASK P2-R3-T1 - 사주팔자 계산기(메인)
// @SPEC docs/planning/02-trd.md#사주팔자-계산기
// @TEST tests/engine/calculator.test.ts

import type { BirthInputData, MidnightMode, Palja } from '@/engine/types';
import { ManseryeokEngine } from '@/engine/core/manseryeok-engine';
import { createNormalizedManseryeokContext } from '@/engine/core/normalized-context';

/** 계산 옵션 */
export interface CalculateOptions {
  /** 진태양시 보정 활성화 (기본: false) */
  trueSolarTime?: boolean;
  /** 관측지 경도 (진태양시 보정 시 사용, 기본: 127.0 서울) */
  longitude?: number;
  /** 야자시/조자시 모드 (기본: 'yaja') */
  midnightMode?: MidnightMode;
}

/** 기본 옵션 */
const DEFAULT_OPTIONS: Required<CalculateOptions> = {
  trueSolarTime: false,
  longitude: 127.0,
  midnightMode: 'yaja',
};


/**
 * 생년월일시 데이터로부터 사주팔자(8글자)를 계산한다.
 */
export function calculatePalja(
  input: BirthInputData,
  options?: CalculateOptions
): Palja {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const context = createNormalizedManseryeokContext(input, opts);
  const includeTime = context.timeKnown;

  return ManseryeokEngine.getPaljaFromContext(context, includeTime);
}
