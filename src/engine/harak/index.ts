// @TASK P7-R3-T1 - 하락리수(河洛理數) 계산 엔진
// @SPEC docs/planning/02-trd.md#하락리수-엔진

import type { Ohaeng, Trigram, HarakResult } from '@/engine/types';
import { ManseryeokRangeError, ManseryeokDataError } from '@/engine/core/errors';
import {
  CHEONGAN_MAP,
  JIJI_MAP,
  HADO_OHAENG,
  HADO_DIRECTION,
  NAKSEO_POSITION,
  TRIGRAMS,
  HADO_TO_TRIGRAM,
  NAKSEO_TO_TRIGRAM,
  HEXAGRAM_DATA,
  HEXAGRAM_BY_NUMBER,
} from './data';

/**
 * 천간수를 계산한다.
 *
 * 연도의 끝자리(연도 % 10)를 천간 순서(1~10)로 변환한다.
 * 4=갑(1), 5=을(2), 6=병(3), 7=정(4), 8=무(5),
 * 9=기(6), 0=경(7), 1=신(8), 2=임(9), 3=계(10)
 *
 * @param year - 연도
 * @returns 천간수 (1~10)
 */
export function calculateCheongansu(year: number): number {
  const lastDigit = ((year % 10) + 10) % 10;
  return CHEONGAN_MAP[lastDigit];
}

/**
 * 지지수를 계산한다.
 *
 * 연도 % 12 나머지를 지지 순서(1~12)로 변환한다.
 * 기준: 1984(갑자년)에서 year%12=4 -> 자(1)
 *
 * @param year - 연도
 * @returns 지지수 (1~12)
 */
export function calculateJijisu(year: number): number {
  const remainder = ((year % 12) + 12) % 12;
  return JIJI_MAP[remainder];
}

/**
 * 년수를 계산한다.
 *
 * 천간수 + 지지수 합을 반환한다.
 *
 * @param year - 연도
 * @returns 년수 (천간수 + 지지수)
 */
export function calculateYearNumber(year: number): number {
  return calculateCheongansu(year) + calculateJijisu(year);
}

/**
 * 월수를 계산한다.
 *
 * 생월을 그대로 사용한다.
 *
 * @param month - 월 (1~12)
 * @returns 월수
 */
export function calculateMonthNumber(month: number): number {
  return month;
}

/**
 * 일수를 계산한다.
 *
 * 생일을 그대로 사용한다.
 *
 * @param day - 일 (1~31)
 * @returns 일수
 */
export function calculateDayNumber(day: number): number {
  return day;
}

/**
 * 하도수를 계산한다.
 *
 * (년수 + 월수 + 일수) % 10 으로 하도수를 구한다.
 * 결과가 0이면 10을 사용한다.
 *
 * @param year - 연도
 * @param month - 월
 * @param day - 일
 * @returns 하도수 (1~10)
 */
export function calculateHadosu(year: number, month: number, day: number): number {
  const total = calculateYearNumber(year) + calculateMonthNumber(month) + calculateDayNumber(day);
  const remainder = total % 10;
  return remainder === 0 ? 10 : remainder;
}

/**
 * 하도수의 오행을 반환한다.
 *
 * 1,6=수(水), 2,7=화(火), 3,8=목(木), 4,9=금(金), 5,10=토(土)
 *
 * @param hadosu - 하도수 (1~10)
 * @returns 오행
 */
export function getHadoOhaeng(hadosu: number): Ohaeng {
  return HADO_OHAENG[hadosu];
}

/**
 * 하도수의 방위를 반환한다.
 *
 * 1,6=북, 2,7=남, 3,8=동, 4,9=서, 5,10=중앙
 *
 * @param hadosu - 하도수 (1~10)
 * @returns 방위
 */
export function getHadoDirection(hadosu: number): string {
  return HADO_DIRECTION[hadosu];
}

/**
 * 낙서수를 계산한다.
 *
 * (년수 + 월수 + 일수) % 9 로 낙서수를 구한다.
 * 결과가 0이면 9를 사용한다.
 *
 * @param year - 연도
 * @param month - 월
 * @param day - 일
 * @returns 낙서수 (1~9)
 */
export function calculateNakseosu(year: number, month: number, day: number): number {
  const total = calculateYearNumber(year) + calculateMonthNumber(month) + calculateDayNumber(day);
  const remainder = total % 9;
  return remainder === 0 ? 9 : remainder;
}

/**
 * 낙서수의 3x3 매직 스퀘어 위치를 반환한다.
 *
 * @param nakseosu - 낙서수 (1~9)
 * @returns 위치 문자열
 */
export function getNakseoPosition(nakseosu: number): string {
  return NAKSEO_POSITION[nakseosu];
}

/**
 * 하도수를 팔괘(八卦)로 변환한다.
 *
 * 하도 오행을 대표 팔괘로 매핑:
 * 수(1,6) -> 감, 화(2,7) -> 리, 목(3,8) -> 진,
 * 금(4,9) -> 태, 토(5,10) -> 곤
 *
 * @param hadosu - 하도수 (1~10)
 * @returns Trigram 객체
 */
export function getTrigramFromHado(hadosu: number): Trigram {
  const trigramNumber = HADO_TO_TRIGRAM[hadosu];
  return { ...TRIGRAMS[trigramNumber] };
}

/**
 * 낙서수를 팔괘(八卦)로 변환한다.
 *
 * 후천팔괘(문왕팔괘) 배치 사용:
 * 1=감, 2=곤, 3=진, 4=손, 5=곤(중앙 대용),
 * 6=건, 7=태, 8=간, 9=리
 *
 * @param nakseosu - 낙서수 (1~9)
 * @returns Trigram 객체
 */
export function getTrigramFromNakseo(nakseosu: number): Trigram {
  const trigramNumber = NAKSEO_TO_TRIGRAM[nakseosu];
  return { ...TRIGRAMS[trigramNumber] };
}

/**
 * 상괘와 하괘로 64괘 번호를 도출한다.
 *
 * 선천팔괘 번호(1~8)를 조합키(상괘*10+하괘)로 만들어
 * HEXAGRAM_DATA에서 괘 번호를 조회한다.
 *
 * @param upperTrigramNumber - 상괘 번호 (1~8)
 * @param lowerTrigramNumber - 하괘 번호 (1~8)
 * @returns 64괘 번호 (1~64)
 */
export function calculateHexagramNumber(
  upperTrigramNumber: number,
  lowerTrigramNumber: number,
): number {
  for (const [name, n] of [['상괘', upperTrigramNumber], ['하괘', lowerTrigramNumber]] as const) {
    if (!Number.isInteger(n) || n < 1 || n > 8) {
      throw new ManseryeokRangeError(`${name} 번호는 1~8이어야 합니다: ${n}`, { [name]: n });
    }
  }
  // HEXAGRAM_DATA의 키 규약: 하괘번호 * 10 + 상괘번호 (괘명의 두 번째 글자가 상괘)
  const key = lowerTrigramNumber * 10 + upperTrigramNumber;
  const entry = HEXAGRAM_DATA[key];
  if (!entry) {
    throw new ManseryeokDataError(`64괘 데이터에 없는 조합입니다: 상괘 ${upperTrigramNumber}, 하괘 ${lowerTrigramNumber}`, { key });
  }
  return entry[0];
}

/**
 * 하락리수 전체 분석을 수행한다.
 *
 * 생년월일로부터 하도수/낙서수를 구하고,
 * 이를 바탕으로 상괘(하도)/하괘(낙서)를 도출하며,
 * 두 괘의 조합으로 64괘를 결정하여 해석을 제공한다.
 *
 * @param year - 생년
 * @param month - 생월 (1~12)
 * @param day - 생일 (1~31)
 * @returns HarakResult
 */
export function calculateHarak(year: number, month: number, day: number): HarakResult {
  // 1. 하도수 계산
  const hadosu = calculateHadosu(year, month, day);
  const hadoOhaeng = getHadoOhaeng(hadosu);
  const hadoDirection = getHadoDirection(hadosu);

  // 2. 낙서수 계산
  const nakseosu = calculateNakseosu(year, month, day);
  const nakseoPosition = getNakseoPosition(nakseosu);

  // 3. 상괘 (하도수 기반) / 하괘 (낙서수 기반)
  const upperTrigram = getTrigramFromHado(hadosu);
  const lowerTrigram = getTrigramFromNakseo(nakseosu);

  // 4. 64괘 도출
  const hexagramNumber = calculateHexagramNumber(
    upperTrigram.number,
    lowerTrigram.number,
  );

  // 5. 괘 이름과 해석 조회
  const hexagramInfo = HEXAGRAM_BY_NUMBER[hexagramNumber];
  const hexagramName = hexagramInfo?.name ?? `제${hexagramNumber}괘`;
  const interpretation = hexagramInfo?.interpretation ?? '해석 데이터를 찾을 수 없습니다.';

  return {
    hadosu,
    hadoOhaeng,
    hadoDirection,
    nakseosu,
    nakseoPosition,
    upperTrigram,
    lowerTrigram,
    hexagramNumber,
    hexagramName,
    interpretation,
  };
}
