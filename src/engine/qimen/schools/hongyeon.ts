// @TASK P9-R5-T4 - 홍연기문파(洪演奇門派) 분석 엔진
// @SPEC docs/planning/06-tasks.md#P9-R5-T4
// @TEST tests/engine/qimen-hongyeon.test.ts

import type { QimenResult, Palja } from '@/engine/types';
import { calculateQimen } from '@/engine/qimen';
import { analyzeHongyeon, type HongyeonResult } from '@/engine/hongyeon';
// PALACE_NAMES는 PALACE_DIRECTION에서 키로 사용

// ---------- 궁 -> 방위 매핑 ----------

const PALACE_DIRECTION: Record<string, string> = {
  '감궁': '북', '곤궁': '남서', '진궁': '동', '손궁': '남동',
  '중궁': '중앙', '건궁': '북서', '태궁': '서', '간궁': '북동', '이궁': '남',
};

// ---------- 공개 타입 ----------

export interface HongyeonQimenAnalysis {
  /** 기문둔갑 기본 포국 */
  qimenResult: QimenResult;
  /** 홍연기문 기존 분석 결과 */
  hongyeonResult: HongyeonResult;
  /** 통합 해석: 기문둔갑 + 홍연기문 비교 */
  combinedInterpretation: string;
  /** 공통점 */
  commonPoints: string[];
  /** 차이점 */
  differences: string[];
  /** 종합 요약 */
  summary: string;
}

// ---------- 공개 함수 ----------

/**
 * 홍연기문파(洪演奇門派) 기문둔갑 분석을 수행한다.
 *
 * 홍연기문파는 한국 고유의 기문둔갑 변형으로,
 * 기문둔갑 포국과 홍연기문(P7) 구궁 분석을 모두 수행한 뒤
 * 두 체계의 구궁 배치를 비교하여 공통점과 차이점을 도출한다.
 *
 * 비교 포인트:
 * - 기문둔갑 9궁(팔문/구성/팔신 배치) vs 홍연기문 구궁(구성/오행 배치)
 * - 동일 방위에 배치된 요소들의 길흉 분석
 * - 두 체계가 공통으로 강조하는 방위와 차이나는 방위
 *
 * @param solarDate - 양력 날짜 "YYYY-MM-DD"
 * @param hour - 시각 (0-23)
 * @param palja - 사주팔자 (홍연기문 분석에 필요)
 * @returns HongyeonQimenAnalysis
 */
export function analyzeHongyeonQimen(
  solarDate: string,
  hour: number,
  palja: Palja,
): HongyeonQimenAnalysis {
  // 1. 기문둔갑 포국
  const qimenResult = calculateQimen(solarDate, hour);

  // 2. 홍연기문 구궁 분석
  const hongyeonResult = analyzeHongyeon(palja);

  // 3. 두 체계 비교 분석
  const commonPoints = findCommonPoints(qimenResult, hongyeonResult);
  const differences = findDifferences(qimenResult, hongyeonResult);

  // 4. 통합 해석
  const combinedInterpretation = buildCombinedInterpretation(
    qimenResult, hongyeonResult, commonPoints, differences,
  );

  // 5. 종합 요약
  const summary = buildSummary(
    qimenResult, hongyeonResult, commonPoints, differences,
  );

  return {
    qimenResult,
    hongyeonResult,
    combinedInterpretation,
    commonPoints,
    differences,
    summary,
  };
}

// ---------- 내부 헬퍼 ----------

/**
 * 기문둔갑과 홍연기문의 공통점을 도출한다.
 *
 * 비교 기준:
 * - 구궁 번호별 방위 일치
 * - 양 체계에서 동일하게 강조되는 방위/궁
 */
function findCommonPoints(
  qimen: QimenResult,
  hongyeon: HongyeonResult,
): string[] {
  const points: string[] = [];

  // 공통점 1: 양쪽 모두 9궁 기반 체계
  points.push(
    '기문둔갑과 홍연기문 모두 낙서(洛書) 구궁(九宮) 배치를 기반으로 분석한다',
  );

  // 공통점 2: 국수와 홍국수 비교
  if (qimen.bureauNumber === hongyeon.hongguksu) {
    points.push(
      `기문둔갑 국수(${qimen.bureauNumber})와 홍연기문 홍국수(${hongyeon.hongguksu})가 일치한다`,
    );
  }

  // 공통점 3: 중궁 기준 해석
  const qimenCenter = qimen.palaces.find(p => p.index === 5);
  const hongyeonCenter = hongyeon.gugung.find(p => p.position === 5);
  if (qimenCenter && hongyeonCenter) {
    points.push(
      `중궁 분석: 기문둔갑 천반간 ${qimenCenter.heavenStem}/지반간 ${qimenCenter.earthStem},` +
      ` 홍연기문 ${hongyeonCenter.star}(${hongyeonCenter.ohaeng})`,
    );
  }

  // 공통점 4: 양둔/음둔과 본명성의 관계
  points.push(
    `${qimen.dunType} 포국과 본명성 ${hongyeon.bonmyeongseong}(${hongyeon.bonmyeongOhaeng})의 조합으로 종합 운세를 도출한다`,
  );

  return points;
}

/**
 * 기문둔갑과 홍연기문의 차이점을 도출한다.
 */
function findDifferences(
  qimen: QimenResult,
  hongyeon: HongyeonResult,
): string[] {
  const diffs: string[] = [];

  // 차이점 1: 분석 기반
  diffs.push(
    '기문둔갑은 시간(시진)과 절기를 기반으로 포국하고, 홍연기문은 사주팔자(천간)를 기반으로 구궁을 배치한다',
  );

  // 차이점 2: 배치 요소
  diffs.push(
    '기문둔갑은 팔문/구성/팔신/천지반간을 배치하고, 홍연기문은 구성(九星)과 오행만 배치한다',
  );

  // 차이점 3: 국수 차이
  if (qimen.bureauNumber !== hongyeon.hongguksu) {
    diffs.push(
      `기문둔갑 국수(${qimen.bureauNumber})와 홍연기문 홍국수(${hongyeon.hongguksu})가` +
      ` 다르므로 각 체계의 중심 에너지가 다른 궁에 위치한다`,
    );
  }

  // 차이점 4: 해석 관점
  diffs.push(
    '기문둔갑은 특정 시점의 택일/방위를 중시하고, 홍연기문은 개인의 선천적 운명 에너지 흐름을 중시한다',
  );

  return diffs;
}

/**
 * 통합 해석 텍스트를 생성한다.
 */
function buildCombinedInterpretation(
  qimen: QimenResult,
  hongyeon: HongyeonResult,
  commonPoints: string[],
  differences: string[],
): string {
  const parts: string[] = [];

  parts.push(
    `홍연기문파 통합 분석: 기문둔갑 ${qimen.dunType} ${qimen.bureauNumber}국 포국과` +
    ` 홍연기문 홍국수 ${hongyeon.hongguksu}(본명성: ${hongyeon.bonmyeongseong})을 비교 분석하였다.`,
  );

  parts.push(
    `양 체계의 공통점 ${commonPoints.length}개, 차이점 ${differences.length}개를 발견하였다.`,
  );

  // 방위별 종합 길흉
  const qimenGoodDirs: string[] = [];
  const auspiciousGates = new Set(['개문', '생문', '휴문']);
  for (const palace of qimen.palaces) {
    if (palace.index === 5) continue;
    if (auspiciousGates.has(palace.gate)) {
      const dir = PALACE_DIRECTION[palace.name];
      if (dir) qimenGoodDirs.push(dir);
    }
  }

  if (qimenGoodDirs.length > 0) {
    parts.push(
      `기문둔갑 기준 길한 방위(${qimenGoodDirs.join(', ')})와` +
      ` 홍연기문의 본명성 에너지(${hongyeon.bonmyeongOhaeng})를 종합하여 최적 방위를 판단한다.`,
    );
  }

  return parts.join(' ');
}

/**
 * 종합 요약을 생성한다.
 */
function buildSummary(
  qimen: QimenResult,
  hongyeon: HongyeonResult,
  commonPoints: string[],
  differences: string[],
): string {
  const parts: string[] = [];

  parts.push(
    `[홍연기문파] 기문둔갑(${qimen.dunType} ${qimen.bureauNumber}국) +` +
    ` 홍연기문(홍국수 ${hongyeon.hongguksu}, ${hongyeon.bonmyeongseong}) 통합 분석.`,
  );

  parts.push(
    `공통점 ${commonPoints.length}개, 차이점 ${differences.length}개.`,
  );

  parts.push(
    `기문둔갑 직부성 ${qimen.zhifu}, 직사문 ${qimen.zhishi}.`,
  );

  parts.push(
    `홍연기문 선천수 ${hongyeon.seoncheonsu}, 본명성 오행 ${hongyeon.bonmyeongOhaeng}.`,
  );

  if (qimen.gyeokguk) {
    parts.push(
      `격국: ${qimen.gyeokguk.name} (${qimen.gyeokguk.fortune}).`,
    );
  }

  return parts.join(' ');
}
