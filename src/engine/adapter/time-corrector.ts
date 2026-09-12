// @TASK P2-R3-T1 - 진태양시 보정 (경도 + 균시차)
// @SPEC docs/planning/02-trd.md#사주팔자-계산기
// @TEST tests/engine/calculator.test.ts

import { dayOfYearUtc } from '@/engine/core/temporal';

/** 한국 표준시 기준 경도 (UTC+9 = 135도) */
const KST_STANDARD_LONGITUDE = 135.0;

export interface TrueSolarCorrectionOptions {
  /** Legal standard meridian in degrees east. Defaults to KST 135°E. */
  standardLongitude?: number;
}

/** 시간 입력 */
export interface TimeInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** 진태양시 보정 결과 */
export interface CorrectedTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 날짜 변경 오프셋: -1(전날), 0(당일), +1(다음날) */
  dayOffset: number;
}

/**
 * 균시차(Equation of Time)를 분 단위로 계산한다.
 *
 * 지구 공전 궤도의 이심률과 자전축 기울기로 인해
 * 평균태양시와 진태양시 사이에 차이가 발생한다.
 * 연중 약 -14분 ~ +16분 범위로 변동한다.
 *
 * Spencer (1971) 근사식을 사용한다.
 */
export function calculateEquationOfTime(year: number, month: number, day: number): number {
  const dayOfYear = dayOfYearUtc({ year, month, day });

  // B 각도 (라디안) - Spencer 공식
  const B = ((2 * Math.PI) / 365) * (dayOfYear - 81);

  // 균시차 (분) - Spencer 근사식
  const eot =
    9.87 * Math.sin(2 * B) -
    7.53 * Math.cos(B) -
    1.5 * Math.sin(B);

  return eot;
}

/**
 * 경도 기반 진태양시 보정을 수행한다.
 *
 * 보정 순서:
 * 1. 경도 보정: (관측지 경도 - 표준시 경도) x 4분/도
 * 2. 균시차 보정: Spencer 근사식
 *
 * @param time - 입력 시간 (평균태양시 = 시계 시간)
 * @param longitude - 관측지 경도 (동경, 예: 서울 127.0)
 * @param options - 표준시 기준 경도 (기본: 135.0)
 * @returns 보정된 진태양시
 */
export function correctToTrueSolarTime(
  time: TimeInput,
  longitude: number,
  options: TrueSolarCorrectionOptions = {}
): CorrectedTime {
  const standardLongitude = options.standardLongitude ?? KST_STANDARD_LONGITUDE;

  // 1. 경도 보정분 계산
  // (관측지 경도 - 표준시 경도) * 4분/도
  const longitudeCorrection = (longitude - standardLongitude) * 4;

  // 2. 균시차 계산
  const eot = calculateEquationOfTime(time.year, time.month, time.day);

  // 3. 총 보정분 = 경도 보정 + 균시차
  const totalCorrectionMinutes = longitudeCorrection + eot;

  // 4. 원래 시간을 분으로 변환 후 보정 적용
  let totalMinutes = time.hour * 60 + time.minute + totalCorrectionMinutes;

  // 5. 날짜 경계 처리
  let dayOffset = 0;
  if (totalMinutes < 0) {
    dayOffset = -1;
    totalMinutes += 24 * 60;
  } else if (totalMinutes >= 24 * 60) {
    dayOffset = 1;
    totalMinutes -= 24 * 60;
  }

  let correctedHour = Math.floor(totalMinutes / 60);
  let correctedMinute = Math.round(totalMinutes % 60);

  if (correctedMinute === 60) {
    correctedMinute = 0;
    correctedHour += 1;
  }

  if (correctedHour === 24) {
    correctedHour = 0;
    dayOffset += 1;
  }

  return {
    year: time.year,
    month: time.month,
    day: time.day,
    hour: correctedHour,
    minute: correctedMinute,
    dayOffset,
  };
}
