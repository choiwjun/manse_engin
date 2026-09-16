// @TASK P2-R3-T4 - 12sinsal, hyeongchunghoehabpahae, gongmang, naeum-ohaeng
// @SPEC docs/planning/02-trd.md#sinsal-calculation

import type { Palja, Sinsal } from '@/engine/types';
import { CHEONGAN, JIJI } from '@/engine/adapter/hanja-mapper';

// ============================================================================
// Types
// ============================================================================

export interface JijiRelation {
  type: '합' | '충' | '형' | '파' | '해' | '삼합' | '방합';
  positions: string[];
  jijis: string[];
  description: string;
  /** 충돌 주석: 같은 지지 쌍에 합과 충이 동시 존재 시 해석 가이드 */
  conflictNote?: string;
}

interface NaeumOhaengResult {
  name: string;
  hanja: string;
  ohaeng: string;
}

// ============================================================================
// Constants: 12 Sinsal lookup table
// ============================================================================

/** 12 sinsal names in order */
const SINSAL_NAMES: readonly { name: string; hanja: string; description: string }[] = [
  { name: '겁살', hanja: '劫殺', description: '예기치 않은 재난이나 사고를 나타내는 살' },
  { name: '재살', hanja: '災殺', description: '질병이나 재앙에 관한 살' },
  { name: '천살', hanja: '天殺', description: '하늘에서 내리는 재앙을 나타내는 살' },
  { name: '지살', hanja: '地殺', description: '땅에서 오는 재앙을 나타내는 살' },
  { name: '연살', hanja: '年殺', description: '색정이나 도화와 관련된 살' },
  { name: '월살', hanja: '月殺', description: '매사가 지체되고 장애가 생기는 살' },
  { name: '망신', hanja: '亡身', description: '체면과 명예를 손상시키는 살' },
  { name: '장성', hanja: '將星', description: '리더십과 위엄을 나타내는 길신' },
  { name: '반안', hanja: '攀鞍', description: '안정과 편안함을 나타내는 길신' },
  { name: '역마', hanja: '驛馬', description: '이동과 변동을 나타내는 신살' },
  { name: '육해', hanja: '六害', description: '대인관계에서의 해를 나타내는 살' },
  { name: '화개', hanja: '華蓋', description: '학문과 종교에 뛰어난 재능을 나타내는 길신' },
];

/**
 * Samhap groups determine which sinsal set applies.
 * Each group starts from its geobsal jiji and goes through
 * the 12-jiji cycle for the 12 sinsals.
 *
 * Group mapping (dayJi -> samhap group):
 *   寅, 午, 戌 -> InOSul (fire) : geobsal starts at 亥
 *   巳, 酉, 丑 -> SaYuChuk (metal) : geobsal starts at 寅
 *   申, 子, 辰 -> SinJaJin (water) : geobsal starts at 巳
 *   亥, 卯, 未 -> HaeMoMi (wood) : geobsal starts at 申
 */
const SAMHAP_GROUP_MAP: Record<string, number> = {
  // InOSul group -> geobsal starts at 亥 (index 11)
  '寅': 11, '午': 11, '戌': 11,
  // SaYuChuk group -> geobsal starts at 寅 (index 2)
  '巳': 2, '酉': 2, '丑': 2,
  // SinJaJin group -> geobsal starts at 巳 (index 5)
  '申': 5, '子': 5, '辰': 5,
  // HaeMoMi group -> geobsal starts at 申 (index 8)
  '亥': 8, '卯': 8, '未': 8,
};

// ============================================================================
// Constants: Jiji Relations
// ============================================================================

/** Yukhap (六合) pairs */
const YUKHAP_PAIRS: readonly [string, string][] = [
  ['子', '丑'],
  ['寅', '亥'],
  ['卯', '戌'],
  ['辰', '酉'],
  ['巳', '申'],
  ['午', '未'],
];

/** Samhap (三合) groups */
const SAMHAP_GROUPS: readonly { jijis: [string, string, string]; desc: string }[] = [
  { jijis: ['寅', '午', '戌'], desc: '인오술 삼합(화)' },
  { jijis: ['巳', '酉', '丑'], desc: '사유축 삼합(금)' },
  { jijis: ['申', '子', '辰'], desc: '신자진 삼합(수)' },
  { jijis: ['亥', '卯', '未'], desc: '해묘미 삼합(목)' },
];

/** Banghap (方合) groups */
const BANGHAP_GROUPS: readonly { jijis: [string, string, string]; desc: string }[] = [
  { jijis: ['寅', '卯', '辰'], desc: '인묘진 방합(동방목)' },
  { jijis: ['巳', '午', '未'], desc: '사오미 방합(남방화)' },
  { jijis: ['申', '酉', '戌'], desc: '신유술 방합(서방금)' },
  { jijis: ['亥', '子', '丑'], desc: '해자축 방합(북방수)' },
];

/** Chung (冲) pairs */
const CHUNG_PAIRS: readonly [string, string][] = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
];

/**
 * Hyeong (刑) definitions.
 * Three-way punishments are checked as complete triples AND pairwise.
 * 삼형은 완성형(세 글자 모두 존재)이면 완성형만 반환하고,
 * 두 글자만 존재하면 그 부분쌍을 형으로 반환한다.
 * Self-punishments are checked for duplicates.
 */
const HYEONG_TRIPLES: readonly {
  jijis: [string, string, string];
  desc: string;
  pairs: readonly { jijis: [string, string]; desc: string }[];
}[] = [
  {
    jijis: ['寅', '巳', '申'],
    desc: '인사신 무은지형(三刑)',
    pairs: [
      { jijis: ['寅', '巳'], desc: '인사 무은지형(寅巳申 삼형 부분)' },
      { jijis: ['巳', '申'], desc: '사신 무은지형(寅巳申 삼형 부분)' },
      { jijis: ['寅', '申'], desc: '인신 무은지형(寅巳申 삼형 부분)' },
    ],
  },
  {
    jijis: ['丑', '戌', '未'],
    desc: '축술미 지세지형(三刑)',
    pairs: [
      { jijis: ['丑', '戌'], desc: '축술 지세지형(丑戌未 삼형 부분)' },
      { jijis: ['戌', '未'], desc: '술미 지세지형(丑戌未 삼형 부분)' },
      { jijis: ['丑', '未'], desc: '축미 지세지형(丑戌未 삼형 부분)' },
    ],
  },
];

const HYEONG_PAIR: readonly { jijis: [string, string]; desc: string }[] = [
  { jijis: ['子', '卯'], desc: '자묘 무례지형(二刑)' },
];

const HYEONG_SELF: readonly string[] = ['辰', '午', '酉', '亥'];

/** Pa (破) pairs */
const PA_PAIRS: readonly [string, string][] = [
  ['子', '酉'],
  ['丑', '辰'],
  ['寅', '亥'],
  ['卯', '午'],
  ['巳', '申'],
  ['未', '戌'],
];

/** Hae (害) pairs */
const HAE_PAIRS: readonly [string, string][] = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '巳'],
  ['卯', '辰'],
  ['申', '亥'],
  ['酉', '戌'],
];

// ============================================================================
// Constants: Naeum Ohaeng (60-galja naeum mapping)
// ============================================================================

/**
 * 60-galja naeum table. Every 2 consecutive galja share the same naeum.
 * Indexed by galja order (0-59), divided by 2 -> 30 entries.
 */
const NAEUM_TABLE: readonly NaeumOhaengResult[] = [
  { name: '해중금', hanja: '海中金', ohaeng: '금' }, // 甲子, 乙丑
  { name: '노중화', hanja: '爐中火', ohaeng: '화' }, // 丙寅, 丁卯
  { name: '대림목', hanja: '大林木', ohaeng: '목' }, // 戊辰, 己巳
  { name: '노방토', hanja: '路旁土', ohaeng: '토' }, // 庚午, 辛未
  { name: '검봉금', hanja: '劍鋒金', ohaeng: '금' }, // 壬申, 癸酉
  { name: '산두화', hanja: '山頭火', ohaeng: '화' }, // 甲戌, 乙亥
  { name: '간하수', hanja: '澗下水', ohaeng: '수' }, // 丙子, 丁丑
  { name: '성두토', hanja: '城頭土', ohaeng: '토' }, // 戊寅, 己卯
  { name: '백랍금', hanja: '白蠟金', ohaeng: '금' }, // 庚辰, 辛巳
  { name: '양류목', hanja: '楊柳木', ohaeng: '목' }, // 壬午, 癸未
  { name: '정천수', hanja: '井泉水', ohaeng: '수' }, // 甲申, 乙酉
  { name: '옥상토', hanja: '屋上土', ohaeng: '토' }, // 丙戌, 丁亥
  { name: '벽력화', hanja: '霹靂火', ohaeng: '화' }, // 戊子, 己丑
  { name: '송백목', hanja: '松柏木', ohaeng: '목' }, // 庚寅, 辛卯
  { name: '장류수', hanja: '長流水', ohaeng: '수' }, // 壬辰, 癸巳
  { name: '사중금', hanja: '砂中金', ohaeng: '금' }, // 甲午, 乙未
  { name: '산하화', hanja: '山下火', ohaeng: '화' }, // 丙申, 丁酉
  { name: '평지목', hanja: '平地木', ohaeng: '목' }, // 戊戌, 己亥
  { name: '벽상토', hanja: '壁上土', ohaeng: '토' }, // 庚子, 辛丑
  { name: '금박금', hanja: '金箔金', ohaeng: '금' }, // 壬寅, 癸卯
  { name: '복등화', hanja: '覆燈火', ohaeng: '화' }, // 甲辰, 乙巳
  { name: '천하수', hanja: '天河水', ohaeng: '수' }, // 丙午, 丁未
  { name: '대역토', hanja: '大驛土', ohaeng: '토' }, // 戊申, 己酉
  { name: '차천금', hanja: '釵釧金', ohaeng: '금' }, // 庚戌, 辛亥
  { name: '상자목', hanja: '桑柘木', ohaeng: '목' }, // 壬子, 癸丑
  { name: '대계수', hanja: '大溪水', ohaeng: '수' }, // 甲寅, 乙卯
  { name: '사중토', hanja: '砂中土', ohaeng: '토' }, // 丙辰, 丁巳
  { name: '천상화', hanja: '天上火', ohaeng: '화' }, // 戊午, 己未
  { name: '석류목', hanja: '石榴木', ohaeng: '목' }, // 庚申, 辛酉
  { name: '대해수', hanja: '大海水', ohaeng: '수' }, // 壬戌, 癸亥
];

// ============================================================================
// Helper functions
// ============================================================================

/** Position keys for the 4 jiji columns */
const JIJI_POSITIONS = ['yearJi', 'monthJi', 'dayJi', 'hourJi'] as const;

/**
 * Get valid (non-empty) jiji entries with their position names.
 */
function getJijiEntries(palja: Palja): { position: string; ji: string }[] {
  const entries: { position: string; ji: string }[] = [];
  for (const pos of JIJI_POSITIONS) {
    const ji = palja[pos];
    if (ji && ji.length > 0) {
      entries.push({ position: pos, ji });
    }
  }
  return entries;
}

/**
 * Calculate the 60-galja sequential index (0-59) from gan + ji.
 * Returns -1 for invalid combinations.
 */
function getGaljaIndex(gan: string, ji: string): number {
  const ganIdx = CHEONGAN.indexOf(gan);
  const jiIdx = JIJI.indexOf(ji);

  if (ganIdx === -1 || jiIdx === -1) return -1;

  // Only even-even or odd-odd combinations are valid in 60-galja
  if (ganIdx % 2 !== jiIdx % 2) return -1;

  // Calculate: find n where (n % 10 === ganIdx) and (n % 12 === jiIdx), 0 <= n < 60
  for (let n = 0; n < 60; n++) {
    if (n % 10 === ganIdx && n % 12 === jiIdx) {
      return n;
    }
  }

  return -1;
}

// ============================================================================
// 1. calculateSinsal - 12 Sinsal computation
// ============================================================================

/**
 * Calculate all 12-sinsal found in the palja based on the dayJi (day branch).
 *
 * The dayJi determines which samhap group applies, which in turn
 * determines the geobsal starting position. From there, the 12 sinsals
 * cycle through the 12 jijis in order.
 *
 * Each of the other 3 jiji positions (yearJi, monthJi, hourJi) is checked,
 * plus dayJi itself (e.g., jangseong can appear at dayJi).
 */
export function calculateSinsal(palja: Palja): Sinsal[] {
  const dayJi = palja.dayJi;
  if (!dayJi || dayJi.length === 0) return [];

  const geobsalStartIdx = SAMHAP_GROUP_MAP[dayJi];
  if (geobsalStartIdx === undefined) return [];

  // Build lookup: jiji -> sinsal info
  const jijiToSinsal = new Map<string, { name: string; hanja: string; description: string }>();
  for (let i = 0; i < 12; i++) {
    const jiIdx = (geobsalStartIdx + i) % 12;
    const ji = JIJI[jiIdx];
    jijiToSinsal.set(ji, SINSAL_NAMES[i]);
  }

  // Check each position in the palja
  const result: Sinsal[] = [];
  const entries = getJijiEntries(palja);

  for (const { position, ji } of entries) {
    const sinsalInfo = jijiToSinsal.get(ji);
    if (sinsalInfo) {
      result.push({
        name: sinsalInfo.name,
        hanja: sinsalInfo.hanja,
        description: sinsalInfo.description,
        position,
      });
    }
  }

  return result;
}

// ============================================================================
// 2. analyzeJijiRelations - Hyeongchunghoehabpahae
// ============================================================================

/**
 * Analyze all jiji relationships among the 4 pillars of the palja.
 * Checks for: yukhap(六合), samhap(三合), banghap(方合),
 *   chung(冲), hyeong(刑), pa(破), hae(害).
 */
export function analyzeJijiRelations(palja: Palja): JijiRelation[] {
  const entries = getJijiEntries(palja);
  const result: JijiRelation[] = [];

  const jiSet = new Set(entries.map(e => e.ji));

  // 삼형이 세 글자 모두 갖춰진 경우 완성형만 반환하고 부분쌍은 건너뛴다
  const hyeongTripleComplete = HYEONG_TRIPLES.map((triple) =>
    triple.jijis.every((j) => jiSet.has(j)),
  );

  // --- Pairwise checks (yukhap, chung, pa, hae, hyeong pair/self) ---
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];

      // Yukhap (六合)
      checkPairRelation(a, b, YUKHAP_PAIRS, '합', result);

      // Chung (冲)
      checkPairRelation(a, b, CHUNG_PAIRS, '충', result);

      // Pa (破)
      checkPairRelation(a, b, PA_PAIRS, '파', result);

      // Hae (害)
      checkPairRelation(a, b, HAE_PAIRS, '해', result);

      // Hyeong - pair (子卯)
      for (const hp of HYEONG_PAIR) {
        if (isPairMatch(a.ji, b.ji, hp.jijis[0], hp.jijis[1])) {
          result.push({
            type: '형',
            positions: [a.position, b.position],
            jijis: [a.ji, b.ji],
            description: hp.desc,
          });
        }
      }

      // Hyeong - 삼형 부분쌍 (寅巳, 巳申, 寅申, 丑戌, 戌未, 丑未)
      for (let t = 0; t < HYEONG_TRIPLES.length; t++) {
        if (hyeongTripleComplete[t]) continue;
        for (const hp of HYEONG_TRIPLES[t].pairs) {
          if (isPairMatch(a.ji, b.ji, hp.jijis[0], hp.jijis[1])) {
            result.push({
              type: '형',
              positions: [a.position, b.position],
              jijis: [a.ji, b.ji],
              description: hp.desc,
            });
          }
        }
      }

      // Hyeong - self (辰辰, 午午, 酉酉, 亥亥)
      if (a.ji === b.ji && HYEONG_SELF.includes(a.ji)) {
        result.push({
          type: '형',
          positions: [a.position, b.position],
          jijis: [a.ji, b.ji],
          description: `${a.ji}${b.ji} 자형(自刑)`,
        });
      }
    }
  }

  // --- Triple checks (samhap, banghap, hyeong triples) ---

  // Samhap (三合)
  for (const group of SAMHAP_GROUPS) {
    if (group.jijis.every(j => jiSet.has(j))) {
      const positions = group.jijis.map(j => {
        const entry = entries.find(e => e.ji === j);
        return entry ? entry.position : '';
      });
      result.push({
        type: '삼합',
        positions,
        jijis: [...group.jijis],
        description: group.desc,
      });
    }
  }

  // Banghap (方合)
  for (const group of BANGHAP_GROUPS) {
    if (group.jijis.every(j => jiSet.has(j))) {
      const positions = group.jijis.map(j => {
        const entry = entries.find(e => e.ji === j);
        return entry ? entry.position : '';
      });
      result.push({
        type: '방합',
        positions,
        jijis: [...group.jijis],
        description: group.desc,
      });
    }
  }

  // Hyeong triples (寅巳申, 丑戌未)
  for (const triple of HYEONG_TRIPLES) {
    if (triple.jijis.every(j => jiSet.has(j))) {
      const positions = triple.jijis.map(j => {
        const entry = entries.find(e => e.ji === j);
        return entry ? entry.position : '';
      });
      result.push({
        type: '형',
        positions,
        jijis: [...triple.jijis],
        description: triple.desc,
      });
    }
  }

  return annotateConflicts(result);
}

// ---------------------------------------------------------------------------
// 충돌 주석 (합충상쇄 등)
// ---------------------------------------------------------------------------

/**
 * 같은 지지 쌍에 합(合)과 충(冲)이 동시 존재할 때 해석 가이드를 추가한다.
 *
 * 전통 사주명리학 규칙:
 * 1. 합+충 동시 → "합충상쇄(合冲相殺)": 합과 충이 상쇄되어 약화
 * 2. 삼합/방합+충 → 삼합의 결속이 강하므로 충의 파괴력 감소
 * 3. 합+형 → 합이 형의 살기를 완화
 * 4. 충+형 → 충과 형 중첩으로 충격 가중
 */
function annotateConflicts(relations: JijiRelation[]): JijiRelation[] {
  const pairMap = new Map<string, JijiRelation[]>();

  for (const rel of relations) {
    if (rel.positions.length === 2) {
      const key = [...rel.positions].sort().join('|');
      const group = pairMap.get(key) ?? [];
      group.push(rel);
      pairMap.set(key, group);
    }
  }

  for (const [, group] of pairMap) {
    if (group.length < 2) continue;

    const types = new Set(group.map((r) => r.type));
    const hasHap = types.has('합');
    const hasChung = types.has('충');
    const hasHyeong = types.has('형');

    if (hasHap && hasChung) {
      for (const rel of group) {
        if (rel.type === '합') {
          rel.conflictNote = '합충상쇄(合冲相殺): 충이 함께 있어 합의 결합력이 약화됩니다';
        } else if (rel.type === '충') {
          rel.conflictNote = '합충상쇄(合冲相殺): 합이 함께 있어 충의 파괴력이 감소합니다';
        }
      }
    }

    if (hasHap && hasHyeong) {
      for (const rel of group) {
        if (rel.type === '형') {
          rel.conflictNote = '합이 형의 살기를 일부 완화합니다';
        }
      }
    }

    if (hasChung && hasHyeong) {
      for (const rel of group) {
        if (rel.type === '충') {
          rel.conflictNote = '형과 충이 중첩되어 변동성이 큽니다';
        } else if (rel.type === '형') {
          rel.conflictNote = '충과 형이 중첩되어 갈등이 심화됩니다';
        }
      }
    }
  }

  // 삼합/방합과 충의 교차 검사
  const tripleRelations = relations.filter((r) => r.type === '삼합' || r.type === '방합');
  const chungRelations = relations.filter((r) => r.type === '충');

  for (const triple of tripleRelations) {
    const tripleJijis = new Set(triple.jijis);
    for (const chung of chungRelations) {
      const overlap = chung.jijis.filter((j) => tripleJijis.has(j));
      if (overlap.length > 0 && !chung.conflictNote) {
        chung.conflictNote = `${triple.type}의 결속력으로 충의 영향이 감소합니다`;
      }
    }
  }

  return relations;
}

/**
 * Check if two jijis match a pair definition (order-independent).
 */
function isPairMatch(a: string, b: string, x: string, y: string): boolean {
  return (a === x && b === y) || (a === y && b === x);
}

/**
 * Check a pair against a list of defined pairs and add to result if matched.
 */
function checkPairRelation(
  a: { position: string; ji: string },
  b: { position: string; ji: string },
  pairs: readonly [string, string][],
  type: JijiRelation['type'],
  result: JijiRelation[],
): void {
  for (const [x, y] of pairs) {
    if (isPairMatch(a.ji, b.ji, x, y)) {
      result.push({
        type,
        positions: [a.position, b.position],
        jijis: [a.ji, b.ji],
        description: `${a.ji}${b.ji} ${type}`,
      });
    }
  }
}

// ============================================================================
// 3. calculateGongmang - Gongmang (空亡) computation
// ============================================================================

/**
 * Calculate the 2 gongmang (empty/void) jijis based on the day pillar.
 *
 * The 60-galja cycle is divided into 6 groups of 10.
 * Within each group, 10 gans pair with 10 of the 12 jijis;
 * the 2 jijis that are left out are the gongmang.
 *
 * Group 1 (甲子~癸酉, idx 0-9): missing 戌, 亥
 * Group 2 (甲戌~癸未, idx 10-19): missing 申, 酉
 * Group 3 (甲申~癸巳, idx 20-29): missing 午, 未
 * Group 4 (甲午~癸卯, idx 30-39): missing 辰, 巳
 * Group 5 (甲辰~癸丑, idx 40-49): missing 寅, 卯
 * Group 6 (甲寅~癸亥, idx 50-59): missing 子, 丑
 */
export function calculateGongmang(palja: Palja): string[] {
  const galjaIdx = getGaljaIndex(palja.dayGan, palja.dayJi);
  if (galjaIdx === -1) return [];

  const groupNum = Math.floor(galjaIdx / 10); // 0-5

  // The starting jiji index of each group's first galja
  // Group 0: starts at 子(0), uses 子~酉(0-9), missing 戌(10), 亥(11)
  // Group 1: starts at 戌(10), uses 戌~未(10-7 wrapped), missing 申(8), 酉(9)
  // Group 2: starts at 申(8), uses 申~巳(8-5 wrapped), missing 午(6), 未(7)
  // Group 3: starts at 午(6), uses 午~卯(6-3 wrapped), missing 辰(4), 巳(5)
  // Group 4: starts at 辰(4), uses 辰~丑(4-1 wrapped), missing 寅(2), 卯(3)
  // Group 5: starts at 寅(2), uses 寅~亥(2-11 wrapped), missing 子(0), 丑(1)

  // Pattern: each group's start jiji idx = (groupNum * 10) % 12
  // The 10 used jijis are indices start, start+1, ..., start+9 (mod 12)
  // The 2 missing are start+10 and start+11 (mod 12)
  const startJiIdx = (groupNum * 10) % 12;
  const missing1Idx = (startJiIdx + 10) % 12;
  const missing2Idx = (startJiIdx + 11) % 12;

  return [JIJI[missing1Idx], JIJI[missing2Idx]];
}

// ============================================================================
// 4. getNaeumOhaeng - Naeum Ohaeng (납음오행)
// ============================================================================

/**
 * Get the naeum ohaeng for a given gan+ji combination.
 *
 * Each consecutive pair of the 60-galja shares the same naeum.
 * The 60-galja index divided by 2 gives the NAEUM_TABLE index.
 */
export function getNaeumOhaeng(gan: string, ji: string): NaeumOhaengResult {
  const galjaIdx = getGaljaIndex(gan, ji);
  if (galjaIdx === -1) {
    return { name: '', hanja: '', ohaeng: '' };
  }

  const naeumIdx = Math.floor(galjaIdx / 2);
  return NAEUM_TABLE[naeumIdx];
}
