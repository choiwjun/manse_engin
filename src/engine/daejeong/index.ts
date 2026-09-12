// @TASK P7-R5-T1 - 대정수작괘(大定數作卦) 계산 엔진
// @SPEC docs/planning/02-trd.md#대정수작괘-엔진
// @TEST tests/engine/daejeong.test.ts
//
// 소옹(邵雍)의 선천역학(先天易學)에 기반한 대정수작괘 계산.
// 사주팔자의 천간에서 선천수를, 지지에서 후천수를 추출하여
// 64괘(주역)와 변효를 도출하는 역술 엔진.

import type { Palja, DaejeongResult, TrigramInfo } from '@/engine/types';
import {
  SEONCHEONSU_MAP,
  HUCHEONSU_MAP,
  TRIGRAM_DATA,
  HEXAGRAM_TABLE,
  HEXAGRAM_DATA,
} from './data';

// ---------- 단위 함수: 선천수/후천수 조회 ----------

/**
 * 천간(天干) 한자에 대응하는 선천수(先天數)를 반환한다.
 *
 * 소옹의 선천역학에서 천간합(天干合) 쌍이 동일한 선천수를 공유한다:
 * 甲己=9, 乙庚=8, 丙辛=7, 丁壬=6, 戊癸=5
 *
 * @param gan - 천간 한자 (甲~癸)
 * @returns 선천수 (5~9), 유효하지 않은 입력은 0
 */
export function getSeoncheonsu(gan: string): number {
  return SEONCHEONSU_MAP[gan] ?? 0;
}

/**
 * 지지(地支) 한자에 대응하는 후천수(後天數)를 반환한다.
 *
 * 소옹의 후천역학에서 지지충(地支沖) 쌍이 동일한 후천수를 공유한다:
 * 子午=9, 丑未=8, 寅申=7, 卯酉=6, 辰戌=5, 巳亥=4
 *
 * @param ji - 지지 한자 (子~亥)
 * @returns 후천수 (4~9), 유효하지 않은 입력은 0
 */
export function getHucheonsu(ji: string): number {
  return HUCHEONSU_MAP[ji] ?? 0;
}

// ---------- 합산 함수 ----------

/**
 * 사주팔자의 4개 천간에서 선천수 합계를 계산한다.
 *
 * 년간 + 월간 + 일간 + 시간의 선천수를 모두 더한다.
 * 가능한 범위: 20(5*4) ~ 36(9*4)
 *
 * @param palja - 사주팔자
 * @returns 선천수 합계
 */
export function calculateSeoncheonsuTotal(palja: Palja): number {
  return (
    getSeoncheonsu(palja.yearGan) +
    getSeoncheonsu(palja.monthGan) +
    getSeoncheonsu(palja.dayGan) +
    getSeoncheonsu(palja.hourGan)
  );
}

/**
 * 사주팔자의 4개 지지에서 후천수 합계를 계산한다.
 *
 * 년지 + 월지 + 일지 + 시지의 후천수를 모두 더한다.
 * 가능한 범위: 16(4*4) ~ 36(9*4)
 *
 * @param palja - 사주팔자
 * @returns 후천수 합계
 */
export function calculateHucheonsuTotal(palja: Palja): number {
  return (
    getHucheonsu(palja.yearJi) +
    getHucheonsu(palja.monthJi) +
    getHucheonsu(palja.dayJi) +
    getHucheonsu(palja.hourJi)
  );
}

// ---------- 괘/효 계산 함수 ----------

/**
 * 선천수 합계에서 상괘(上卦)를 계산한다.
 *
 * 선천수합을 8로 나눈 나머지를 사용하며,
 * 나머지가 0이면 8(곤괘)로 치환한다.
 * 결과는 선천 팔괘수(1~8)에 대응한다.
 *
 * @param seoncheonsuTotal - 선천수 합계
 * @returns 상괘 번호 (1~8)
 */
export function calculateUpperTrigram(seoncheonsuTotal: number): number {
  const remainder = seoncheonsuTotal % 8;
  return remainder === 0 ? 8 : remainder;
}

/**
 * 후천수 합계에서 하괘(下卦)를 계산한다.
 *
 * 후천수합을 8로 나눈 나머지를 사용하며,
 * 나머지가 0이면 8(곤괘)로 치환한다.
 * 결과는 선천 팔괘수(1~8)에 대응한다.
 *
 * @param hucheonsuTotal - 후천수 합계
 * @returns 하괘 번호 (1~8)
 */
export function calculateLowerTrigram(hucheonsuTotal: number): number {
  const remainder = hucheonsuTotal % 8;
  return remainder === 0 ? 8 : remainder;
}

/**
 * 변효(變爻)를 계산한다.
 *
 * (선천수합 + 후천수합)을 6으로 나눈 나머지를 사용하며,
 * 나머지가 0이면 6(상효)으로 치환한다.
 * 결과는 6효 중 변하는 효의 위치(1=초효 ~ 6=상효)이다.
 *
 * @param seoncheonsuTotal - 선천수 합계
 * @param hucheonsuTotal - 후천수 합계
 * @returns 변효 번호 (1~6)
 */
export function calculateChangingLine(
  seoncheonsuTotal: number,
  hucheonsuTotal: number,
): number {
  const total = seoncheonsuTotal + hucheonsuTotal;
  const remainder = total % 6;
  return remainder === 0 ? 6 : remainder;
}

// ---------- 팔괘/64괘 정보 조회 ----------

/**
 * 선천 팔괘수에 대응하는 팔괘 정보를 반환한다.
 *
 * @param trigramNumber - 팔괘수 (1~8)
 * @returns TrigramInfo (이름, 한자, 오행)
 */
export function getTrigramInfo(trigramNumber: number): TrigramInfo {
  if (trigramNumber < 1 || trigramNumber > 8) {
    return TRIGRAM_DATA[0];
  }
  return TRIGRAM_DATA[trigramNumber];
}

/**
 * 상괘와 하괘 조합으로 64괘 번호를 반환한다.
 *
 * 주역 서괘전(序卦傳) 순서에 따른 64괘 배열 테이블을 참조한다.
 * HEXAGRAM_TABLE[상괘][하괘] 형태로 조회한다.
 *
 * @param upperTrigramNumber - 상괘 선천팔괘수 (1~8)
 * @param lowerTrigramNumber - 하괘 선천팔괘수 (1~8)
 * @returns 64괘 번호 (1~64)
 */
export function getHexagramNumber(
  upperTrigramNumber: number,
  lowerTrigramNumber: number,
): number {
  return HEXAGRAM_TABLE[upperTrigramNumber][lowerTrigramNumber];
}

// ---------- 메인 분석 함수 ----------

/**
 * 대정수작괘(大定數作卦) 전체 분석을 수행한다.
 *
 * 사주팔자(8글자)를 입력받아 다음 과정을 수행한다:
 * 1. 4개 천간에서 선천수를 추출하여 합산
 * 2. 4개 지지에서 후천수를 추출하여 합산
 * 3. 선천수합 % 8 -> 상괘 (선천 팔괘수)
 * 4. 후천수합 % 8 -> 하괘 (선천 팔괘수)
 * 5. (선천수합 + 후천수합) % 6 -> 변효
 * 6. 상괘 + 하괘 -> 64괘 번호 및 해석 조회
 *
 * @param palja - 사주팔자
 * @returns DaejeongResult
 */
export function calculateDaejeong(palja: Palja): DaejeongResult {
  // 1. 선천수 상세 (년간, 월간, 일간, 시간)
  const seoncheonsuDetail = [
    { label: `년간(${palja.yearGan})`, value: getSeoncheonsu(palja.yearGan) },
    { label: `월간(${palja.monthGan})`, value: getSeoncheonsu(palja.monthGan) },
    { label: `일간(${palja.dayGan})`, value: getSeoncheonsu(palja.dayGan) },
    { label: `시간(${palja.hourGan})`, value: getSeoncheonsu(palja.hourGan) },
  ];

  // 2. 후천수 상세 (년지, 월지, 일지, 시지)
  const hucheonsuDetail = [
    { label: `년지(${palja.yearJi})`, value: getHucheonsu(palja.yearJi) },
    { label: `월지(${palja.monthJi})`, value: getHucheonsu(palja.monthJi) },
    { label: `일지(${palja.dayJi})`, value: getHucheonsu(palja.dayJi) },
    { label: `시지(${palja.hourJi})`, value: getHucheonsu(palja.hourJi) },
  ];

  // 3. 합계
  const seoncheonsuTotal = calculateSeoncheonsuTotal(palja);
  const hucheonsuTotal = calculateHucheonsuTotal(palja);

  // 4. 상괘, 하괘
  const upperTrigramNumber = calculateUpperTrigram(seoncheonsuTotal);
  const lowerTrigramNumber = calculateLowerTrigram(hucheonsuTotal);
  const upperTrigram = getTrigramInfo(upperTrigramNumber);
  const lowerTrigram = getTrigramInfo(lowerTrigramNumber);

  // 5. 변효
  const changingLine = calculateChangingLine(seoncheonsuTotal, hucheonsuTotal);

  // 6. 64괘 도출
  const hexagramNumber = getHexagramNumber(upperTrigramNumber, lowerTrigramNumber);
  const hexagramEntry = HEXAGRAM_DATA[hexagramNumber] ?? HEXAGRAM_DATA[1];

  return {
    seoncheonsuDetail,
    hucheonsuDetail,
    seoncheonsuTotal,
    hucheonsuTotal,
    upperTrigram,
    lowerTrigram,
    hexagramNumber,
    hexagramName: hexagramEntry.name,
    changingLine,
    interpretation: hexagramEntry.interpretation,
  };
}
