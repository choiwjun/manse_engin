import { calculatePalja } from '@/engine/saju/calculator';
import {
  calculateSeoncheonsu,
  calculateHongguksu,
  getBonmyeongseong,
} from '@/engine/hongyeon/index';
import {
  calculateDayGanScore,
  calculateDayJiScore,
  calculateOhaengComplementScore,
  calculateGuseongScore,
} from './scoring';
import type { CompatibilityInput, CompatibilityResult, CompatibilityGrade } from './types';

function getGrade(score: number): CompatibilityGrade {
  if (score >= 85) return 'S';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

function getGradeSummary(grade: CompatibilityGrade): string {
  switch (grade) {
    case 'S': return '천생연분! 서로를 자연스럽게 끌어당기는 최상의 궁합입니다.';
    case 'A': return '좋은 궁합입니다. 서로를 보완하며 함께 성장할 수 있습니다.';
    case 'B': return '무난한 궁합입니다. 노력하면 좋은 관계를 유지할 수 있습니다.';
    case 'C': return '다소 마찰이 있을 수 있지만, 이해와 노력으로 극복 가능합니다.';
    case 'D': return '도전적인 궁합입니다. 서로 다름을 인정하는 것이 중요합니다.';
  }
}

function buildAdvice(
  dayGanType: string,
  dayJiType: string,
  ohaengScore: number,
  guseongScore: number,
): string[] {
  const advice: string[] = [];

  if (dayGanType === '천간합') {
    advice.push('일간이 합하여 천생의 인연입니다. 서로에 대한 신뢰를 꾸준히 쌓아가세요.');
  } else if (dayGanType === '천간충') {
    advice.push('일간이 충하여 갈등이 있을 수 있습니다. 대화로 풀어가는 습관이 중요합니다.');
  }

  if (dayJiType === '육합') {
    advice.push('일지가 육합하여 감정적 교류가 깊습니다. 함께하는 시간이 행복의 원천이 됩니다.');
  } else if (dayJiType === '충') {
    advice.push('일지가 충하여 가정 내 마찰에 주의하세요. 서로의 공간을 존중해 주세요.');
  }

  if (ohaengScore < 10) {
    advice.push('두 사람의 오행이 편중되어 있습니다. 부족한 오행 방향의 활동을 함께 해보세요.');
  }

  if (guseongScore >= 18) {
    advice.push('본명성이 상생하여 함께할수록 시너지가 납니다.');
  }

  if (advice.length === 0) {
    advice.push('서로의 장점을 살리고 부족한 부분을 보완해 나가세요.');
  }

  return advice;
}

export function calculateCompatibility(input: CompatibilityInput): CompatibilityResult {
  const palja1 = calculatePalja(
    {
      year: input.person1.year,
      month: input.person1.month,
      day: input.person1.day,
      hour: input.person1.hour,
      minute: input.person1.minute,
      gender: input.person1.gender,
      isLunar: input.person1.isLunar ?? false,
      isLeapMonth: input.person1.isLunar ? input.person1.isLeapMonth ?? false : false,
      birthPlace: input.person1.birthPlace ?? null,
    },
    input.person1.calculateOptions,
  );

  const palja2 = calculatePalja(
    {
      year: input.person2.year,
      month: input.person2.month,
      day: input.person2.day,
      hour: input.person2.hour,
      minute: input.person2.minute,
      gender: input.person2.gender,
      isLunar: input.person2.isLunar ?? false,
      isLeapMonth: input.person2.isLunar ? input.person2.isLeapMonth ?? false : false,
      birthPlace: input.person2.birthPlace ?? null,
    },
    input.person2.calculateOptions,
  );

  // 1. 일간 점수 (30점 만점)
  const dayGan = calculateDayGanScore(palja1.dayGan, palja2.dayGan);

  // 2. 일지 점수 (25점 만점)
  const dayJi = calculateDayJiScore(palja1.dayJi, palja2.dayJi);

  // 3. 오행 보완도 (25점 만점)
  const ohaeng = calculateOhaengComplementScore(palja1, palja2);

  // 4. 구성 궁합 (20점 만점)
  const sc1 = calculateSeoncheonsu(palja1);
  const hg1 = calculateHongguksu(sc1);
  const bm1 = getBonmyeongseong(hg1);

  const sc2 = calculateSeoncheonsu(palja2);
  const hg2 = calculateHongguksu(sc2);
  const bm2 = getBonmyeongseong(hg2);

  const guseong = calculateGuseongScore(bm1.ohaeng, bm2.ohaeng);

  const totalScore = dayGan.score + dayJi.score + ohaeng.score + guseong.score;
  const grade = getGrade(totalScore);

  return {
    totalScore,
    grade,
    summary: getGradeSummary(grade),
    categories: [
      {
        key: 'dayGan',
        name: '성격 궁합',
        score: dayGan.score,
        maxScore: 30,
        description: dayGan.description,
        details: [`일간 관계: ${dayGan.type}`],
      },
      {
        key: 'dayJi',
        name: '감정 궁합',
        score: dayJi.score,
        maxScore: 25,
        description: dayJi.description,
        details: [`일지 관계: ${dayJi.type}`],
      },
      {
        key: 'ohaeng',
        name: '오행 균형',
        score: ohaeng.score,
        maxScore: 25,
        description: ohaeng.description,
        details: [],
      },
      {
        key: 'guseong',
        name: '기운 조화',
        score: guseong.score,
        maxScore: 20,
        description: guseong.description,
        details: [`${bm1.name} × ${bm2.name}`],
      },
    ],
    dayGanRelation: { type: dayGan.type, description: dayGan.description },
    dayJiRelation: { type: dayJi.type, description: dayJi.description },
    ohaengComplement: { score: ohaeng.score, description: ohaeng.description },
    guseongRelation: { score: guseong.score, description: guseong.description },
    advice: buildAdvice(dayGan.type, dayJi.type, ohaeng.score, guseong.score),
    person1Palja: palja1,
    person2Palja: palja2,
  };
}
