// @TASK P7-R2-T1 - 매화역수(梅花易數) 점술 엔진
// @SPEC docs/planning/02-trd.md#매화역수-엔진

import type { Ohaeng } from '@/engine/types';
import { ManseryeokRangeError } from '@/engine/core/errors';
import { HEXAGRAM_DATA, KING_WEN_LOOKUP } from './data';
import type { HexagramEntry } from './data';

// ─── 타입 정의 ───────────────────────────────────────

export type MaehwaMethod = 'time' | 'number' | 'name';

export interface Trigram {
  /** 팔괘 번호 (1~8) */
  number: number;
  /** 한글 이름: 건/태/리/진/손/감/간/곤 */
  name: string;
  /** 한자 이름: 乾/兌/離/震/巽/坎/艮/坤 */
  hanja: string;
  /** 오행 */
  ohaeng: Ohaeng;
}

export interface CheYong {
  che: 'upper' | 'lower';
  yong: 'upper' | 'lower';
}

export interface MaehwaResult {
  method: MaehwaMethod;
  upperTrigram: Trigram;
  lowerTrigram: Trigram;
  hexagramNumber: number;
  hexagramName: string;
  changingLine: number;
  cheyong: CheYong;
  cheOhaeng: Ohaeng;
  yongOhaeng: Ohaeng;
  cheYongRelation: '상생' | '상극' | '비화';
  interpretation: string;
}

// ─── 팔괘(八卦) 상수 ──────────────────────────────────

/** 팔괘 데이터. 인덱스 0은 미사용 (1~8 접근용). */
const TRIGRAMS: readonly Trigram[] = [
  // placeholder for index 0
  { number: 0, name: '', hanja: '', ohaeng: '목' },
  { number: 1, name: '건', hanja: '乾', ohaeng: '금' },
  { number: 2, name: '태', hanja: '兌', ohaeng: '금' },
  { number: 3, name: '리', hanja: '離', ohaeng: '화' },
  { number: 4, name: '진', hanja: '震', ohaeng: '목' },
  { number: 5, name: '손', hanja: '巽', ohaeng: '목' },
  { number: 6, name: '감', hanja: '坎', ohaeng: '수' },
  { number: 7, name: '간', hanja: '艮', ohaeng: '토' },
  { number: 8, name: '곤', hanja: '坤', ohaeng: '토' },
];

// ─── 시진(時辰) 매핑 ──────────────────────────────────

/**
 * 24시간 시계의 시(hour)를 12시진 번호(1~12)로 변환한다.
 *
 * 子시(23:00~01:00)=1, 丑시(01:00~03:00)=2, 寅시(03:00~05:00)=3,
 * 卯시(05:00~07:00)=4, 辰시(07:00~09:00)=5, 巳시(09:00~11:00)=6,
 * 午시(11:00~13:00)=7, 未시(13:00~15:00)=8, 申시(15:00~17:00)=9,
 * 酉시(17:00~19:00)=10, 戌시(19:00~21:00)=11, 亥시(21:00~23:00)=12
 *
 * @param hour - 24시간 기준 시(0~23)
 * @returns 시진 번호 (1~12)
 */
function hourToSijin(hour: number): number {
  // 23시와 0시 모두 子시(1)
  // 공식: ((hour + 1) / 2) % 12, 0이면 12
  // 23 -> (24/2)%12 = 12%12 = 0 -> 12? 아님.
  // 직접 매핑이 안전함.
  const h = ((hour % 24) + 24) % 24; // normalize to 0~23
  if (h === 23 || h === 0) return 1;  // 子
  // 나머지는 2시간 단위: 1-2=丑(2), 3-4=寅(3), ...
  return Math.floor((h + 1) / 2) + 1;
}

/**
 * 연도(양력)를 12지지 순서 번호(年數)로 변환한다.
 *
 * 子=1, 丑=2, 寅=3, 卯=4, 辰=5, 巳=6,
 * 午=7, 未=8, 申=9, 酉=10, 戌=11, 亥=12
 *
 * 기준: 2020년 = 경자(庚子)년 = 子=1
 * 따라서 (year - 2020 + 1) 이 아니라, 1984(갑자)=子 기준으로
 * (year - 1984) % 12 -> 지지 인덱스(0=子, 1=丑, ...)
 * 번호는 +1 하여 1~12.
 * 나머지가 정확히 0이면 12가 아니라 0+1=1(子).
 *
 * @param year - 양력 연도
 * @returns 年數 (1~12)
 */
function yearToJiji(year: number): number {
  // 1984 = 갑자(甲子) = 子 = index 0
  const idx = ((year - 1984) % 12 + 12) % 12; // 0~11
  return idx + 1; // 1(子) ~ 12(亥)
}

// ─── 핵심 계산 함수 ──────────────────────────────────

/**
 * 팔괘 번호(1~8)로 Trigram 객체를 반환한다.
 *
 * @param num - 팔괘 번호 (1~8)
 * @returns Trigram 객체
 */
export function getTrigramByNumber(num: number): Trigram {
  return TRIGRAMS[num];
}

/**
 * 상괘/하괘 조합으로 64괘 문왕 서열 번호를 반환한다.
 *
 * @param upperNum - 상괘 번호 (1~8)
 * @param lowerNum - 하괘 번호 (1~8)
 * @returns 64괘 번호 (1~64)
 */
export function getHexagramNumber(upperNum: number, lowerNum: number): number {
  return KING_WEN_LOOKUP[upperNum][lowerNum];
}

/**
 * 변효(1~6)로 체용(體用) 판별을 수행한다.
 *
 * - 변효 1~3: 상괘(외괘) 영역 변동 -> 상괘=용(用), 하괘=체(體)
 * - 변효 4~6: 하괘(내괘) 영역 변동 -> 상괘=체(體), 하괘=용(用)
 *
 * @param changingLine - 변효 (1~6)
 * @returns CheYong 객체
 */
export function calculateCheYong(changingLine: number): CheYong {
  if (changingLine >= 1 && changingLine <= 3) {
    return { che: 'lower', yong: 'upper' };
  }
  return { che: 'upper', yong: 'lower' };
}

/**
 * 두 오행 사이의 관계를 판별한다.
 *
 * 상생(相生): 목→화, 화→토, 토→금, 금→수, 수→목
 * 상극(相剋): 목→토, 토→수, 수→화, 화→금, 금→목
 * 비화(比和): 같은 오행끼리
 *
 * 방향(순/역) 무관하게 관계 종류만 반환한다.
 *
 * @param a - 첫 번째 오행
 * @param b - 두 번째 오행
 * @returns '상생' | '상극' | '비화'
 */
export function getOhaengRelation(a: Ohaeng, b: Ohaeng): '상생' | '상극' | '비화' {
  if (a === b) return '비화';

  // 상생 순환: 목→화→토→금→수→목
  const saengCycle: Ohaeng[] = ['목', '화', '토', '금', '수'];
  const idxA = saengCycle.indexOf(a);
  const idxB = saengCycle.indexOf(b);

  // 상생: 순환에서 인접 (a→b 또는 b→a)
  if (
    (idxA + 1) % 5 === idxB ||
    (idxB + 1) % 5 === idxA
  ) {
    return '상생';
  }

  // 나머지는 상극
  return '상극';
}

// ─── modulo 유틸 ─────────────────────────────────────

/**
 * n % divisor 계산. 나머지가 0이면 divisor를 반환한다.
 * 매화역수에서 나머지 0을 최대값으로 치환하는 규칙 적용.
 * 음수 입력은 양의 나머지로 정규화한다.
 */
function modWithFloor(n: number, divisor: number): number {
  const remainder = ((n % divisor) + divisor) % divisor;
  return remainder === 0 ? divisor : remainder;
}

/** 유한한 양의 정수만 허용한다 (NaN/Infinity/음수 차단). */
function requirePositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new ManseryeokRangeError(`매화역수 입력 ${field}는 1 이상의 정수여야 합니다.`, { field, value });
  }
}

// ─── 결과 조립 ───────────────────────────────────────

/**
 * 공통 결과 조립 함수. 상괘/하괘/변효로부터 MaehwaResult를 구성한다.
 */
function buildResult(
  method: MaehwaMethod,
  upperNum: number,
  lowerNum: number,
  changingLine: number,
): MaehwaResult {
  const upperTrigram = getTrigramByNumber(upperNum);
  const lowerTrigram = getTrigramByNumber(lowerNum);
  const hexagramNumber = getHexagramNumber(upperNum, lowerNum);
  const hexData: HexagramEntry = HEXAGRAM_DATA[hexagramNumber - 1];
  const cheyong = calculateCheYong(changingLine);

  const cheOhaeng = cheyong.che === 'upper' ? upperTrigram.ohaeng : lowerTrigram.ohaeng;
  const yongOhaeng = cheyong.yong === 'upper' ? upperTrigram.ohaeng : lowerTrigram.ohaeng;
  const cheYongRelation = getOhaengRelation(cheOhaeng, yongOhaeng);

  return {
    method,
    upperTrigram,
    lowerTrigram,
    hexagramNumber,
    hexagramName: hexData.name,
    changingLine,
    cheyong,
    cheOhaeng,
    yongOhaeng,
    cheYongRelation,
    interpretation: hexData.interpretation,
  };
}

// ─── 공개 점술 함수 ──────────────────────────────────

/**
 * 시간점(時間占): 연/월/일/시로 괘를 산출한다.
 *
 * 1. 年數 = 연도의 12지지 순서 (1~12)
 * 2. 時數 = 시각의 12시진 번호 (1~12)
 * 3. 상괘 = (年數 + 月數 + 日數) % 8, 0이면 8
 * 4. 하괘 = (年數 + 月數 + 日數 + 時數) % 8, 0이면 8
 * 5. 변효 = (年數 + 月數 + 日數 + 時數) % 6, 0이면 6
 *
 * @param year  - 양력 연도
 * @param month - 월 (1~12)
 * @param day   - 일 (1~31)
 * @param hour  - 시 (0~23)
 * @returns MaehwaResult
 */
export function divineByTime(
  year: number,
  month: number,
  day: number,
  hour: number,
): MaehwaResult {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) || month < 1 || month > 12 ||
    !Number.isInteger(day) || day < 1 || day > 31 ||
    !Number.isInteger(hour) || hour < 0 || hour > 23
  ) {
    throw new ManseryeokRangeError('매화역수 시간점 입력이 유효하지 않습니다.', { year, month, day, hour });
  }
  const yearNum = yearToJiji(year);
  const hourNum = hourToSijin(hour);

  const sumYMD = yearNum + month + day;
  const sumTotal = sumYMD + hourNum;

  const upperNum = modWithFloor(sumYMD, 8);
  const lowerNum = modWithFloor(sumTotal, 8);
  const changingLine = modWithFloor(sumTotal, 6);

  return buildResult('time', upperNum, lowerNum, changingLine);
}

/**
 * 수자점(數字占): 두 수로 괘를 산출한다.
 *
 * 1. 상괘 = first_number % 8, 0이면 8
 * 2. 하괘 = second_number % 8, 0이면 8
 * 3. 변효 = (first + second) % 6, 0이면 6
 *
 * @param num1 - 첫 번째 수
 * @param num2 - 두 번째 수
 * @returns MaehwaResult
 */
export function divineByNumber(num1: number, num2: number): MaehwaResult {
  requirePositiveInteger(num1, 'first');
  requirePositiveInteger(num2, 'second');
  const upperNum = modWithFloor(num1, 8);
  const lowerNum = modWithFloor(num2, 8);
  const changingLine = modWithFloor(num1 + num2, 6);

  return buildResult('number', upperNum, lowerNum, changingLine);
}

/**
 * 인명점(人名占): 이름의 획수로 괘를 산출한다.
 *
 * 1. 상괘 = surnameStrokes % 8, 0이면 8
 * 2. 하괘 = givenNameStrokes % 8, 0이면 8
 * 3. 변효 = totalStrokes % 6, 0이면 6
 *
 * @param surnameStrokes   - 성(姓)의 총 획수
 * @param givenNameStrokes - 이름(名)의 총 획수
 * @returns MaehwaResult
 */
export function divineByName(
  surnameStrokes: number,
  givenNameStrokes: number,
): MaehwaResult {
  requirePositiveInteger(surnameStrokes, 'surnameStrokes');
  requirePositiveInteger(givenNameStrokes, 'givenNameStrokes');
  const totalStrokes = surnameStrokes + givenNameStrokes;
  const upperNum = modWithFloor(surnameStrokes, 8);
  const lowerNum = modWithFloor(givenNameStrokes, 8);
  const changingLine = modWithFloor(totalStrokes, 6);

  return buildResult('name', upperNum, lowerNum, changingLine);
}
