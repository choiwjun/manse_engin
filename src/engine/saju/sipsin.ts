// @TASK P2-R3-T2 - 십신/12운성/지장간 계산
// @SPEC docs/planning/02-trd.md#십신-12운성-지장간
// @TEST tests/engine/sipsin.test.ts

import type { Palja, Ohaeng, JijangganSipsin } from '@/engine/types';
import { getOhaengForGan } from '@/engine/adapter/hanja-mapper';

// ---------- 공통 상수 ----------

/** 지지 위치 키 (yearJi, monthJi, dayJi, hourJi) */
const JI_POSITIONS = ['yearJi', 'monthJi', 'dayJi', 'hourJi'] as const;

// ---------- 지장간(地藏干) 테이블 ----------

/** 각 지지에 숨어 있는 천간 목록 (본기, 중기, 여기 순) */
export const JIJANGGAN_TABLE: Record<string, readonly string[]> = {
  '子': ['癸', '壬'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲'],
};

// ---------- 오행 상생/상극 관계 ----------

/** 상생: 목->화->토->금->수->목 (내가 생하는 오행) */
const SAENGSAENG: Record<Ohaeng, Ohaeng> = {
  '목': '화',
  '화': '토',
  '토': '금',
  '금': '수',
  '수': '목',
};

/** 상극: 목->토->수->화->금->목 (내가 극하는 오행) */
const SANGGEUK: Record<Ohaeng, Ohaeng> = {
  '목': '토',
  '토': '수',
  '수': '화',
  '화': '금',
  '금': '목',
};

// ---------- 천간 음양 ----------

/** 양간: 甲丙戊庚壬 / 음간: 乙丁己辛癸 */
const YANG_GAN = new Set(['甲', '丙', '戊', '庚', '壬']);

function isYangGan(gan: string): boolean {
  return YANG_GAN.has(gan);
}

// ---------- 12운성 테이블 ----------

/**
 * 양간 12운성 순행 순서 (장생부터 양까지)
 * 양간은 장생 시작 지지에서 순행(子->丑->寅...)
 * 음간은 장생 시작 지지에서 역행(午->巳->辰...)
 */
const UNSUNG_NAMES: readonly string[] = [
  '장생', '목욕', '관대', '건록', '제왕', '쇠',
  '병', '사', '묘', '절', '태', '양',
];

const JIJI_ORDER: readonly string[] = [
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥',
];

/**
 * 각 천간의 장생 위치 (지지 인덱스)
 * 양간: 순행 기준 장생 위치
 * 음간: 역행 기준 장생 위치
 *
 * 甲(양목): 亥(11)에서 장생 → 순행
 * 乙(음목): 午(6)에서 장생 → 역행
 * 丙(양화): 寅(2)에서 장생 → 순행
 * 丁(음화): 酉(9)에서 장생 → 역행
 * 戊(양토): 寅(2)에서 장생 → 순행 (丙과 동일)
 * 己(음토): 酉(9)에서 장생 → 역행 (丁과 동일)
 * 庚(양금): 巳(5)에서 장생 → 순행
 * 辛(음금): 子(0)에서 장생 → 역행
 * 壬(양수): 申(8)에서 장생 → 순행
 * 癸(음수): 卯(3)에서 장생 → 역행
 */
const JANGSEANG_START: Record<string, number> = {
  '甲': 11,  // 亥
  '乙': 6,   // 午
  '丙': 2,   // 寅
  '丁': 9,   // 酉
  '戊': 2,   // 寅
  '己': 9,   // 酉
  '庚': 5,   // 巳
  '辛': 0,   // 子
  '壬': 8,   // 申
  '癸': 3,   // 卯
};

// ---------- 십신 계산 로직 ----------

/**
 * 일간과 대상 천간의 오행/음양 관계로 십신을 판별한다.
 *
 * @param dayGan - 일간 (기준)
 * @param targetGan - 비교 대상 천간
 * @returns 십신 명칭
 */
export function determineSipsin(dayGan: string, targetGan: string): string {
  const myOhaeng = getOhaengForGan(dayGan);
  const targetOhaeng = getOhaengForGan(targetGan);

  if (!myOhaeng || !targetOhaeng) {
    return '';
  }

  const sameYinYang = isYangGan(dayGan) === isYangGan(targetGan);

  // 같은 오행
  if (myOhaeng === targetOhaeng) {
    return sameYinYang ? '비견' : '겁재';
  }

  // 내가 생하는 오행 (상생)
  if (SAENGSAENG[myOhaeng] === targetOhaeng) {
    return sameYinYang ? '식신' : '상관';
  }

  // 내가 극하는 오행 (상극)
  if (SANGGEUK[myOhaeng] === targetOhaeng) {
    return sameYinYang ? '편재' : '정재';
  }

  // 나를 극하는 오행
  if (SANGGEUK[targetOhaeng] === myOhaeng) {
    return sameYinYang ? '편관' : '정관';
  }

  // 나를 생하는 오행
  if (SAENGSAENG[targetOhaeng] === myOhaeng) {
    return sameYinYang ? '편인' : '정인';
  }

  return '';
}

/**
 * 사주팔자의 십신을 계산한다.
 * 일간(dayGan)을 기준으로 나머지 7개 글자의 십신을 판별한다.
 * 천간 위치는 해당 천간으로, 지지 위치는 본기(첫 번째 지장간)로 판별한다.
 *
 * @param palja - 사주팔자
 * @returns 8개 위치별 십신 (dayGan은 빈 문자열)
 */
export function calculateSipsin(palja: Palja): Record<string, string> {
  const { dayGan } = palja;

  const result: Record<string, string> = {};

  // 천간 위치 십신
  result['yearGan'] = palja.yearGan ? determineSipsin(dayGan, palja.yearGan) : '';
  result['monthGan'] = palja.monthGan ? determineSipsin(dayGan, palja.monthGan) : '';
  result['dayGan'] = ''; // 자기 자신
  result['hourGan'] = palja.hourGan ? determineSipsin(dayGan, palja.hourGan) : '';

  // 지지 위치 십신 (본기 = 첫 번째 지장간 기준)
  for (const pos of JI_POSITIONS) {
    const ji = palja[pos];
    if (!ji) {
      result[pos] = '';
      continue;
    }

    const jijanggan = JIJANGGAN_TABLE[ji];
    if (!jijanggan || jijanggan.length === 0) {
      result[pos] = '';
      continue;
    }

    // 본기(첫 번째 지장간)로 십신 판별
    result[pos] = determineSipsin(dayGan, jijanggan[0]);
  }

  return result;
}

/**
 * 지지 위치별 지장간 십신 상세 계산 (본기/중기/여기 각각)
 * 기존 sipsin은 본기만 반환하지만, 이 함수는 지장간 전체의 십신을 제공한다.
 */
export function calculateJijangganSipsin(palja: Palja): Record<string, JijangganSipsin> {
  const { dayGan } = palja;
  const result: Record<string, JijangganSipsin> = {};

  for (const pos of JI_POSITIONS) {
    const ji = palja[pos];
    if (!ji) continue;

    const gans = JIJANGGAN_TABLE[ji];
    if (!gans || gans.length === 0) continue;

    const entry: JijangganSipsin = {
      bongi: determineSipsin(dayGan, gans[0]),
    };
    if (gans.length >= 2) entry.junggi = determineSipsin(dayGan, gans[1]);
    if (gans.length >= 3) entry.yeogi = determineSipsin(dayGan, gans[2]);

    result[pos] = entry;
  }

  return result;
}

// ---------- 12운성 계산 로직 ----------

/**
 * 일간 기준으로 특정 지지의 12운성을 조회한다.
 *
 * @param dayGan - 일간
 * @param ji - 대상 지지
 * @returns 12운성 명칭
 */
function lookupUnsung(dayGan: string, ji: string): string {
  const startIndex = JANGSEANG_START[dayGan];
  if (startIndex === undefined) {
    return '';
  }

  const jiIndex = JIJI_ORDER.indexOf(ji);
  if (jiIndex === -1) {
    return '';
  }

  const isYang = isYangGan(dayGan);

  let offset: number;
  if (isYang) {
    // 양간: 순행 (장생 위치에서 지지 순서대로)
    offset = (jiIndex - startIndex + 12) % 12;
  } else {
    // 음간: 역행 (장생 위치에서 지지 역순으로)
    offset = (startIndex - jiIndex + 12) % 12;
  }

  return UNSUNG_NAMES[offset];
}

/**
 * 사주팔자의 12운성을 계산한다.
 * 일간(dayGan) 기준으로 각 지지(年支/月支/日支/時支)의 12운성을 조회한다.
 *
 * @param palja - 사주팔자
 * @returns 4개 지지 위치별 12운성
 */
export function calculateUnsung(palja: Palja): Record<string, string> {
  const { dayGan } = palja;

  const result: Record<string, string> = {};

  for (const pos of JI_POSITIONS) {
    const ji = palja[pos];
    if (!ji) {
      result[pos] = '';
      continue;
    }
    result[pos] = lookupUnsung(dayGan, ji);
  }

  return result;
}

// ---------- 지장간 추출 로직 ----------

/**
 * 사주팔자에서 각 지지의 지장간(숨겨진 천간)을 추출한다.
 *
 * @param palja - 사주팔자
 * @returns 4개 지지 위치별 지장간 배열
 */
export function extractJijanggan(palja: Palja): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const pos of JI_POSITIONS) {
    const ji = palja[pos];
    if (!ji) {
      result[pos] = [];
      continue;
    }
    result[pos] = [...(JIJANGGAN_TABLE[ji] ?? [])];
  }

  return result;
}
