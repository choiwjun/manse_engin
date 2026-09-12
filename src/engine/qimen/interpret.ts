// @TASK P9-R1-T2 - 기문둔갑 포국 해석 엔진
// @SPEC docs/planning/06-tasks.md#P9-R1-T2

import type {
  QimenPalace,
  QimenResult,
  QimenGyeokguk,
  QimenPalaceInterpretation,
  QimenYongsin,
  QimenInterpretation,
  Ohaeng,
} from '@/engine/types';
import {
  GATE_FORTUNE_BY_HANJA,
  STAR_FORTUNE,
} from './constants';

// ---------- 오행 판별 ----------

/** 천간 -> 오행 매핑 */
const STEM_OHAENG: Record<string, Ohaeng> = {
  '甲': '목', '乙': '목',
  '丙': '화', '丁': '화',
  '戊': '토', '己': '토',
  '庚': '금', '辛': '금',
  '壬': '수', '癸': '수',
};

/**
 * 천간의 오행을 반환한다.
 *
 * @param stem - 천간 한자 (예: '甲')
 * @returns 오행 ('목' | '화' | '토' | '금' | '수')
 */
export function getStemOhaeng(stem: string): Ohaeng {
  const oh = STEM_OHAENG[stem];
  if (!oh) throw new Error(`유효하지 않은 천간: ${stem}`);
  return oh;
}

// ---------- 상생/상극 테이블 ----------

/** 상생 관계: key가 value를 생한다 (목->화, 화->토, 토->금, 금->수, 수->목) */
const GENERATES: Record<Ohaeng, Ohaeng> = {
  '목': '화',
  '화': '토',
  '토': '금',
  '금': '수',
  '수': '목',
};

/** 상극 관계: key가 value를 극한다 (목->토, 화->금, 토->수, 금->목, 수->화) */
const OVERCOMES: Record<Ohaeng, Ohaeng> = {
  '목': '토',
  '화': '금',
  '토': '수',
  '금': '목',
  '수': '화',
};

/**
 * 두 천간 사이의 오행 관계를 판별한다.
 *
 * 천반간(a)이 지반간(b)에 대해:
 * - 비화: 같은 오행
 * - 상생: a가 b를 생함
 * - 피생: b가 a를 생함 (a가 b로부터 생 받음)
 * - 상극: a가 b를 극함
 * - 피극: b가 a를 극함 (a가 b로부터 극 당함)
 *
 * @param stemA - 천반간 (위)
 * @param stemB - 지반간 (아래)
 * @returns 관계 문자열
 */
export function getStemRelation(
  stemA: string,
  stemB: string,
): '비화' | '상생' | '피생' | '상극' | '피극' {
  const ohA = getStemOhaeng(stemA);
  const ohB = getStemOhaeng(stemB);

  if (ohA === ohB) return '비화';
  if (GENERATES[ohA] === ohB) return '상생';
  if (GENERATES[ohB] === ohA) return '피생';
  if (OVERCOMES[ohA] === ohB) return '상극';
  if (OVERCOMES[ohB] === ohA) return '피극';

  // 이론적으로 도달 불가능하지만 안전장치
  return '비화';
}

// ---------- 오행 관계 해석 텍스트 ----------

const RELATION_DESCRIPTIONS: Record<string, string> = {
  '비화': '천반과 지반이 같은 오행으로 조화를 이룸. 안정적이나 변화가 적음.',
  '상생': '천반이 지반을 생하여 에너지가 아래로 흘러내림. 사업의 밑거름이 됨.',
  '피생': '지반이 천반을 생하여 에너지가 위로 상승함. 도움을 받는 형국.',
  '상극': '천반이 지반을 극하여 아래를 제압함. 적극적 행동에 유리하나 충돌 주의.',
  '피극': '지반이 천반을 극하여 위가 눌림. 저항을 받는 형국으로 신중해야 함.',
};

// ---------- 문성 조합 해석 ----------

/**
 * 문(gate)과 성(star) 조합의 길흉과 해석 텍스트를 반환한다.
 */
interface GateStarCombo {
  fortune: '길' | '흉' | '평';
  description: string;
}

/** 특수 문성 조합 (우선순위 판별) */
const GATE_STAR_COMBOS: Record<string, GateStarCombo> = {
  '개문+천심': { fortune: '길', description: '개문과 천심의 만남. 만사형통하는 대길한 조합.' },
  '생문+천임': { fortune: '길', description: '생문과 천임의 만남. 재물운이 최상인 대길한 조합.' },
  '개문+천보': { fortune: '길', description: '개문과 천보의 만남. 학문과 시험에 유리한 조합.' },
  '휴문+천심': { fortune: '길', description: '휴문과 천심의 만남. 휴식과 안정에 좋은 조합.' },
  '생문+천보': { fortune: '길', description: '생문과 천보의 만남. 재물과 학업에 길한 조합.' },
  '휴문+천임': { fortune: '길', description: '휴문과 천임의 만남. 안정적 재물운을 가진 조합.' },
  '개문+천임': { fortune: '길', description: '개문과 천임의 만남. 사업 확장에 길한 조합.' },
  '사문+천봉': { fortune: '흉', description: '사문과 천봉의 만남. 위험하고 대흉한 조합. 행동을 삼가야 함.' },
  '상문+천예': { fortune: '흉', description: '상문과 천예의 만남. 질병이나 손상의 우려가 있는 흉한 조합.' },
  '경문+천주': { fortune: '흉', description: '경문(驚門)과 천주의 만남. 구설과 놀라운 일이 생기는 흉한 조합.' },
  '사문+천예': { fortune: '흉', description: '사문과 천예의 만남. 질병과 재앙이 겹치는 흉한 조합.' },
  '두문+천봉': { fortune: '흉', description: '두문과 천봉의 만남. 은밀한 위험이 도사리는 흉한 조합.' },
};

/**
 * 문의 길흉을 한자 기반으로 판별한다.
 * (경문 = 景門(평) vs 驚門(흉) 구분)
 */
function getGateFortune(gateHanja: string): '길' | '흉' | '평' {
  return GATE_FORTUNE_BY_HANJA[gateHanja] ?? '평';
}

/**
 * 성의 길흉을 판별한다.
 */
function getStarFortune(starName: string): '길' | '흉' | '평' {
  return STAR_FORTUNE[starName] ?? '평';
}

/**
 * 문성 조합 해석 텍스트와 길흉을 반환한다.
 */
function interpretGateStarCombo(
  gateName: string,
  gateHanja: string,
  starName: string,
): GateStarCombo {
  // 1. 특수 조합 우선 확인
  const comboKey = `${gateName}+${starName}`;
  const special = GATE_STAR_COMBOS[comboKey];
  if (special) return special;

  // 2. 개별 길흉 합산
  const gateFortune = getGateFortune(gateHanja);
  const starFortune = getStarFortune(starName);

  const fortuneScore: Record<string, number> = { '길': 1, '평': 0, '흉': -1 };
  const total = (fortuneScore[gateFortune] ?? 0) + (fortuneScore[starFortune] ?? 0);

  let fortune: '길' | '흉' | '평';
  if (total >= 1) fortune = '길';
  else if (total <= -1) fortune = '흉';
  else fortune = '평';

  // 3. 일반 해석 텍스트 생성
  const gateLabel = gateFortune === '길' ? '길문' : gateFortune === '흉' ? '흉문' : '중성문';
  const starLabel = starFortune === '길' ? '길성' : starFortune === '흉' ? '흉성' : '중성';
  const fortuneLabel = fortune === '길' ? '길한' : fortune === '흉' ? '흉한' : '평범한';

  return {
    fortune,
    description: `${gateName}(${gateLabel})과 ${starName}(${starLabel})의 조합. ${fortuneLabel} 기운.`,
  };
}

// ---------- 방위 매핑 ----------

/** 궁 번호 -> 방위 */
const PALACE_DIRECTION: Record<number, string> = {
  1: '북', 2: '남서', 3: '동', 4: '남동',
  5: '중앙', 6: '북서', 7: '서', 8: '북동', 9: '남',
};

// ---------- 궁별 해석 ----------

/**
 * 단일 궁의 해석을 생성한다.
 *
 * - 천반간과 지반간의 오행 관계(생/극/비화) 해석
 * - 문(gate)과 성(star)의 길흉 조합 해석
 * - 궁별 종합 길흉 판별 (길/흉/평)
 * - summary 텍스트 생성
 *
 * @param palace - QimenPalace 포국 궁 데이터
 * @returns QimenPalaceInterpretation
 */
export function interpretPalace(palace: QimenPalace): QimenPalaceInterpretation {
  // 1. 천지반 관계 해석
  const relation = getStemRelation(palace.heavenStem, palace.earthStem);
  const ohA = getStemOhaeng(palace.heavenStem);
  const ohB = getStemOhaeng(palace.earthStem);
  const stemRelation = `천반 ${palace.heavenStem}(${ohA})과 지반 ${palace.earthStem}(${ohB})은 ${relation} 관계. ${RELATION_DESCRIPTIONS[relation]}`;

  // 2. 문성 조합 해석
  const combo = interpretGateStarCombo(palace.gate, palace.gateHanja, palace.star);
  const gateStarRelation = combo.description;

  // 3. 종합 길흉 판별
  // 천지반 관계 점수
  const relationScore: Record<string, number> = {
    '비화': 0, '상생': 1, '피생': 1, '상극': -1, '피극': -2,
  };
  const rScore = relationScore[relation] ?? 0;

  // 문성 조합 점수
  const comboScore: Record<string, number> = { '길': 2, '평': 0, '흉': -2 };
  const cScore = comboScore[combo.fortune] ?? 0;

  // 공망 감점
  const voidPenalty = palace.isVoid ? -1 : 0;

  const totalScore = rScore + cScore + voidPenalty;

  let fortune: '길' | '흉' | '평';
  if (totalScore >= 2) fortune = '길';
  else if (totalScore <= -2) fortune = '흉';
  else fortune = '평';

  // 4. summary 생성
  const summaryParts: string[] = [];
  summaryParts.push(`${palace.name}(${PALACE_DIRECTION[palace.index] ?? ''}방).`);
  summaryParts.push(stemRelation);
  summaryParts.push(gateStarRelation);

  if (palace.isVoid) {
    summaryParts.push('공망에 해당하여 기운이 약화됨.');
  }

  const fortuneLabel = fortune === '길' ? '길한 궁' : fortune === '흉' ? '흉한 궁' : '보통 궁';
  summaryParts.push(`종합: ${fortuneLabel}.`);

  return {
    palaceIndex: palace.index,
    palaceName: palace.name,
    stemRelation,
    gateStarRelation,
    fortune,
    summary: summaryParts.join(' '),
  };
}

// ---------- 용신 찾기 ----------

/** 궁 점수 계산 (용신 선정용) */
function scorePalace(palace: QimenPalace): number {
  // 문 길흉
  const gateFortune = getGateFortune(palace.gateHanja);
  const gateScore: Record<string, number> = { '길': 3, '평': 0, '흉': -3 };

  // 성 길흉
  const starFortune = getStarFortune(palace.star);
  const starScore: Record<string, number> = { '길': 2, '평': 0, '흉': -2 };

  // 천지반 관계
  const relation = getStemRelation(palace.heavenStem, palace.earthStem);
  const relScore: Record<string, number> = {
    '비화': 0, '상생': 1, '피생': 2, '상극': -1, '피극': -2,
  };

  // 공망 감점
  const voidPenalty = palace.isVoid ? -3 : 0;

  // 특수 조합 보너스
  const comboKey = `${palace.gate}+${palace.star}`;
  const specialBonus = GATE_STAR_COMBOS[comboKey]
    ? (GATE_STAR_COMBOS[comboKey].fortune === '길' ? 3 : -3)
    : 0;

  return (gateScore[gateFortune] ?? 0)
    + (starScore[starFortune] ?? 0)
    + (relScore[relation] ?? 0)
    + voidPenalty
    + specialBonus;
}

/** 행동 추천 텍스트 매핑 */
const GATE_ACTION: Record<string, string> = {
  '개문': '사업 시작, 관직 진출, 계약 체결에 적합',
  '휴문': '휴식, 명상, 기도, 만남에 적합',
  '생문': '재물 획득, 투자, 부동산 거래에 적합',
  '두문': '은밀한 일, 비밀 유지, 숨는 것에 적합',
  '경문': '학문, 문서, 시험, 예술 활동에 적합',
  '사문': '행동을 자제해야 함. 무리한 추진 금지',
  '상문': '행동을 자제해야 함. 다툼과 손상 주의',
};

/**
 * 용신(가장 길한 궁 추천)을 찾는다.
 *
 * - 시간 용신: 길한 시간대 추천
 * - 방향 용신: 길한 방위 추천
 * - 행동 용신: 적합한 행동 추천
 *
 * @param result - QimenResult 포국 결과
 * @returns QimenYongsin[] 용신 배열 (최소 3개: 시간/방향/행동)
 */
export function findYongsin(result: QimenResult): QimenYongsin[] {
  // 중궁(5) 제외하고 점수 계산
  const scored = result.palaces
    .filter((p) => p.index !== 5)
    .map((p) => ({ palace: p, score: scorePalace(p) }))
    .sort((a, b) => b.score - a.score);

  const yongsinList: QimenYongsin[] = [];

  // 가장 길한 궁 (최고 점수)
  const best = scored[0];
  if (!best) return yongsinList;

  const direction = PALACE_DIRECTION[best.palace.index] ?? '중앙';

  // 시간 용신
  yongsinList.push({
    type: '시간',
    palaceIndex: best.palace.index,
    palaceName: best.palace.name,
    reason: `${best.palace.name}이 가장 길한 궁(${best.palace.gate}+${best.palace.star}). `
      + `${best.palace.deity} 신의 도움을 받을 수 있는 시간대가 유리.`,
  });

  // 방향 용신
  yongsinList.push({
    type: '방향',
    palaceIndex: best.palace.index,
    palaceName: best.palace.name,
    reason: `${direction}방이 가장 길한 방위. `
      + `${best.palace.gate}과 ${best.palace.star}이 조합된 ${best.palace.name} 방향으로 행동하면 유리.`,
  });

  // 행동 용신: 가장 길한 궁의 문에 따른 행동 추천
  const action = GATE_ACTION[best.palace.gate] ?? '상황에 따라 유연하게 대처';
  yongsinList.push({
    type: '행동',
    palaceIndex: best.palace.index,
    palaceName: best.palace.name,
    reason: `${best.palace.gate}이 위치한 ${best.palace.name}: ${action}.`,
  });

  // 차선 궁도 방향 용신으로 추가 (있으면)
  if (scored.length > 1 && scored[1].score > 0) {
    const second = scored[1];
    const secondDir = PALACE_DIRECTION[second.palace.index] ?? '중앙';
    yongsinList.push({
      type: '방향',
      palaceIndex: second.palace.index,
      palaceName: second.palace.name,
      reason: `${secondDir}방도 길한 방위. `
        + `${second.palace.gate}과 ${second.palace.star}의 조합이 양호.`,
    });
  }

  return yongsinList;
}

// ---------- 격국 해석 ----------

/**
 * 격국이 있으면 상세 해석 텍스트를 반환한다.
 *
 * @param gyeokguk - 격국 정보 (null이면 빈 문자열)
 * @returns 해석 텍스트
 */
export function interpretGyeokguk(gyeokguk: QimenGyeokguk | null): string {
  if (!gyeokguk) return '';

  const fortuneLabel = gyeokguk.fortune === '길' ? '길한 격국' : '흉한 격국';

  return `${gyeokguk.name}(${gyeokguk.hanja}): ${fortuneLabel}. ${gyeokguk.description}`;
}

// ---------- 전체 포국 해석 ----------

/**
 * 전체 포국 해석 (메인 함수).
 *
 * - 9궁 각각 해석
 * - 용신 추천
 * - 격국 해석
 * - 종합 요약 생성
 *
 * @param result - QimenResult 포국 결과
 * @returns QimenInterpretation
 */
export function interpretResult(result: QimenResult): QimenInterpretation {
  // 1. 9궁 각각 해석
  const palaceInterpretations = result.palaces.map((p) => interpretPalace(p));

  // 2. 용신 추천
  const yongsin = findYongsin(result);

  // 3. 격국 해석
  const gyeokgukInterpretation = interpretGyeokguk(result.gyeokguk);

  // 4. 종합 요약 생성
  const summaryParts: string[] = [];

  // 기본 정보
  summaryParts.push(
    `${result.dunType} ${result.bureauNumber}국, `
    + `${result.solarTerm} ${result.yuan}.`,
  );
  summaryParts.push(
    `일간: ${result.dayGan}${result.dayJi}, `
    + `시간: ${result.hourGan}${result.hourJi}.`,
  );

  // 격국
  if (gyeokgukInterpretation) {
    summaryParts.push(gyeokgukInterpretation);
  }

  // 길/흉 궁 집계
  const gilCount = palaceInterpretations.filter((p) => p.fortune === '길').length;
  const hyungCount = palaceInterpretations.filter((p) => p.fortune === '흉').length;
  const pyeongCount = palaceInterpretations.filter((p) => p.fortune === '평').length;
  summaryParts.push(`길한 궁 ${gilCount}개, 흉한 궁 ${hyungCount}개, 평 ${pyeongCount}개.`);

  // 용신 추천 요약
  if (yongsin.length > 0) {
    const bestYongsin = yongsin.find((y) => y.type === '방향');
    if (bestYongsin) {
      const dir = PALACE_DIRECTION[bestYongsin.palaceIndex] ?? '';
      summaryParts.push(`추천 방위: ${dir}방(${bestYongsin.palaceName}).`);
    }
  }

  // 직부/직사 정보
  summaryParts.push(`직부성: ${result.zhifu}, 직사문: ${result.zhishi}.`);

  return {
    palaceInterpretations,
    yongsin,
    gyeokgukInterpretation,
    summary: summaryParts.join(' '),
  };
}
