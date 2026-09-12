import type { Ohaeng, Palja } from '@/engine/types';
import { getOhaengForGan, getOhaengForJi } from '@/engine/adapter/hanja-mapper';

// ---------- 천간합 ----------

const GANHAP_PAIRS: Array<{ gan1: string; gan2: string; name: string }> = [
  { gan1: '甲', gan2: '己', name: '갑기합' },
  { gan1: '乙', gan2: '庚', name: '을경합' },
  { gan1: '丙', gan2: '辛', name: '병신합' },
  { gan1: '丁', gan2: '壬', name: '정임합' },
  { gan1: '戊', gan2: '癸', name: '무계합' },
];

// 천간충: 갑경, 을신, 병임, 정계, 무(없음)
const GANCHUNG_PAIRS: Array<[string, string]> = [
  ['甲', '庚'], ['乙', '辛'], ['丙', '壬'], ['丁', '癸'],
];

// ---------- 지지 관계 ----------

const YUKHAP_PAIRS: Array<[string, string]> = [
  ['子', '丑'], ['寅', '亥'], ['卯', '戌'],
  ['辰', '酉'], ['巳', '申'], ['午', '未'],
];

const CHUNG_PAIRS: Array<[string, string]> = [
  ['子', '午'], ['丑', '未'], ['寅', '申'],
  ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
];

const HYEONG_PAIRS: Array<[string, string]> = [
  ['寅', '巳'], ['巳', '申'], ['寅', '申'],
  ['丑', '戌'], ['戌', '未'], ['丑', '未'],
  ['子', '卯'],
];

// ---------- 오행 관계 ----------

const SAENGSAENG: Record<Ohaeng, Ohaeng> = {
  '목': '화', '화': '토', '토': '금', '금': '수', '수': '목',
};

function isPairMatch(pairs: Array<[string, string]>, a: string, b: string): boolean {
  return pairs.some(([p1, p2]) => (p1 === a && p2 === b) || (p1 === b && p2 === a));
}

/**
 * 일간(日干) 궁합 점수 — 최대 30점
 * 천간합: +30, 같은 오행(비화): +15, 상생: +20, 충: -5, 상극: +5
 */
export function calculateDayGanScore(
  dayGan1: string,
  dayGan2: string,
): { score: number; type: string; description: string } {
  // 천간합 체크
  const hap = GANHAP_PAIRS.find(
    (p) =>
      (p.gan1 === dayGan1 && p.gan2 === dayGan2) ||
      (p.gan1 === dayGan2 && p.gan2 === dayGan1),
  );
  if (hap) {
    return { score: 30, type: '천간합', description: `${hap.name} — 서로를 끌어당기는 최고의 궁합` };
  }

  // 천간충 체크
  if (isPairMatch(GANCHUNG_PAIRS, dayGan1, dayGan2)) {
    return { score: 5, type: '천간충', description: '강한 긴장감이 있지만 성장의 기회가 될 수 있음' };
  }

  const oh1 = getOhaengForGan(dayGan1);
  const oh2 = getOhaengForGan(dayGan2);
  if (!oh1 || !oh2) {
    return { score: 15, type: '보통', description: '특별한 관계 없음' };
  }

  // 같은 오행
  if (oh1 === oh2) {
    return { score: 15, type: '비화', description: '같은 기운으로 이해심이 깊으나 변화가 적을 수 있음' };
  }

  // 상생 체크
  if (SAENGSAENG[oh1] === oh2 || SAENGSAENG[oh2] === oh1) {
    return { score: 20, type: '상생', description: '서로를 자연스럽게 돕는 좋은 관계' };
  }

  // 상극
  return { score: 10, type: '상극', description: '부딪힘이 있지만 서로 다름에서 배울 수 있음' };
}

/**
 * 일지(日支) 궁합 점수 — 최대 25점
 * 육합: +25, 삼합(부분): +18, 충: +3, 형: +5, 기타 상생/비화/상극
 */
export function calculateDayJiScore(
  dayJi1: string,
  dayJi2: string,
): { score: number; type: string; description: string } {
  if (isPairMatch(YUKHAP_PAIRS, dayJi1, dayJi2)) {
    return { score: 25, type: '육합', description: '서로의 에너지가 자연스럽게 합쳐지는 최고의 배합' };
  }

  if (isPairMatch(CHUNG_PAIRS, dayJi1, dayJi2)) {
    return { score: 3, type: '충', description: '충돌이 잦지만 역동적인 관계로 발전 가능' };
  }

  if (isPairMatch(HYEONG_PAIRS, dayJi1, dayJi2)) {
    return { score: 5, type: '형', description: '마찰이 있으나 서로 단련시키는 관계' };
  }

  const oh1 = getOhaengForJi(dayJi1);
  const oh2 = getOhaengForJi(dayJi2);
  if (!oh1 || !oh2) {
    return { score: 12, type: '보통', description: '무난한 관계' };
  }

  if (oh1 === oh2) {
    return { score: 15, type: '비화', description: '비슷한 성향으로 편안한 관계' };
  }

  if (SAENGSAENG[oh1] === oh2 || SAENGSAENG[oh2] === oh1) {
    return { score: 18, type: '상생', description: '서로를 보완하는 조화로운 관계' };
  }

  return { score: 8, type: '상극', description: '서로 다른 방향이지만 균형을 찾을 수 있음' };
}

/**
 * 오행 보완도 — 최대 25점
 * 두 팔자의 오행 분포를 합산하여 균형도를 측정
 */
export function calculateOhaengComplementScore(
  palja1: Palja,
  palja2: Palja,
): { score: number; description: string } {
  const ohaengCount: Record<Ohaeng, number> = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };

  function countPalja(p: Palja) {
    for (const gan of [p.yearGan, p.monthGan, p.dayGan, p.hourGan]) {
      const oh = getOhaengForGan(gan);
      if (oh) ohaengCount[oh]++;
    }
    for (const ji of [p.yearJi, p.monthJi, p.dayJi, p.hourJi]) {
      const oh = getOhaengForJi(ji);
      if (oh) ohaengCount[oh]++;
    }
  }

  countPalja(palja1);
  countPalja(palja2);

  // 16글자 중 오행 분포 균형도 (이상적: 각 3.2개)
  const ideal = 16 / 5;
  const deviations = Object.values(ohaengCount).map((c) => Math.abs(c - ideal));
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / 5;

  // 0이면 완벽 균형(25점), 편차가 클수록 감점
  const score = Math.round(Math.max(0, 25 - avgDeviation * 5));

  const missing = (Object.entries(ohaengCount) as [Ohaeng, number][])
    .filter(([, count]) => count === 0)
    .map(([oh]) => oh);

  const description = missing.length > 0
    ? `두 사람이 합쳐도 ${missing.join(', ')} 오행이 부족합니다`
    : score >= 20
      ? '두 사람의 오행이 서로를 잘 보완하여 균형이 좋습니다'
      : '오행 분포에 약간의 편중이 있지만 큰 문제는 아닙니다';

  return { score, description };
}

/**
 * 구성(九星) 궁합 점수 — 최대 20점
 * 두 사람 본명성의 오행 관계로 판별
 */
export function calculateGuseongScore(
  bonmyeong1Ohaeng: Ohaeng,
  bonmyeong2Ohaeng: Ohaeng,
): { score: number; description: string } {
  if (bonmyeong1Ohaeng === bonmyeong2Ohaeng) {
    return { score: 12, description: '같은 기운의 본명성 — 이해가 깊지만 새로운 자극이 부족할 수 있음' };
  }

  if (
    SAENGSAENG[bonmyeong1Ohaeng] === bonmyeong2Ohaeng ||
    SAENGSAENG[bonmyeong2Ohaeng] === bonmyeong1Ohaeng
  ) {
    return { score: 20, description: '본명성이 서로 상생 — 자연스럽게 도우며 시너지를 냅니다' };
  }

  return { score: 5, description: '본명성이 서로 상극 — 갈등이 있으나 노력으로 극복 가능' };
}
