// @TASK P8-R4-T1 - 중주파(中州派) 로직 (왕정농 체계)
// @SPEC docs/planning/06-tasks.md#P8-R4-T1

import type {
  ZiweiResult,
  ZiweiPalace,
  JungjuAnalysis,
} from '@/engine/types';
import { parseBrightness } from '@/engine/ziwei/interpret';

// ---------- 성요 조합 해석 테이블 ----------

/**
 * 왕정농(王亭之) 중주파 성요 조합 해석 데이터.
 * 두 성요가 같은 궁에서 동궁할 때의 특수 해석.
 */
export const STAR_COMBINATION_TABLE: {
  stars: string[];
  interpretation: string;
  fortune: '길' | '흉' | '평';
}[] = [
  {
    stars: ['자미', '천부'],
    interpretation: '제왕과 재고가 동궁하여 부귀겸전. 최상의 조합으로 리더십과 재물운이 모두 강함.',
    fortune: '길',
  },
  {
    stars: ['자미', '탐랑'],
    interpretation: '제왕과 욕망이 동궁. 외교적 능력이 뛰어나나 색정에 주의.',
    fortune: '평',
  },
  {
    stars: ['자미', '천상'],
    interpretation: '제왕과 인수가 동궁. 정치적 수완이 뛰어남.',
    fortune: '길',
  },
  {
    stars: ['자미', '칠살'],
    interpretation: '제왕과 장성이 동궁. 화복이 극단적이며 큰 성취 또는 큰 실패.',
    fortune: '평',
  },
  {
    stars: ['자미', '파군'],
    interpretation: '제왕과 파괴가 동궁. 변혁적 기질이 강하며 개척정신이 있음.',
    fortune: '평',
  },
  {
    stars: ['천기', '태음'],
    interpretation: '지혜와 재물이 동궁. 계획적이고 세심한 재테크 능력.',
    fortune: '길',
  },
  {
    stars: ['천기', '천량'],
    interpretation: '지혜와 음덕이 동궁. 학문적 성취에 유리.',
    fortune: '길',
  },
  {
    stars: ['천기', '거문'],
    interpretation: '지혜와 구설이 동궁. 말과 글에 재능이 있으나 시비에 주의.',
    fortune: '평',
  },
  {
    stars: ['태양', '태음'],
    interpretation: '일월 병림. 남녀 모두에게 길하며 문무겸전의 재능.',
    fortune: '길',
  },
  {
    stars: ['태양', '거문'],
    interpretation: '광명과 구설이 동궁. 태양이 밝으면 구설이 해소되어 명성을 얻음.',
    fortune: '길',
  },
  {
    stars: ['태양', '천량'],
    interpretation: '광명과 음덕이 동궁. 공적인 업무에서 명성을 얻음.',
    fortune: '길',
  },
  {
    stars: ['무곡', '천부'],
    interpretation: '재성과 재고가 동궁. 재물운이 매우 강하여 부유함.',
    fortune: '길',
  },
  {
    stars: ['무곡', '탐랑'],
    interpretation: '재성과 욕망이 동궁. 사업적 야망이 크며 투기에 주의.',
    fortune: '평',
  },
  {
    stars: ['무곡', '천상'],
    interpretation: '재성과 인수가 동궁. 재정 관리 능력이 탁월.',
    fortune: '길',
  },
  {
    stars: ['무곡', '칠살'],
    interpretation: '재성과 장성이 동궁. 과감한 투자로 대박 또는 대손.',
    fortune: '평',
  },
  {
    stars: ['무곡', '파군'],
    interpretation: '재성과 파괴가 동궁. 재물의 변동이 심하여 불안정.',
    fortune: '흉',
  },
  {
    stars: ['천동', '태음'],
    interpretation: '복성과 재성이 동궁. 편안한 가운데 재물이 모임.',
    fortune: '길',
  },
  {
    stars: ['천동', '천량'],
    interpretation: '복성과 음덕이 동궁. 복이 많고 수명이 김.',
    fortune: '길',
  },
  {
    stars: ['천동', '거문'],
    interpretation: '복성과 구설이 동궁. 복은 있으나 시비가 따름.',
    fortune: '평',
  },
  {
    stars: ['염정', '천부'],
    interpretation: '화성과 재고가 동궁. 열정적 재물 추구.',
    fortune: '평',
  },
  {
    stars: ['염정', '탐랑'],
    interpretation: '화성과 욕망이 동궁. 감정적이고 도화가 왕성. 예술적 재능은 있으나 색정에 주의.',
    fortune: '흉',
  },
  {
    stars: ['염정', '천상'],
    interpretation: '화성과 인수가 동궁. 법률/규범 관련 업무에 적합.',
    fortune: '평',
  },
  {
    stars: ['염정', '칠살'],
    interpretation: '화성과 장성이 동궁. 성격이 극렬하며 형벌에 주의.',
    fortune: '흉',
  },
  {
    stars: ['염정', '파군'],
    interpretation: '화성과 파괴가 동궁. 파란만장한 인생. 사고/재난에 주의.',
    fortune: '흉',
  },
];

// ---------- 왕정농 특수 해석 ----------

/**
 * 왕정농(王亭之) 중주파 특유의 해석 규칙.
 */
export const WANG_SPECIALS: {
  name: string;
  description: string;
  check: (result: ZiweiResult) => boolean;
}[] = [
  {
    name: '자미재좌',
    description: '자미성이 명궁에 좌수하면 리더십과 존엄함이 있으나, 반드시 보성(좌보/우필)의 협조가 필요. 단독으로는 고독할 수 있음.',
    check: (result) => {
      const soul = result.palaces.find((p) => p.name === '명궁');
      return soul ? soul.majorStars.some((s) => s.name === '자미') : false;
    },
  },
  {
    name: '일월반배',
    description: '태양과 태음이 각각 밝지 않은 궁에 위치하면 일월반배(日月反背)로, 부모/부부운이 불리.',
    check: (result) => {
      let sunDark = false;
      let moonDark = false;
      for (const p of result.palaces) {
        for (const s of p.majorStars) {
          if (s.name === '태양' && parseBrightness(s.brightness) < 0) sunDark = true;
          if (s.name === '태음' && parseBrightness(s.brightness) < 0) moonDark = true;
        }
      }
      return sunDark && moonDark;
    },
  },
  {
    name: '명궁공궁',
    description: '명궁에 주성이 없는 공궁(空宮). 대궁(천이궁)의 주성을 차용하나, 그 힘이 약함. 판단력이 부족할 수 있음.',
    check: (result) => {
      const soul = result.palaces.find((p) => p.name === '명궁');
      return soul ? soul.majorStars.length === 0 : false;
    },
  },
  {
    name: '명신동궁',
    description: '명궁과 신궁이 같은 궁에 위치하면, 선천적 성격과 후천적 행동이 일치하여 일관성 있는 인생.',
    check: (result) => {
      const soul = result.palaces.find((p) => p.name === '명궁');
      return soul ? soul.isBodyPalace : false;
    },
  },
  {
    name: '화기입명',
    description: '화기(忌)가 명궁에 들어오면 일생 시비/고난이 많음. 특히 주성에 화기가 붙으면 더욱 심각.',
    check: (result) => {
      const soul = result.palaces.find((p) => p.name === '명궁');
      if (!soul) return false;
      return [...soul.majorStars, ...soul.minorStars].some((s) => s.mutagen === '기');
    },
  },
];

// ---------- 성요 조합 분석 ----------

/**
 * 12궁 각각에서 동궁 성요 조합을 찾아 해석한다.
 */
export function analyzeStarCombinations(
  palaces: ZiweiPalace[],
): {
  stars: string[];
  palaceName: string;
  interpretation: string;
  fortune: '길' | '흉' | '평';
}[] {
  const results: {
    stars: string[];
    palaceName: string;
    interpretation: string;
    fortune: '길' | '흉' | '평';
  }[] = [];

  for (const palace of palaces) {
    const majorNames = palace.majorStars.map((s) => s.name);
    if (majorNames.length < 2) continue;

    for (const combo of STAR_COMBINATION_TABLE) {
      const allPresent = combo.stars.every((star) => majorNames.includes(star));
      if (allPresent) {
        results.push({
          stars: combo.stars,
          palaceName: palace.name,
          interpretation: combo.interpretation,
          fortune: combo.fortune,
        });
      }
    }
  }

  return results;
}

// ---------- 명궁-신궁 관계 분석 ----------

/**
 * 명궁과 신궁의 관계를 분석한다.
 * 왕정농 체계에서는 명궁(선천)과 신궁(후천)의 관계가 중요.
 */
export function analyzeSoulBodyRelation(
  result: ZiweiResult,
): {
  soulPalaceName: string;
  bodyPalaceName: string;
  relation: string;
  interpretation: string;
} {
  const soulPalace = result.palaces.find((p) => p.name === '명궁');
  const bodyPalace = result.palaces.find((p) => p.isBodyPalace);

  const soulName = '명궁';
  const bodyName = bodyPalace?.name ?? '불명';

  // 같은 궁인지 체크
  const isSame = soulPalace?.index === bodyPalace?.index;

  let relation: string;
  let interpretation: string;

  if (isSame) {
    relation = '명신동궁';
    interpretation = '명궁과 신궁이 같은 궁에 위치. 선천적 성격과 후천적 행동이 일치하여 일관성 있는 인생을 살게 됨.';
  } else {
    // 대궁인지 체크
    const soulIdx = soulPalace?.index ?? 0;
    const bodyIdx = bodyPalace?.index ?? 0;
    const isOpposite = Math.abs(soulIdx - bodyIdx) === 6 || Math.abs(soulIdx - bodyIdx) === 6;

    if (isOpposite) {
      relation = '명신대궁';
      interpretation = `명궁과 신궁(${bodyName})이 대궁 관계. 선천적 성격과 후천적 행동이 상반되어 내면의 갈등이 있을 수 있음.`;
    } else {
      // 삼합인지 체크
      const soulBase = soulIdx % 4;
      const bodyBase = bodyIdx % 4;
      const isTriangle = soulBase === bodyBase;

      if (isTriangle) {
        relation = '명신삼합';
        interpretation = `명궁과 신궁(${bodyName})이 삼합 관계. 선천과 후천이 조화를 이루며 서로 보완적.`;
      } else {
        relation = '명신이궁';
        interpretation = `명궁과 신궁(${bodyName})이 다른 궁. 성격과 행동 사이에 차이가 있으며, 나이가 들수록 신궁의 영향이 커짐.`;
      }
    }
  }

  return {
    soulPalaceName: soulName,
    bodyPalaceName: bodyName,
    relation,
    interpretation,
  };
}

// ---------- 대한 흐름 분석 ----------

/**
 * 12개 대한(10년 단위)의 흐름을 분석한다.
 * 각 대한의 궁에 있는 주성/보성 구성과 밝기로 길흉을 판단.
 */
export function analyzeDecadalFlow(
  result: ZiweiResult,
): {
  range: [number, number];
  palaceName: string;
  fortune: '길' | '흉' | '평';
  interpretation: string;
}[] {
  return result.palaces.map((palace) => {
    const range = palace.decadal.range as [number, number];
    const palaceName = palace.name;

    // 밝기 합산
    let brightnessSum = 0;
    for (const star of palace.majorStars) {
      brightnessSum += parseBrightness(star.brightness);
    }

    // 사화 가중치
    let mutagenScore = 0;
    for (const star of [...palace.majorStars, ...palace.minorStars]) {
      if (star.mutagen === '록') mutagenScore += 3;
      else if (star.mutagen === '권') mutagenScore += 2;
      else if (star.mutagen === '과') mutagenScore += 1;
      else if (star.mutagen === '기') mutagenScore -= 3;
    }

    const totalScore = brightnessSum + mutagenScore;
    let fortune: '길' | '흉' | '평';
    if (totalScore >= 3) fortune = '길';
    else if (totalScore <= -3) fortune = '흉';
    else fortune = '평';

    // 해석
    const majorNames = palace.majorStars.map((s) => s.name);
    const starDesc = majorNames.length > 0
      ? `주성 ${majorNames.join(', ')}`
      : '공궁(주성 없음)';

    const interpretation = `${range[0]}~${range[1]}세: ${palaceName} 대한. ${starDesc}. 밝기 ${brightnessSum >= 0 ? '+' : ''}${brightnessSum}. ${fortune === '길' ? '순탄한 시기' : fortune === '흉' ? '어려운 시기' : '보통의 시기'}.`;

    return {
      range,
      palaceName,
      fortune,
      interpretation,
    };
  });
}

// ---------- 왕정농 특수 해석 ----------

/**
 * 왕정농 특수 해석 규칙을 적용한다.
 */
export function analyzeWangSpecials(
  result: ZiweiResult,
): {
  name: string;
  description: string;
  applicable: boolean;
}[] {
  return WANG_SPECIALS.map((special) => ({
    name: special.name,
    description: special.description,
    applicable: special.check(result),
  }));
}

// ---------- 공개 API ----------

/**
 * 중주파(왕정농 체계) 분석을 수행한다.
 *
 * - 성요 조합 해석 (동궁 조합)
 * - 명궁-신궁 관계
 * - 대한 흐름
 * - 왕정농 특수 해석
 */
export function analyzeJungju(result: ZiweiResult): JungjuAnalysis {
  const starCombinations = analyzeStarCombinations(result.palaces);
  const soulBodyRelation = analyzeSoulBodyRelation(result);
  const decadalFlow = analyzeDecadalFlow(result);
  const wangSpecials = analyzeWangSpecials(result);

  // 요약 생성
  const summaryParts: string[] = [];

  // 조합 요약
  if (starCombinations.length > 0) {
    const comboNames = starCombinations.map(
      (c) => `${c.stars.join('+')}(${c.palaceName})`,
    );
    summaryParts.push(`성요 조합: ${comboNames.join(', ')}.`);
  } else {
    summaryParts.push('특수 동궁 조합 없음.');
  }

  // 명신 관계
  summaryParts.push(`${soulBodyRelation.relation}: ${soulBodyRelation.interpretation}`);

  // 왕정농 특수 해석
  const applicableSpecials = wangSpecials.filter((s) => s.applicable);
  if (applicableSpecials.length > 0) {
    summaryParts.push(`적용 특수 해석: ${applicableSpecials.map((s) => s.name).join(', ')}.`);
  }

  return {
    starCombinations,
    soulBodyRelation,
    decadalFlow,
    wangSpecials,
    summary: summaryParts.join(' '),
  };
}
