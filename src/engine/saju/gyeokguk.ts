// @TASK P2-R3-T5 - 격국(格局) 판별 (정격 10격 + 특수격)
// @SPEC docs/planning/02-trd.md#격국-용신-판별

import type { Palja, Gyeokguk, Ohaeng } from '@/engine/types';
import { getOhaengForGan, getOhaengForJi } from '@/engine/adapter/hanja-mapper';
import { JIJANGGAN_TABLE, determineSipsin } from '@/engine/saju/sipsin';

// ---------- 천간 음양 ----------

const YANG_GAN = new Set(['甲', '丙', '戊', '庚', '壬']);

function isYangGan(gan: string): boolean {
  return YANG_GAN.has(gan);
}

// ---------- 오행 관계 ----------

const SAENGSAENG: Record<Ohaeng, Ohaeng> = {
  '목': '화', '화': '토', '토': '금', '금': '수', '수': '목',
};

const SANGGEUK: Record<Ohaeng, Ohaeng> = {
  '목': '토', '토': '수', '수': '화', '화': '금', '금': '목',
};

const SAENG_BY: Record<Ohaeng, Ohaeng> = {
  '목': '수', '화': '목', '토': '화', '금': '토', '수': '금',
};

// ---------- 건록/양인 위치 매핑 ----------

/** 각 천간의 건록(祿) 지지 */
const GEONROK_MAP: Record<string, string> = {
  '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午',
  '戊': '巳', '己': '午', '庚': '申', '辛': '酉',
  '壬': '亥', '癸': '子',
};

/** 양간의 양인(羊刃) 지지 (양간만 해당) */
const YANGIN_MAP: Record<string, string> = {
  '甲': '卯', '丙': '午', '戊': '午',
  '庚': '酉', '壬': '子',
};

// ---------- 간합(干合) 화오행 매핑 ----------

/** 천간 합화 관계: [간1, 간2] → 화(化) 오행 */
const GANHAP_PAIRS: Array<{ gan1: string; gan2: string; ohaeng: Ohaeng; name: string }> = [
  { gan1: '甲', gan2: '己', ohaeng: '토', name: '갑기합화토격' },
  { gan1: '乙', gan2: '庚', ohaeng: '금', name: '을경합화금격' },
  { gan1: '丙', gan2: '辛', ohaeng: '수', name: '병신합화수격' },
  { gan1: '丁', gan2: '壬', ohaeng: '목', name: '정임합화목격' },
  { gan1: '戊', gan2: '癸', ohaeng: '화', name: '무계합화화격' },
];

// ---------- 격국 정보 매핑 ----------

/** 10격(정격) + 특수격 정보 */
const GYEOKGUK_INFO: Record<string, { hanja: string; description: string }> = {
  // 정격 10격
  '비견격': {
    hanja: '比肩格',
    description: '일간과 같은 오행이 월지를 지배하는 격. 독립심과 자존심이 강하다.',
  },
  '겁재격': {
    hanja: '劫財格',
    description: '일간과 같은 오행(음양 반대)이 월지를 지배하는 격. 경쟁심이 강하다.',
  },
  '식신격': {
    hanja: '食神格',
    description: '일간이 생하는 오행(같은 음양)이 월지를 지배하는 격. 의식주가 풍족하다.',
  },
  '상관격': {
    hanja: '傷官格',
    description: '일간이 생하는 오행(반대 음양)이 월지를 지배하는 격. 재능이 뛰어나고 표현력이 강하다.',
  },
  '편재격': {
    hanja: '偏財格',
    description: '일간이 극하는 오행(같은 음양)이 월지를 지배하는 격. 재물 활용 능력이 뛰어나다.',
  },
  '정재격': {
    hanja: '正財格',
    description: '일간이 극하는 오행(반대 음양)이 월지를 지배하는 격. 안정적 재물운이 있다.',
  },
  '편관격': {
    hanja: '偏官格',
    description: '일간을 극하는 오행(같은 음양)이 월지를 지배하는 격. 권위와 결단력이 있다.',
  },
  '정관격': {
    hanja: '正官格',
    description: '일간을 극하는 오행(반대 음양)이 월지를 지배하는 격. 명예와 질서를 중시한다.',
  },
  '편인격': {
    hanja: '偏印格',
    description: '일간을 생하는 오행(같은 음양)이 월지를 지배하는 격. 학문과 종교에 인연이 있다.',
  },
  '정인격': {
    hanja: '正印格',
    description: '일간을 생하는 오행(반대 음양)이 월지를 지배하는 격. 학문적 성취와 인덕이 있다.',
  },

  // 특수격 - 건록/양인
  '건록격': {
    hanja: '建祿格',
    description: '월지가 일간의 건록 위치. 자수성가형으로 타인의 도움 없이 일어서는 명.',
  },
  '양인격': {
    hanja: '羊刃格',
    description: '월지가 일간의 양인 위치. 결단력과 추진력이 극강하나 과격한 면이 있다.',
  },

  // 특수격 - 종격(從格)
  '종재격': {
    hanja: '從財格',
    description: '일간이 극약하고 재성이 태왕하여 재성을 따르는 격. 재물운이 크나 일간이 힘을 잃었다.',
  },
  '종살격': {
    hanja: '從殺格',
    description: '일간이 극약하고 관살이 태왕하여 관살을 따르는 격. 권력이나 조직에 순응한다.',
  },
  '종아격': {
    hanja: '從兒格',
    description: '일간이 극약하고 식상이 태왕하여 식상을 따르는 격. 표현력과 기술에 재능이 있다.',
  },
  '종강격': {
    hanja: '從强格',
    description: '일간이 극강하고 비겁/인성만 있어 강한 자아를 따르는 격. 독립적이고 주관이 강하다.',
  },

  // 특수격 - 화격(化格)
  '갑기합화토격': {
    hanja: '甲己合化土格',
    description: '갑목과 기토가 합하여 토로 변화하는 격. 신의와 안정을 중시한다.',
  },
  '을경합화금격': {
    hanja: '乙庚合化金格',
    description: '을목과 경금이 합하여 금으로 변화하는 격. 의리와 결단을 중시한다.',
  },
  '병신합화수격': {
    hanja: '丙辛合化水格',
    description: '병화와 신금이 합하여 수로 변화하는 격. 지혜와 유연함을 중시한다.',
  },
  '정임합화목격': {
    hanja: '丁壬合化木格',
    description: '정화와 임수가 합하여 목으로 변화하는 격. 인자함과 성장을 중시한다.',
  },
  '무계합화화격': {
    hanja: '戊癸合化火格',
    description: '무토와 계수가 합하여 화로 변화하는 격. 예의와 열정을 중시한다.',
  },
};

/** 외격(특수격) 최종 폴백 */
const OEGYEOK_DEFAULT: Gyeokguk = {
  name: '외격',
  hanja: '外格',
  description: '정격 10격 및 특수격에 해당하지 않는 격. 팔자의 구조를 개별적으로 분석해야 한다.',
};

// ---------- 특수격 판별 보조 함수 ----------

/**
 * 팔자 전체에서 각 오행 카테고리(비겁/식상/재성/관성/인성)별 세력을 계산한다.
 * 지장간까지 포함하여 카운트한다.
 */
function countSipsinCategories(palja: Palja): Record<string, number> {
  const { dayGan } = palja;
  const dayOhaeng = getOhaengForGan(dayGan);
  if (!dayOhaeng) return { '비겁': 0, '식상': 0, '재성': 0, '관성': 0, '인성': 0 };

  const counts: Record<string, number> = {
    '비겁': 0, '식상': 0, '재성': 0, '관성': 0, '인성': 0,
  };

  function categorize(ohaeng: Ohaeng | null) {
    if (!ohaeng || !dayOhaeng) return;
    if (ohaeng === dayOhaeng) counts['비겁']++;
    else if (ohaeng === SAENGSAENG[dayOhaeng]) counts['식상']++;
    else if (ohaeng === SANGGEUK[dayOhaeng]) counts['재성']++;
    else if (SANGGEUK[ohaeng] === dayOhaeng) counts['관성']++;
    else if (SAENGSAENG[ohaeng] === dayOhaeng) counts['인성']++;
  }

  // 천간 (일간 제외)
  categorize(getOhaengForGan(palja.yearGan));
  categorize(getOhaengForGan(palja.monthGan));
  categorize(getOhaengForGan(palja.hourGan));

  // 지지 본기
  const jiPositions = [palja.yearJi, palja.monthJi, palja.dayJi, palja.hourJi];
  for (const ji of jiPositions) {
    if (!ji) continue;
    const jijanggan = JIJANGGAN_TABLE[ji];
    if (!jijanggan) continue;
    // 본기에 가중치 2, 중기/여기에 가중치 1
    for (let i = 0; i < jijanggan.length; i++) {
      const weight = i === 0 ? 2 : 1;
      const ohaeng = getOhaengForGan(jijanggan[i]);
      if (!ohaeng) continue;
      if (ohaeng === dayOhaeng) counts['비겁'] += weight;
      else if (ohaeng === SAENGSAENG[dayOhaeng]) counts['식상'] += weight;
      else if (ohaeng === SANGGEUK[dayOhaeng]) counts['재성'] += weight;
      else if (SANGGEUK[ohaeng] === dayOhaeng) counts['관성'] += weight;
      else if (SAENGSAENG[ohaeng] === dayOhaeng) counts['인성'] += weight;
    }
  }

  return counts;
}

/**
 * 일간의 강약을 세력 점수로 판단한다.
 * 비겁 + 인성이 일간을 돕는 세력, 식상 + 재성 + 관성이 일간을 억제하는 세력.
 */
function assessStrength(counts: Record<string, number>): { support: number; oppose: number } {
  const support = (counts['비겁'] ?? 0) + (counts['인성'] ?? 0);
  const oppose = (counts['식상'] ?? 0) + (counts['재성'] ?? 0) + (counts['관성'] ?? 0);
  return { support, oppose };
}

/**
 * 화격(化格) 판별: 일간과 인접 천간이 간합하고, 화 오행이 월지에서 왕하면 화격 성립.
 * 성립 조건만 보는 것이 아니라 쟁합·통근·극화 등 불성립 요소도 함께 반환한다 —
 * 화격은 조건이 부분 충족될 때 확정으로 읽으면 위험하므로 confidence로 구분한다.
 */
function detectHwagyeok(palja: Palja): Gyeokguk | null {
  const { dayGan, monthGan, monthJi } = palja;
  const monthJiOhaeng = getOhaengForJi(monthJi);
  if (!monthJiOhaeng) return null;

  for (const pair of GANHAP_PAIRS) {
    // 일간-월간 간합 확인
    const isMatch =
      (dayGan === pair.gan1 && monthGan === pair.gan2) ||
      (dayGan === pair.gan2 && monthGan === pair.gan1);

    if (!isMatch) continue;

    // 화 오행이 월지에서 득령(같은 오행이거나 생하는 관계)하면 화격 성립
    const deukryeong = monthJiOhaeng === pair.ohaeng;
    const saengjo = !deukryeong && SAENGSAENG[monthJiOhaeng] === pair.ohaeng;
    if (!deukryeong && !saengjo) continue;

    const info = GYEOKGUK_INFO[pair.name];
    if (!info) continue;

    const basis = [
      `일간 ${dayGan}×월간 ${monthGan} 간합`,
      `월지 ${monthJi}(${monthJiOhaeng}) — 화오행 ${pair.ohaeng} ${deukryeong ? '당령' : '생조(월지가 화오행을 생함 — 유파별 인정 범위 상이)'}`,
    ];
    const blockers: string[] = [];

    // 쟁합(爭合) — 간합의 한 축과 같은 천간이 년간·시간에 중복되면 합이 흔들린다
    for (const [pos, gan] of [['년간', palja.yearGan], ['시간', palja.hourGan]] as const) {
      if (gan && (gan === dayGan || gan === monthGan)) {
        blockers.push(`쟁합 가능 — ${pos} ${gan}이(가) 간합 축과 중복`);
      }
    }
    // 일간 통근 — 일간이 지지 본기에 뿌리를 두면 화하기 어렵다
    const dayOhaeng = getOhaengForGan(dayGan);
    if (dayOhaeng) {
      for (const [pos, ji] of [['일지', palja.dayJi], ['월지', monthJi]] as const) {
        const bongi = JIJANGGAN_TABLE[ji]?.[0];
        if (bongi && getOhaengForGan(bongi) === dayOhaeng) {
          blockers.push(`일간 통근 — ${pos} ${ji} 본기 ${bongi}이(가) 일간 오행과 같음`);
        }
      }
    }
    // 극화 — 화오행을 극하는 천간이 투간되면 화기가 꺾인다
    for (const [pos, gan] of [['년간', palja.yearGan], ['시간', palja.hourGan]] as const) {
      const o = gan ? getOhaengForGan(gan) : null;
      if (o && SANGGEUK[o] === pair.ohaeng) {
        blockers.push(`극화 — ${pos} ${gan}(${o})이(가) 화오행 ${pair.ohaeng}을(를) 극함`);
      }
    }

    const confidence =
      blockers.length === 0 && deukryeong ? '확정' : blockers.length <= 1 ? '유력' : '참고';
    return { name: pair.name, hanja: info.hanja, description: info.description, confidence, basis, blockers };
  }

  return null;
}

/**
 * 종격(從格) 판별: 일간이 극약하면서 특정 십신 카테고리가 압도적일 때.
 * 단순 카운트 임계치만으로는 확정이 어려우므로 근거·신뢰도·불성립 요소를 함께 반환한다.
 */
function detectJongyeok(palja: Palja): Gyeokguk | null {
  const counts = countSipsinCategories(palja);
  const { support, oppose } = assessStrength(counts);
  const total = support + oppose;

  if (total === 0) return null;

  const countsText = `비겁 ${counts['비겁']}·인성 ${counts['인성']}·식상 ${counts['식상']}·재성 ${counts['재성']}·관성 ${counts['관성']}`;

  // 종강격: 일간이 극강 (지지 세력의 80% 이상이 비겁+인성)
  if (support > 0 && oppose === 0) {
    return {
      ...lookupGyeokguk('종강격')!,
      confidence: '확정',
      basis: [`일간 세력(비겁+인성) ${support} — 대립 세력 0`, countsText],
      blockers: [],
    };
  }
  if (total >= 8 && support / total >= 0.8) {
    return {
      ...lookupGyeokguk('종강격')!,
      confidence: '유력',
      basis: [`일간 세력 ${support}/${total} (80% 이상)`, countsText],
      blockers: [`대립 세력 ${oppose}개 잔존 — 완전한 종강은 아님`],
    };
  }

  // 종격 (일간 극약): 비겁+인성이 거의 없고 특정 세력이 압도적
  if (support <= 1 && oppose >= 8) {
    // 어떤 카테고리가 가장 강한지 확인
    const jaeseong = counts['재성'] ?? 0;
    const gwanseong = counts['관성'] ?? 0;
    const siksang = counts['식상'] ?? 0;

    let name: string | null = null;
    let dominant = 0;
    if (jaeseong >= gwanseong && jaeseong >= siksang && jaeseong >= 4) {
      name = '종재격';
      dominant = jaeseong;
    } else if (gwanseong >= jaeseong && gwanseong >= siksang && gwanseong >= 4) {
      name = '종살격';
      dominant = gwanseong;
    } else if (siksang >= jaeseong && siksang >= gwanseong && siksang >= 4) {
      name = '종아격';
      dominant = siksang;
    }
    if (!name) return null;

    // 미세 통근 — 지지 지장간(중기·여기)에 일간 오행이 있으면 종격이 약해진다
    const dayOhaeng = getOhaengForGan(palja.dayGan);
    const blockers: string[] = [];
    if (dayOhaeng) {
      for (const [pos, ji] of [['년지', palja.yearJi], ['월지', palja.monthJi], ['일지', palja.dayJi], ['시지', palja.hourJi]] as const) {
        const jijanggan = JIJANGGAN_TABLE[ji] ?? [];
        for (let i = 1; i < jijanggan.length; i++) {
          if (getOhaengForGan(jijanggan[i]) === dayOhaeng) {
            blockers.push(`미세 통근 — ${pos} ${ji} 지장간 ${jijanggan[i]}`);
            break;
          }
        }
      }
    }

    return {
      ...lookupGyeokguk(name)!,
      confidence: support === 0 && blockers.length === 0 ? '유력' : '참고',
      basis: [`일간 세력(비겁+인성) ${support} — 우세 축 ${name.replace('격', '')} ${dominant}`, countsText],
      blockers,
    };
  }

  return null;
}

function lookupGyeokguk(name: string): Gyeokguk | null {
  const info = GYEOKGUK_INFO[name];
  if (!info) return null;
  return { name, hanja: info.hanja, description: info.description };
}

// ---------- 격국 판별 메인 함수 ----------

/**
 * 팔자에서 격국을 판별한다.
 *
 * 판별 순서:
 * 1. 화격 판별 (일간-월간 간합 + 월지 득령)
 * 2. 종격 판별 (일간 극약/극강 + 세력 분석)
 * 3. 건록격/양인격 확인 (월지가 일간의 건록/양인 위치)
 * 4. 정격 10격 판별 (월지 지장간 + 월간 투출 기준)
 * 5. 최종 폴백: 외격
 *
 * 특수격(화격·종격)을 정격보다 먼저 평가한다. 정격은 유효한 일간·월지 조합에
 * 항상 매칭되므로 먼저 두면 특수격이 영구적으로 도달 불가가 된다.
 */
export function determineGyeokguk(palja: Palja): Gyeokguk {
  const { dayGan, monthGan, monthJi } = palja;

  // ── Step 1: 화격 판별 ──
  const hwagyeok = detectHwagyeok(palja);
  if (hwagyeok) return hwagyeok;

  // ── Step 2: 종격 판별 ──
  const jongyeok = detectJongyeok(palja);
  if (jongyeok) return jongyeok;

  // ── Step 3: 건록격 / 양인격 확인 ──
  if (GEONROK_MAP[dayGan] === monthJi) {
    return {
      ...lookupGyeokguk('건록격')!,
      confidence: '확정',
      basis: [`월지 ${monthJi} = 일간 ${dayGan}의 건록`],
      blockers: [],
    };
  }
  if (isYangGan(dayGan) && YANGIN_MAP[dayGan] === monthJi) {
    return {
      ...lookupGyeokguk('양인격')!,
      confidence: '확정',
      basis: [`월지 ${monthJi} = 일간 ${dayGan}의 양인`],
      blockers: [],
    };
  }

  // ── Step 4: 정격 10격 판별 ──
  const monthJijanggan = JIJANGGAN_TABLE[monthJi];
  if (monthJijanggan && monthJijanggan.length > 0) {
    const bongi = monthJijanggan[0];
    let targetGan = bongi;
    if (monthGan && monthJijanggan.includes(monthGan)) {
      targetGan = monthGan;
    }

    const sipsinName = determineSipsin(dayGan, targetGan);
    if (sipsinName) {
      const gyeokgukName = `${sipsinName}격`;
      // 비견격/겁재격은 이미 건록/양인으로 걸러졌으므로 그대로 반환
      const info = GYEOKGUK_INFO[gyeokgukName];
      if (info) {
        return {
          name: gyeokgukName,
          hanja: info.hanja,
          description: info.description,
          confidence: '확정',
          basis: [
            targetGan === bongi
              ? `월지 ${monthJi} 본기 ${bongi} = ${sipsinName}`
              : `월지 ${monthJi} 지장간 ${targetGan}이(가) 월간에 투출 = ${sipsinName}`,
          ],
          blockers: [],
        };
      }
    }
  }

  // ── Step 5: 최종 폴백 ──
  return {
    ...OEGYEOK_DEFAULT,
    confidence: '참고',
    basis: ['정격 10격·특수격(화격·종격·건록·양인) 조건 미충족'],
    blockers: ['격국 미성립 — 명식을 개별 구조로 분석해야 함'],
  };
}
