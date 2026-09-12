// @TASK wonjin - 원진살(怨嗔殺) 판별 로직
// @SPEC docs/planning/02-trd.md#원진살-판별

import { JIJI } from '@/engine/adapter/hanja-mapper';

// ============================================================================
// Types
// ============================================================================

export interface WonjinPair {
  /** 위치명 (예: '년지') */
  position1: string;
  /** 지지 한자 (예: '子') */
  branch1: string;
  /** 위치명 (예: '일지') */
  position2: string;
  /** 지지 한자 (예: '未') */
  branch2: string;
  /** 해석 텍스트 */
  interpretation: string;
}

export interface WonjinResult {
  /** 원진살 해당 여부 */
  hasWonjin: boolean;
  /** 원진 관계에 해당하는 쌍 목록 */
  pairs: WonjinPair[];
}

// ============================================================================
// Constants: 원진살 대응 테이블
// ============================================================================

/**
 * 원진살(怨嗔殺) 6쌍 (한자).
 *
 * 원진은 겉으로는 괜찮아 보이나 속으로 원망하고 미워하는 관계를 뜻한다.
 *
 *   子(자) <-> 未(미)
 *   丑(축) <-> 午(오)
 *   寅(인) <-> 巳(사)
 *   卯(묘) <-> 辰(진)
 *   申(신) <-> 亥(해)
 *   酉(유) <-> 戌(술)
 */
export const WONJIN_TABLE: Record<string, string> = {
  '子': '未', '未': '子',
  '丑': '午', '午': '丑',
  '寅': '巳', '巳': '寅',
  '卯': '辰', '辰': '卯',
  '申': '亥', '亥': '申',
  '酉': '戌', '戌': '酉',
};

/** 원진살 대응 테이블 (한글) */
export const WONJIN_TABLE_KR: Record<string, string> = {
  '자': '미', '미': '자',
  '축': '오', '오': '축',
  '인': '사', '사': '인',
  '묘': '진', '진': '묘',
  '신': '해', '해': '신',
  '유': '술', '술': '유',
};

// ============================================================================
// Constants: 위치 조합별 해석 텍스트
// ============================================================================

/**
 * 4주(四柱)의 지지 위치 조합별 원진살 해석.
 * 키 형식: "position1-position2" (예: "년지-월지")
 */
const POSITION_INTERPRETATIONS: Record<string, string> = {
  '년지-월지':
    '유년기와 청년기에 갈등이 있을 수 있으며, 부모와의 관계에서 어려움이 있을 수 있습니다.',
  '년지-일지':
    '외부 환경과 자신의 내면 사이에서 갈등을 겪을 수 있으며, 배우자와의 관계에서 마찰이 있을 수 있습니다.',
  '년지-시지':
    '초년의 환경과 만년의 결과 사이에 괴리가 있을 수 있으며, 자녀와의 관계에서 어려움이 있을 수 있습니다.',
  '월지-일지':
    '사회 활동과 개인 생활 사이에서 갈등을 겪을 수 있으며, 직장과 가정 사이의 균형이 어려울 수 있습니다.',
  '월지-시지':
    '청년기의 활동과 만년의 결실 사이에 변동이 있을 수 있으며, 사업이나 직업 변경이 잦을 수 있습니다.',
  '일지-시지':
    '자신의 내면과 미래 방향 사이에서 갈등을 겪을 수 있으며, 배우자와 자녀 사이에서 고민이 있을 수 있습니다.',
};

// ============================================================================
// Constants: 위치 키 -> 한글 라벨 매핑
// ============================================================================

const POSITION_TO_LABEL: Record<string, string> = {
  yearJi: '년지',
  monthJi: '월지',
  dayJi: '일지',
  hourJi: '시지',
};

// ============================================================================
// Internal helpers
// ============================================================================

/** 유효한 지지(12지) 집합 */
const VALID_JIJI_SET: ReadonlySet<string> = new Set(JIJI);

/** 4주의 지지 위치 키 (순서 고정) */
const JIJI_POSITION_KEYS = ['yearJi', 'monthJi', 'dayJi', 'hourJi'] as const;

/**
 * 두 지지가 원진 관계인지 확인한다.
 */
function isWonjinPair(a: string, b: string): boolean {
  return WONJIN_TABLE[a] === b;
}

// ============================================================================
// Main function
// ============================================================================

/**
 * 사주 4주(四柱)의 지지 4개를 받아 원진살 관계를 분석한다.
 *
 * 4개 지지의 6가지 조합을 모두 확인한다:
 *   년지-월지, 년지-일지, 년지-시지,
 *   월지-일지, 월지-시지,
 *   일지-시지
 *
 * @param yearJi  - 년지 한자 (예: '子')
 * @param monthJi - 월지 한자 (예: '丑')
 * @param dayJi   - 일지 한자 (예: '未')
 * @param hourJi  - 시지 한자 (예: '酉')
 * @returns WonjinResult
 */
export function analyzeWonjin(
  yearJi: string,
  monthJi: string,
  dayJi: string,
  hourJi: string,
): WonjinResult {
  const branches = [yearJi, monthJi, dayJi, hourJi];
  const pairs: WonjinPair[] = [];

  // 6가지 조합: (0,1), (0,2), (0,3), (1,2), (1,3), (2,3)
  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const a = branches[i];
      const b = branches[j];

      // 빈 문자열 또는 유효하지 않은 지지는 건너뛴다
      if (!a || !b || !VALID_JIJI_SET.has(a) || !VALID_JIJI_SET.has(b)) {
        continue;
      }

      if (isWonjinPair(a, b)) {
        const pos1Label = POSITION_TO_LABEL[JIJI_POSITION_KEYS[i]];
        const pos2Label = POSITION_TO_LABEL[JIJI_POSITION_KEYS[j]];
        const interpKey = `${pos1Label}-${pos2Label}`;

        pairs.push({
          position1: pos1Label,
          branch1: a,
          position2: pos2Label,
          branch2: b,
          interpretation: POSITION_INTERPRETATIONS[interpKey] ?? '',
        });
      }
    }
  }

  return {
    hasWonjin: pairs.length > 0,
    pairs,
  };
}
