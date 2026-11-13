// @TASK P9-R5-T1 - 시국파(時局派) 분석 엔진
// @SPEC docs/planning/06-tasks.md#P9-R5-T1

import type { QimenResult } from '@/engine/types';
import { calculateQimen } from '@/engine/qimen';
import { GATE_FORTUNE_BY_HANJA } from '@/engine/qimen/constants';

// ---------- 궁 -> 방위 매핑 ----------

const PALACE_DIRECTION: Record<string, string> = {
  '감궁': '북',
  '곤궁': '남서',
  '진궁': '동',
  '손궁': '남동',
  '중궁': '중앙',
  '건궁': '북서',
  '태궁': '서',
  '간궁': '북동',
  '이궁': '남',
};

// ---------- 길문/흉문 분류 ----------

/** 길문: 개문, 생문, 휴문 */
const AUSPICIOUS_GATES = new Set(['개문', '생문', '휴문']);

/** 흉문: 사문, 상문 */
const INAUSPICIOUS_GATES = new Set(['사문', '상문']);

// ---------- 공개 타입 ----------

export interface SigukAnalysis {
  /** 시간 기반 포국 결과 */
  result: QimenResult;
  /** 시국파 해석 특징 */
  characteristics: string[];
  /** 길한 방위 */
  auspiciousDirections: string[];
  /** 흉한 방위 */
  inauspiciousDirections: string[];
  /** 시국파 요약 */
  summary: string;
}

// ---------- 공개 함수 ----------

/**
 * 시국파(時局派) 기문둔갑 분석을 수행한다.
 *
 * 시국파는 가장 보편적인 기문둔갑 학파로, 시간(시진)을 기준으로 포국한다.
 * calculateQimen을 그대로 사용하며, 시국파 특유의 해석 관점을 추가한다:
 * - 시간 용신: 현재 시진의 천간/지지 기반 해석
 * - 방위 길흉: 개문/생문/휴문이 있는 궁을 길한 방위로, 사문/상문이 있는 궁을 흉한 방위로 도출
 *
 * @param solarDate - 양력 날짜 "YYYY-MM-DD"
 * @param hour - 시각 (0-23)
 * @returns SigukAnalysis
 */
export function analyzeSiguk(solarDate: string, hour: number): SigukAnalysis {
  // 1. 기본 기문둔갑 포국 (시간 기준)
  const result = calculateQimen(solarDate, hour);

  // 2. 방위별 길흉 분류
  const auspiciousDirections: string[] = [];
  const inauspiciousDirections: string[] = [];

  for (const palace of result.palaces) {
    if (palace.index === 5) continue; // 중궁 제외

    const direction = PALACE_DIRECTION[palace.name];
    if (!direction) continue;

    // 한자 기반 판별로 경문(驚門)과 경문(景門) 구분
    const fortuneByHanja = GATE_FORTUNE_BY_HANJA[palace.gateHanja];

    if (fortuneByHanja === '길' || AUSPICIOUS_GATES.has(palace.gate)) {
      auspiciousDirections.push(direction);
    } else if (fortuneByHanja === '흉' || INAUSPICIOUS_GATES.has(palace.gate)) {
      inauspiciousDirections.push(direction);
    }
  }

  // 3. 시국파 특징 해석
  const characteristics = buildCharacteristics(result);

  // 4. 요약 생성
  const summary = buildSummary(result, auspiciousDirections, inauspiciousDirections);

  return {
    result,
    characteristics,
    auspiciousDirections,
    inauspiciousDirections,
    summary,
  };
}

// ---------- 내부 헬퍼 ----------

/**
 * 시국파 특유의 해석 특징을 생성한다.
 */
function buildCharacteristics(result: QimenResult): string[] {
  const chars: string[] = [];

  // 시간 기반 해석 (시국파 핵심)
  chars.push(
    `시진(時辰) ${result.hourGan}${result.hourJi}시 기준 포국: ${result.dunType} ${result.bureauNumber}국`,
  );

  // 절기/원 정보
  chars.push(
    `절기 ${result.solarTerm} ${result.yuan} 기준 시간 용신(用神) 해석`,
  );

  // 직부성/직사문 정보
  chars.push(
    `직부성(值符星): ${result.zhifu}, 직사문(值使門): ${result.zhishi}`,
  );

  // 둔갑 정보
  chars.push(
    `갑(甲)이 ${result.hiddenJia}에 둔갑하여 시간 흐름에 따라 변화`,
  );

  // 격국 정보
  if (result.gyeokguk) {
    chars.push(
      `격국: ${result.gyeokguk.name}(${result.gyeokguk.hanja}) - ${result.gyeokguk.fortune === '길' ? '길격' : '흉격'}`,
    );
  }

  // 공망 정보
  chars.push(
    `공망(空亡): ${result.voidBranches[0]}${result.voidBranches[1]} - 해당 방위는 실효`,
  );

  return chars;
}

/**
 * 시국파 분석 요약을 생성한다.
 */
function buildSummary(
  result: QimenResult,
  auspicious: string[],
  inauspicious: string[],
): string {
  const parts: string[] = [];

  parts.push(
    `[시국파] ${result.solarDate} ${result.hourGan}${result.hourJi}시,` +
    ` ${result.dunType} ${result.bureauNumber}국 (${result.solarTerm} ${result.yuan}).`,
  );

  if (auspicious.length > 0) {
    parts.push(`길한 방위: ${auspicious.join(', ')}.`);
  } else {
    parts.push('길한 방위: 없음.');
  }

  if (inauspicious.length > 0) {
    parts.push(`흉한 방위: ${inauspicious.join(', ')}.`);
  } else {
    parts.push('흉한 방위: 없음.');
  }

  parts.push(`직부성 ${result.zhifu}, 직사문 ${result.zhishi}.`);

  if (result.gyeokguk) {
    parts.push(`격국: ${result.gyeokguk.name} (${result.gyeokguk.fortune}).`);
  }

  return parts.join(' ');
}
