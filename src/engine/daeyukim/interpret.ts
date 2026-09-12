// @TASK P10-R1-T2 - 대육임(大六壬) 해석 엔진
// @SPEC docs/planning/06-tasks.md#P10-R1-T2
// @TEST tests/engine/daeyukim-interpret.test.ts

import type {
  Ohaeng,
  SaGwaItem,
  SamJeonItem,
  DaeyukimResult,
  DaeyukimInterpretation,
} from '@/engine/types';

// ---------- 지지 오행 매핑 ----------

/** 12지지 -> 오행 매핑 */
const BRANCH_OHAENG: Record<string, Ohaeng> = {
  '子': '수', '丑': '토', '寅': '목', '卯': '목',
  '辰': '토', '巳': '화', '午': '화', '未': '토',
  '申': '금', '酉': '금', '戌': '토', '亥': '수',
};

/**
 * 지지의 오행을 반환한다.
 *
 * @param branch - 지지 한자 (예: '子')
 * @returns 오행 ('목' | '화' | '토' | '금' | '수')
 */
export function getBranchOhaeng(branch: string): Ohaeng {
  const oh = BRANCH_OHAENG[branch];
  if (!oh) throw new Error(`유효하지 않은 지지: ${branch}`);
  return oh;
}

// ---------- 오행 상생/상극 테이블 ----------

/** 상생 관계: key가 value를 생한다 */
const GENERATES: Record<Ohaeng, Ohaeng> = {
  '목': '화',
  '화': '토',
  '토': '금',
  '금': '수',
  '수': '목',
};

/** 상극 관계: key가 value를 극한다 */
const OVERCOMES: Record<Ohaeng, Ohaeng> = {
  '목': '토',
  '화': '금',
  '토': '수',
  '금': '목',
  '수': '화',
};

/**
 * 두 오행 사이의 관계를 판별한다.
 *
 * a가 b에 대해:
 * - 비화: 같은 오행
 * - 상생: a가 b를 생함
 * - 피생: b가 a를 생함 (a가 b로부터 생 받음)
 * - 상극: a가 b를 극함
 * - 피극: b가 a를 극함 (a가 b로부터 극 당함)
 *
 * @param a - 첫 번째 오행 (상신 기준)
 * @param b - 두 번째 오행 (하신 기준)
 * @returns 관계 문자열
 */
export function getOhaengRelation(
  a: Ohaeng,
  b: Ohaeng,
): '비화' | '상생' | '피생' | '상극' | '피극' {
  if (a === b) return '비화';
  if (GENERATES[a] === b) return '상생';
  if (GENERATES[b] === a) return '피생';
  if (OVERCOMES[a] === b) return '상극';
  if (OVERCOMES[b] === a) return '피극';

  // 이론적으로 도달 불가능하지만 안전장치
  return '비화';
}

// ---------- 오행 관계 -> fortune 매핑 ----------

/**
 * 사과에서의 상신-하신 오행 관계에 따른 길흉 판별.
 *
 * - 상신이 하신을 생(生): 길 (에너지를 주는 관계)
 * - 하신이 상신을 생(피생): 평 (도움을 받지만 능동적이지 않음)
 * - 상신이 하신을 극(克): 흉 (적대적 관계)
 * - 하신이 상신을 극(피극): 평~길 (저항을 받지만 상신이 당하는 것)
 * - 같은 오행(비화): 평
 */
function saGwaFortuneFromRelation(
  relation: '비화' | '상생' | '피생' | '상극' | '피극',
): '길' | '흉' | '평' {
  switch (relation) {
    case '상생': return '길';
    case '상극': return '흉';
    case '피생': return '평';
    case '피극': return '평';
    case '비화': return '평';
    default: return '평';
  }
}

// ---------- 오행 관계 해석 텍스트 ----------

const SAGWA_RELATION_DESC: Record<string, string> = {
  '상생': '상신이 하신을 생하여 에너지가 흘러내림. 순조로운 기운.',
  '피생': '하신이 상신을 생하여 도움을 받는 형국. 수동적이나 안정적.',
  '상극': '상신이 하신을 극하여 충돌이 발생함. 갈등과 변화의 기운.',
  '피극': '하신이 상신을 극하여 저항을 받음. 신중한 대처가 필요.',
  '비화': '상신과 하신이 같은 오행으로 조화를 이룸. 안정적이나 변화가 적음.',
};

// ---------- 사과 해석 ----------

/**
 * 사과(四課) 각 과의 상하신 오행 관계를 해석한다.
 *
 * 각 과의 upper(상신)와 lower(하신) 지지의 오행 관계를 분석하여
 * fortune(길흉평)과 summary 텍스트를 생성한다.
 *
 * @param saGwa - 4개 사과 항목
 * @returns 사과 해석 배열
 */
export function interpretSaGwa(
  saGwa: SaGwaItem[],
): DaeyukimInterpretation['saGwaInterpretation'] {
  return saGwa.map((gwa) => {
    const upperOh = getBranchOhaeng(gwa.upper);
    const lowerOh = getBranchOhaeng(gwa.lower);
    const relation = getOhaengRelation(upperOh, lowerOh);
    const fortune = saGwaFortuneFromRelation(relation);

    const fortuneLabel = fortune === '길' ? '길한 과' : fortune === '흉' ? '흉한 과' : '평범한 과';
    const desc = SAGWA_RELATION_DESC[relation] ?? '';
    const summary = `제${gwa.index}과: 상신 ${gwa.upper}(${upperOh})과 하신 ${gwa.lower}(${lowerOh})은 ${relation} 관계. ${desc} ${fortuneLabel}.`;

    return {
      index: gwa.index,
      relation,
      fortune,
      summary,
    };
  });
}

// ---------- 천장 길흉 ----------

/** 12천장 길흉 (이름 기반) */
const CHEONJANG_FORTUNE: Record<string, '길' | '흉' | '평'> = {
  '귀인': '길',
  '등사': '흉',
  '주작': '평',
  '육합': '길',
  '구진': '흉',
  '청룡': '길',
  '천공': '흉',
  '백호': '흉',
  '태상': '길',
  '현무': '흉',
  '태음': '길',
  '천후': '길',
};

/** 천장 해석 텍스트 (이름 기반) */
const CHEONJANG_DESC: Record<string, string> = {
  '귀인': '귀인의 도움이 있어 만사형통의 기운.',
  '등사': '근심과 걱정이 따르는 기운. 신중해야 함.',
  '주작': '문서/구설과 관련된 일이 생길 수 있음.',
  '육합': '협력과 화합의 기운. 동업이나 합작에 유리.',
  '구진': '분쟁과 다툼이 생길 수 있는 기운. 조심해야 함.',
  '청룡': '재물운이 좋고 발전의 기운이 있음.',
  '천공': '허위와 거짓에 주의해야 하는 기운.',
  '백호': '질병이나 손실에 주의해야 하는 기운.',
  '태상': '안정적이고 평온한 기운. 의식주가 풍족함.',
  '현무': '도적이나 분실에 주의해야 하는 기운.',
  '태음': '음덕(숨은 도움)이 있는 기운. 비밀스런 도움.',
  '천후': '귀인의 도움이 있고 여성 귀인이 유리함.',
};

// ---------- 삼전 해석 ----------

/**
 * 삼전(三傳) 흐름을 해석한다.
 *
 * 초전->중전->말전의 오행 흐름과 각 전에 배속된 천장의 길흉을
 * 결합하여 fortune과 summary를 생성한다.
 *
 * @param samJeon - 3개 삼전 항목
 * @returns 삼전 해석 배열
 */
export function interpretSamJeon(
  samJeon: SamJeonItem[],
): DaeyukimInterpretation['samJeonInterpretation'] {
  // 인접 전 간의 오행 흐름 분석
  const flows: ('상생' | '상극' | '피생' | '피극' | '비화')[] = [];
  for (let i = 0; i < samJeon.length - 1; i++) {
    const fromOh = getBranchOhaeng(samJeon[i].branch);
    const toOh = getBranchOhaeng(samJeon[i + 1].branch);
    flows.push(getOhaengRelation(fromOh, toOh));
  }

  // 흐름 특성 판별
  const isAllSangsaeng = flows.every((f) => f === '상생');
  const isAllSanggeuk = flows.every((f) => f === '상극');

  return samJeon.map((jeon, idx) => {
    const jeonOh = getBranchOhaeng(jeon.branch);

    // 1. 천장 길흉 점수
    let cheonJangScore = 0;
    let cheonJangDesc = '';
    if (jeon.cheonJang) {
      const cjFortune = jeon.cheonJang.fortune
        ?? CHEONJANG_FORTUNE[jeon.cheonJang.name]
        ?? '평';
      const fortuneScore: Record<string, number> = { '길': 1, '평': 0, '흉': -1 };
      cheonJangScore = fortuneScore[cjFortune] ?? 0;
      cheonJangDesc = CHEONJANG_DESC[jeon.cheonJang.name] ?? '';
    }

    // 2. 흐름 점수 (해당 전이 관여하는 인접 흐름)
    let flowScore = 0;
    if (idx < flows.length) {
      // 다음 전으로의 흐름
      const flow = flows[idx];
      if (flow === '상생') flowScore += 1;
      else if (flow === '상극') flowScore -= 1;
    }
    if (idx > 0) {
      // 이전 전에서의 흐름
      const prevFlow = flows[idx - 1];
      if (prevFlow === '상생') flowScore += 1;
      else if (prevFlow === '상극') flowScore -= 1;
    }

    // 3. 연속 상생/상극 보너스
    if (isAllSangsaeng) flowScore += 1;
    if (isAllSanggeuk) flowScore -= 1;

    // 4. 종합 점수
    const totalScore = cheonJangScore + flowScore;

    let fortune: '길' | '흉' | '평';
    if (totalScore >= 1) fortune = '길';
    else if (totalScore <= -1) fortune = '흉';
    else fortune = '평';

    // 5. summary 생성
    const summaryParts: string[] = [];
    summaryParts.push(`${jeon.name}: ${jeon.branch}(${jeonOh}).`);

    if (jeon.cheonJang) {
      summaryParts.push(`${jeon.cheonJang.name}(${jeon.cheonJang.hanja}) 배속.`);
      if (cheonJangDesc) summaryParts.push(cheonJangDesc);
    }

    // 흐름 정보 (초전, 중전만 다음 전으로의 흐름 표시)
    if (idx < flows.length) {
      const nextJeon = samJeon[idx + 1];
      const nextOh = getBranchOhaeng(nextJeon.branch);
      summaryParts.push(
        `${jeon.name}(${jeonOh})에서 ${nextJeon.name}(${nextOh})으로 ${flows[idx]} 흐름.`,
      );
    }

    // 연속 흐름 특성
    if (idx === 0) {
      if (isAllSangsaeng) {
        summaryParts.push('삼전 전체가 상생 흐름으로 순조로운 진행.');
      } else if (isAllSanggeuk) {
        summaryParts.push('삼전 전체가 상극 흐름으로 갈등과 변화가 예상됨.');
      }
    }

    const fortuneLabel = fortune === '길' ? '길한 전' : fortune === '흉' ? '흉한 전' : '평범한 전';
    summaryParts.push(`종합: ${fortuneLabel}.`);

    return {
      name: jeon.name,
      fortune,
      summary: summaryParts.join(' '),
    };
  });
}

// ---------- 과명 해석 ----------

/** 과명별 해석 텍스트 */
const GWA_MYEONG_TEXT: Record<string, string> = {
  '원수과': '질서정연하고 정도에 맞는 과. 정면돌파가 좋다. 정도를 지키면 좋은 결과를 얻을 수 있다.',
  '중심과': '복잡한 관계가 얽힌 과. 신중한 판단이 필요하다. 여러 이해관계를 잘 조율해야 한다.',
  '설기과': '이해관계가 복잡한 과. 인내가 필요하다. 성급하게 행동하면 손해를 볼 수 있다.',
  '요극과': '의외의 기회나 위험이 있는 과. 유연한 대처가 필요하다. 예상 밖의 변화에 대비해야 한다.',
  '묘성과': '평탄하지만 진전이 없는 과. 기다림이 필요하다. 서두르지 말고 때를 기다려야 한다.',
  '별책과': '특별한 방법이 필요한 과. 기존 방식으로는 해결이 어려우니 새로운 접근이 필요하다.',
  '팔전과': '반복과 순환의 과. 같은 일이 되풀이될 수 있으니 근본적 변화를 모색해야 한다.',
  '복음과': '정체와 답보의 과. 움직이기 어려운 상황이니 때를 기다려야 한다.',
  '반음과': '되돌아오는 과. 사물이 반복되거나 원점으로 돌아올 수 있다.',
};

/**
 * 과명에 따른 상세 해석 텍스트를 반환한다.
 *
 * @param gwaMyeong - 과명 문자열 (예: '원수과')
 * @returns 해석 텍스트
 */
export function interpretGwaMyeong(gwaMyeong: string): string {
  return GWA_MYEONG_TEXT[gwaMyeong] ?? `${gwaMyeong}: 해당 과에 대한 상세 해석.`;
}

// ---------- 전체 해석 ----------

/**
 * 대육임 전체 해석 (메인 함수).
 *
 * - 사과 해석 (상하신 오행 관계)
 * - 삼전 흐름 해석 (오행 흐름 + 천장 길흉)
 * - 과명 해석
 * - 종합 요약 생성
 *
 * @param result - DaeyukimResult 과식 결과
 * @returns DaeyukimInterpretation
 */
export function interpretResult(result: DaeyukimResult): DaeyukimInterpretation {
  // 1. 사과 해석
  const saGwaInterpretation = interpretSaGwa(result.saGwa);

  // 2. 삼전 해석
  const samJeonInterpretation = interpretSamJeon(result.samJeon);

  // 3. 과명 해석
  const gwaMyeongInterpretation = interpretGwaMyeong(result.gwaMyeong);

  // 4. 종합 요약 생성
  const summaryParts: string[] = [];

  // 기본 정보
  summaryParts.push(
    `${result.gwaMyeong}. `
    + `일간: ${result.dayGan}${result.dayJi}, `
    + `시지: ${result.hourJi}, `
    + `월장: ${result.wolJang}.`,
  );

  // 과명 해석 요약
  summaryParts.push(gwaMyeongInterpretation);

  // 사과 길흉 집계
  const saGwaGil = saGwaInterpretation.filter((g) => g.fortune === '길').length;
  const saGwaHyung = saGwaInterpretation.filter((g) => g.fortune === '흉').length;
  const saGwaPyeong = saGwaInterpretation.filter((g) => g.fortune === '평').length;
  summaryParts.push(
    `사과: 길 ${saGwaGil}개, 흉 ${saGwaHyung}개, 평 ${saGwaPyeong}개.`,
  );

  // 삼전 흐름 요약
  const samJeonGil = samJeonInterpretation.filter((j) => j.fortune === '길').length;
  const samJeonHyung = samJeonInterpretation.filter((j) => j.fortune === '흉').length;
  summaryParts.push(
    `삼전: 길 ${samJeonGil}개, 흉 ${samJeonHyung}개.`,
  );

  // 초전 중시 (시작의 기운)
  const choJeon = samJeonInterpretation[0];
  if (choJeon) {
    const label = choJeon.fortune === '길' ? '길하여 순조로운 시작'
      : choJeon.fortune === '흉' ? '흉하여 시작이 어려움'
      : '평범한 시작';
    summaryParts.push(`초전이 ${label}.`);
  }

  // 말전 중시 (결과의 기운)
  const malJeon = samJeonInterpretation[2];
  if (malJeon) {
    const label = malJeon.fortune === '길' ? '길하여 좋은 결과'
      : malJeon.fortune === '흉' ? '흉하여 결과가 불리'
      : '평범한 결과';
    summaryParts.push(`말전이 ${label}.`);
  }

  // 공망 정보
  if (result.voidBranches) {
    summaryParts.push(
      `공망: ${result.voidBranches[0]}${result.voidBranches[1]}.`,
    );
  }

  return {
    saGwaInterpretation,
    samJeonInterpretation,
    gwaMyeongInterpretation,
    summary: summaryParts.join(' '),
  };
}
