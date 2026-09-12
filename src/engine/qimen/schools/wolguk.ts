// @TASK P9-R5-T3 - 월국파(月局派) 분석 엔진
// @SPEC docs/planning/06-tasks.md#P9-R5-T3
// @TEST tests/engine/qimen-wolguk.test.ts

import type { QimenResult } from '@/engine/types';
import { ManseryeokEngine } from '@/engine/core/manseryeok-engine';
import { calculateQimen } from '@/engine/qimen';

// ---------- 천간별 오행 ----------

const STEM_OHAENG: Record<string, string> = {
  '甲': '목', '乙': '목',
  '丙': '화', '丁': '화',
  '戊': '토', '己': '토',
  '庚': '금', '辛': '금',
  '壬': '수', '癸': '수',
};

// ---------- 지지별 월 정보 ----------

const BRANCH_MONTH_NAME: Record<string, string> = {
  '寅': '인월(1월)', '卯': '묘월(2월)', '辰': '진월(3월)',
  '巳': '사월(4월)', '午': '오월(5월)', '未': '미월(6월)',
  '申': '신월(7월)', '酉': '유월(8월)', '戌': '술월(9월)',
  '亥': '해월(10월)', '子': '자월(11월)', '丑': '축월(12월)',
};

// ---------- 공개 타입 ----------

export interface WolgukAnalysis {
  /** 월 기반 포국 결과 */
  result: QimenResult;
  /** 월건 천간 */
  monthGan: string;
  /** 월건 지지 */
  monthJi: string;
  /** 월국파 해석 */
  characteristics: string[];
  /** 월국파 요약 */
  summary: string;
}

// ---------- 공개 함수 ----------

/**
 * 월국파(月局派) 기문둔갑 분석을 수행한다.
 *
 * 월국파는 월건(月建)을 기반으로 국수를 결정하는 학파이다.
 * 기본 포국은 시국파와 동일하게 calculateQimen을 사용하되,
 * 해당 월의 절기 정보와 월건 천간/지지를 추가하여 중기 운세를 해석한다.
 *
 * 월건의 절기 기반:
 * - 인월(寅): 입춘~경칩 전
 * - 묘월(卯): 경칩~청명 전
 * - ... 이하 12월 순환
 *
 * @param solarDate - 양력 날짜 "YYYY-MM-DD"
 * @param hour - 시각 (0-23)
 * @returns WolgukAnalysis
 */
export function analyzeWolguk(solarDate: string, hour: number): WolgukAnalysis {
  // 1. 기본 기문둔갑 포국
  const result = calculateQimen(solarDate, hour);

  // 2. 월건 천간/지지 추출
  const monthPillar = ManseryeokEngine.getSolarContextFromDateString(solarDate, hour).ganji.month;
  const monthGan: string = monthPillar.gan;
  const monthJi: string = monthPillar.ji;

  // 3. 월국파 특징 해석
  const characteristics = buildCharacteristics(result, monthGan, monthJi);

  // 4. 요약 생성
  const summary = buildSummary(result, monthGan, monthJi);

  return {
    result,
    monthGan,
    monthJi,
    characteristics,
    summary,
  };
}

// ---------- 내부 헬퍼 ----------

/**
 * 월국파 특유의 해석 특징을 생성한다.
 */
function buildCharacteristics(
  result: QimenResult,
  monthGan: string,
  monthJi: string,
): string[] {
  const chars: string[] = [];
  const ohaeng = STEM_OHAENG[monthGan] ?? '미상';
  const monthName = BRANCH_MONTH_NAME[monthJi] ?? monthJi;

  // 월건 정보
  chars.push(
    `월건(月建) ${monthGan}${monthJi} ${monthName}: 해당 달의 중기 운세 해석`,
  );

  // 월건 오행
  chars.push(
    `월간 오행: ${ohaeng} - 이번 달의 기본 기운을 반영`,
  );

  // 월국파 관점
  chars.push(
    `월국파는 월 단위의 중기적 방향을 중시하며, 해당 월의 절기 흐름에 따라 길흉을 판단한다`,
  );

  // 절기와의 관계
  chars.push(
    `현재 절기 ${result.solarTerm}(${result.yuan})에서 월건 ${monthGan}${monthJi}의 기운과 포국을 중첩 해석`,
  );

  // 직부성과 월건
  chars.push(
    `직부성 ${result.zhifu}와 월간 ${monthGan}의 관계에서 이달의 핵심 방향을 도출`,
  );

  return chars;
}

/**
 * 월국파 분석 요약을 생성한다.
 */
function buildSummary(
  result: QimenResult,
  monthGan: string,
  monthJi: string,
): string {
  const ohaeng = STEM_OHAENG[monthGan] ?? '미상';
  const monthName = BRANCH_MONTH_NAME[monthJi] ?? monthJi;
  const parts: string[] = [];

  parts.push(
    `[월국파] ${monthGan}${monthJi} ${monthName}(${ohaeng}),` +
    ` ${result.solarDate} ${result.dunType} ${result.bureauNumber}국.`,
  );

  parts.push(
    `월건 ${monthGan}${monthJi}의 기운이 이달의 중기 운세를 좌우하며,` +
    ` 절기 ${result.solarTerm} ${result.yuan} 기준 포국과 결합하여 해석한다.`,
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
