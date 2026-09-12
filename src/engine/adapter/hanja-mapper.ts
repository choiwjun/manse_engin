// @TASK P2-R3-T1 - 한자 매핑 (천간/지지/오행)
// @SPEC docs/planning/02-trd.md#사주팔자-계산기
// @TEST tests/engine/calculator.test.ts

import type { Ohaeng } from '@/engine/types';

// --- 천간(天干) 10간 ---
export const CHEONGAN: readonly string[] = [
  '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸',
];

// --- 지지(地支) 12지 ---
export const JIJI: readonly string[] = [
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥',
];

// --- 천간 한글 매핑 ---
const GAN_KOREAN_MAP: Record<string, string> = {
  '甲': '갑',
  '乙': '을',
  '丙': '병',
  '丁': '정',
  '戊': '무',
  '己': '기',
  '庚': '경',
  '辛': '신',
  '壬': '임',
  '癸': '계',
};

// --- 지지 한글 매핑 ---
const JI_KOREAN_MAP: Record<string, string> = {
  '子': '자',
  '丑': '축',
  '寅': '인',
  '卯': '묘',
  '辰': '진',
  '巳': '사',
  '午': '오',
  '未': '미',
  '申': '신',
  '酉': '유',
  '戌': '술',
  '亥': '해',
};

// --- 천간 오행 매핑 ---
const GAN_OHAENG_MAP: Record<string, Ohaeng> = {
  '甲': '목',
  '乙': '목',
  '丙': '화',
  '丁': '화',
  '戊': '토',
  '己': '토',
  '庚': '금',
  '辛': '금',
  '壬': '수',
  '癸': '수',
};

// --- 지지 오행 매핑 ---
const JI_OHAENG_MAP: Record<string, Ohaeng> = {
  '寅': '목',
  '卯': '목',
  '巳': '화',
  '午': '화',
  '辰': '토',
  '戌': '토',
  '丑': '토',
  '未': '토',
  '申': '금',
  '酉': '금',
  '亥': '수',
  '子': '수',
};

/**
 * 천간 한자에 대응하는 한글 읽기를 반환한다.
 * 유효하지 않은 한자면 빈 문자열을 반환한다.
 */
export function getKoreanForGan(hanja: string): string {
  return GAN_KOREAN_MAP[hanja] ?? '';
}

/**
 * 지지 한자에 대응하는 한글 읽기를 반환한다.
 * 유효하지 않은 한자면 빈 문자열을 반환한다.
 */
export function getKoreanForJi(hanja: string): string {
  return JI_KOREAN_MAP[hanja] ?? '';
}

/**
 * 천간 한자에 대응하는 오행을 반환한다.
 * 유효하지 않은 한자면 null을 반환한다.
 */
export function getOhaengForGan(hanja: string): Ohaeng | null {
  return GAN_OHAENG_MAP[hanja] ?? null;
}

/**
 * 지지 한자에 대응하는 오행을 반환한다.
 * 유효하지 않은 한자면 null을 반환한다.
 */
export function getOhaengForJi(hanja: string): Ohaeng | null {
  return JI_OHAENG_MAP[hanja] ?? null;
}
