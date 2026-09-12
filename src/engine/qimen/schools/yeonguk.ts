// @TASK P9-R5-T2 - 연국파(年局派) 분석 엔진
// @SPEC docs/planning/06-tasks.md#P9-R5-T2
// @TEST tests/engine/qimen-yeonguk.test.ts

import type { QimenResult } from '@/engine/types';
import { ManseryeokEngine } from '@/engine/core/manseryeok-engine';
import { calculateQimen } from '@/engine/qimen';

// ---------- 양간/음간 분류 ----------

/** 양간: 甲(0), 丙(2), 戊(4), 庚(6), 壬(8) */
const YANG_STEMS = new Set(['甲', '丙', '戊', '庚', '壬']);

// ---------- 천간별 오행 ----------

const STEM_OHAENG: Record<string, string> = {
  '甲': '목', '乙': '목',
  '丙': '화', '丁': '화',
  '戊': '토', '己': '토',
  '庚': '금', '辛': '금',
  '壬': '수', '癸': '수',
};

// ---------- 공개 타입 ----------

export interface YeongukAnalysis {
  /** 연도 기반 포국 결과 (시국 기본 포국과 동일) */
  result: QimenResult;
  /** 연도 천간 */
  yearGan: string;
  /** 연도 지지 */
  yearJi: string;
  /** 연국파 해석 */
  characteristics: string[];
  /** 연국파 요약 */
  summary: string;
}

// ---------- 공개 함수 ----------

/**
 * 연국파(年局派) 기문둔갑 분석을 수행한다.
 *
 * 연국파는 연간(年干)과 연지(年支)를 기반으로 국수를 결정하는 변형 학파이다.
 * 기본 포국은 시국파와 동일하게 calculateQimen을 사용하되,
 * 연도 정보를 추가하여 한 해의 운세 및 장기 방향을 해석한다.
 *
 * - 양간(甲/丙/戊/庚/壬) = 양둔 관점
 * - 음간(乙/丁/己/辛/癸) = 음둔 관점
 *
 * @param solarDate - 양력 날짜 "YYYY-MM-DD"
 * @param hour - 시각 (0-23)
 * @returns YeongukAnalysis
 */
export function analyzeYeonguk(solarDate: string, hour: number): YeongukAnalysis {
  // 1. 기본 기문둔갑 포국
  const result = calculateQimen(solarDate, hour);

  // 2. 연도 천간/지지 추출
  const yearPillar = ManseryeokEngine.getSolarContextFromDateString(solarDate, hour).ganji.year;
  const yearGan: string = yearPillar.gan;
  const yearJi: string = yearPillar.ji;

  // 3. 연국파 특징 해석
  const characteristics = buildCharacteristics(result, yearGan, yearJi);

  // 4. 요약 생성
  const summary = buildSummary(result, yearGan, yearJi);

  return {
    result,
    yearGan,
    yearJi,
    characteristics,
    summary,
  };
}

// ---------- 내부 헬퍼 ----------

/**
 * 연국파 특유의 해석 특징을 생성한다.
 */
function buildCharacteristics(
  result: QimenResult,
  yearGan: string,
  yearJi: string,
): string[] {
  const chars: string[] = [];
  const isYangGan = YANG_STEMS.has(yearGan);
  const ohaeng = STEM_OHAENG[yearGan] ?? '미상';

  // 연간 정보
  chars.push(
    `연간(年干) ${yearGan}${yearJi}년: ${isYangGan ? '양둔' : '음둔'} 관점의 한 해 운세 해석`,
  );

  // 오행 속성
  chars.push(
    `연간 오행: ${ohaeng} - 해당 연도의 기본 기운을 나타냄`,
  );

  // 장기 운세 관점
  chars.push(
    `연국파는 장기적 방향성과 한 해의 대운을 중시하며, 단기 변동보다 큰 흐름을 본다`,
  );

  // 포국 정보와의 관계
  chars.push(
    `시국 포국(${result.dunType} ${result.bureauNumber}국)에 연간 ${yearGan}의 기운을 중첩하여 해석`,
  );

  // 직부성/직사문과 연간의 관계
  chars.push(
    `직부성 ${result.zhifu}와 연간 ${yearGan}의 관계에서 해당 연도의 귀인(貴人) 방향을 판단`,
  );

  return chars;
}

/**
 * 연국파 분석 요약을 생성한다.
 */
function buildSummary(
  result: QimenResult,
  yearGan: string,
  yearJi: string,
): string {
  const isYangGan = YANG_STEMS.has(yearGan);
  const ohaeng = STEM_OHAENG[yearGan] ?? '미상';
  const parts: string[] = [];

  parts.push(
    `[연국파] ${yearGan}${yearJi}년(${ohaeng}, ${isYangGan ? '양' : '음'}),` +
    ` ${result.solarDate} ${result.dunType} ${result.bureauNumber}국.`,
  );

  parts.push(
    `연간 ${yearGan}의 기운이 한 해의 장기 운세를 좌우하며,` +
    ` ${result.solarTerm} ${result.yuan} 절기 기준 포국과 결합하여 해석한다.`,
  );

  parts.push(
    `직부성 ${result.zhifu}, 직사문 ${result.zhishi}.`,
  );

  if (result.gyeokguk) {
    parts.push(
      `격국: ${result.gyeokguk.name} (${result.gyeokguk.fortune}).`,
    );
  }

  return parts.join(' ');
}
