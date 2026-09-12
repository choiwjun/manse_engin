// @TASK P10-R1-T1 - 대육임(大六壬) 코어 엔진
// @SPEC docs/planning/06-tasks.md#P10-R1-T1

import type {
  DaeyukimResult,
  CheonJiBanPosition,
  SaGwaItem,
  SamJeonItem,
  CheonJang,
} from '@/engine/types';
import { ManseryeokEngine } from '@/engine/core/manseryeok-engine';
import { toKstTimestamp } from '@/engine/core/temporal';
import {
  BRANCHES,
  BRANCH_OHAENG,
  GAN_TO_BRANCH,
  GAN_OHAENG,
  OHAENG_GEUK,
  WOLJIANG_TABLE,
  WOLJIANG_SOLAR_TERMS,
  CHEONJANG_LIST,
  CHEONJANG_FORWARD_ORDER,
  CHEONJANG_REVERSE_ORDER,
  GUIIN_TABLE,
  DAY_BRANCHES,
  VOID_BRANCHES,
  STEMS,
  getSexagenaryIndex,
  getJiaGroupName,
  getYukChin,
} from './constants';


// ===================================================================
// 인덱스 조회 헬퍼 (as const 타입 호환)
// ===================================================================

/** 지지 문자열에서 인덱스를 반환한다. */
function branchIndex(branch: string): number {
  return (BRANCHES as readonly string[]).indexOf(branch);
}

/** 천간 문자열에서 인덱스를 반환한다. */
function stemIndex(stem: string): number {
  return (STEMS as readonly string[]).indexOf(stem);
}

// ===================================================================
// 시각 -> 지지 변환
// ===================================================================

/**
 * 시각(0-23) -> 12시진 지지 인덱스(0-11).
 *
 * 子(23,0), 丑(1,2), 寅(3,4), 卯(5,6), 辰(7,8), 巳(9,10),
 * 午(11,12), 未(13,14), 申(15,16), 酉(17,18), 戌(19,20), 亥(21,22)
 */
function hourToBranchIndex(hour: number): number {
  if (hour === 23 || hour === 0) return 0; // 子
  return Math.floor((hour + 1) / 2);
}

// ===================================================================
// 공개 함수 - 월장(月將) 결정
// ===================================================================

/**
 * 절기명으로 월장을 결정한다.
 *
 * 절기별 월장:
 * 우수~춘분: 亥, 춘분~곡우: 戌, 곡우~소만: 酉, 소만~하지: 申,
 * 하지~대서: 未, 대서~처서: 午, 처서~추분: 巳, 추분~상강: 辰,
 * 상강~소설: 卯, 소설~동지: 寅, 동지~대한: 丑, 대한~우수: 子
 *
 * @param solarTermName - 절기 이름 (한국어, 예: '우수')
 * @returns 월장 지지 (예: '亥')
 */
export function getWolJang(solarTermName: string): string {
  const wolJang = WOLJIANG_TABLE[solarTermName];
  if (wolJang) return wolJang;

  // 월장 테이블에 없는 절기(절기는 12개, 중기도 12개)인 경우
  // 가장 가까운 이전 중기로 fallback
  throw new Error(`월장을 결정할 수 없는 절기: ${solarTermName}`);
}

// ===================================================================
// 공개 함수 - 천지반(天地盤) 구성
// ===================================================================

/**
 * 천지반(天地盤)을 구성한다.
 *
 * 지반: 子丑寅卯辰巳午未申酉戌亥 고정 (index 0~11)
 * 천반: 월장을 시지 위에 놓고 나머지를 순서대로 배치
 *
 * @param wolJang - 월장 지지 (예: '亥')
 * @param hourBranch - 시지 (예: '卯')
 * @returns 12개의 CheonJiBanPosition (천장은 null로 초기화)
 */
export function buildCheonJiBan(
  wolJang: string,
  hourBranch: string,
): CheonJiBanPosition[] {
  const wolJangIdx = branchIndex(wolJang);
  const hourBranchIdx = branchIndex(hourBranch);

  if (wolJangIdx === -1) throw new Error(`유효하지 않은 월장: ${wolJang}`);
  if (hourBranchIdx === -1) throw new Error(`유효하지 않은 시지: ${hourBranch}`);

  // 천반 배치: 월장을 시지 위에 놓고 순서대로 채운다
  // offset = 월장 인덱스 - 시지 인덱스
  // 지반 i 위의 천반 = (i + offset) % 12
  const offset = (wolJangIdx - hourBranchIdx + 12) % 12;

  const positions: CheonJiBanPosition[] = [];
  for (let i = 0; i < 12; i++) {
    const heavenIdx = (i + offset) % 12;
    positions.push({
      earthBranch: BRANCHES[i],
      heavenBranch: BRANCHES[heavenIdx],
      cheonJang: null,
    });
  }

  return positions;
}

// ===================================================================
// 공개 함수 - 사과(四課) 도출
// ===================================================================

/**
 * 사과(四課)를 도출한다.
 *
 * 제1과: 일간의 양신(기거지지)을 하신으로, 그 위의 천반 지지를 상신으로
 * 제2과: 제1과 상신을 하신으로, 그 위의 천반 지지를 상신으로
 * 제3과: 일지를 하신으로, 그 위의 천반 지지를 상신으로
 * 제4과: 제3과 상신을 하신으로, 그 위의 천반 지지를 상신으로
 *
 * @param dayGan - 일간 (예: '甲')
 * @param dayJi - 일지 (예: '子')
 * @param cheonJiBan - 천지반 배치
 * @returns 4개의 SaGwaItem
 */
export function deriveSaGwa(
  dayGan: string,
  dayJi: string,
  cheonJiBan: CheonJiBanPosition[],
): SaGwaItem[] {
  // 천반 조회 헬퍼: 지반 지지 -> 해당 위치의 천반 지지
  function getHeavenBranch(earthBranch: string): string {
    const idx = branchIndex(earthBranch);
    return cheonJiBan[idx].heavenBranch;
  }

  // 상하 관계 판별 헬퍼
  function getRelation(upper: string, lower: string): string {
    const upperOh = BRANCH_OHAENG[upper];
    const lowerOh = BRANCH_OHAENG[lower];
    if (OHAENG_GEUK[upperOh] === lowerOh) return '극'; // 상신이 하신을 극 (적)
    if (OHAENG_GEUK[lowerOh] === upperOh) return '비'; // 하신이 상신을 극
    if (upperOh === lowerOh) return '비화'; // 같은 오행
    return '생'; // 생관계 또는 기타
  }

  // 제1과: 일간의 기거지지
  const lower1 = GAN_TO_BRANCH[dayGan];
  const upper1 = getHeavenBranch(lower1);

  // 제2과: 제1과 상신의 천반 지지
  const lower2 = upper1;
  const upper2 = getHeavenBranch(lower2);

  // 제3과: 일지
  const lower3 = dayJi;
  const upper3 = getHeavenBranch(lower3);

  // 제4과: 제3과 상신의 천반 지지
  const lower4 = upper3;
  const upper4 = getHeavenBranch(lower4);

  return [
    { index: 1, upper: upper1, lower: lower1, relation: getRelation(upper1, lower1) },
    { index: 2, upper: upper2, lower: lower2, relation: getRelation(upper2, lower2) },
    { index: 3, upper: upper3, lower: lower3, relation: getRelation(upper3, lower3) },
    { index: 4, upper: upper4, lower: lower4, relation: getRelation(upper4, lower4) },
  ];
}

// ===================================================================
// 공개 함수 - 삼전(三傳) 도출
// ===================================================================

// 삼형(三刑) — 지지 -> 그 지지가 형(刑)하는 지지
const HYUNG_MAP: Record<string, string> = {
  '寅': '巳', '巳': '申', '申': '寅',
  '丑': '戌', '戌': '未', '未': '丑',
  '子': '卯', '卯': '子',
  '辰': '辰', '午': '午', '酉': '酉', '亥': '亥', // 자형
};

// 충(沖) 대향 지지
const CHUNG_MAP: Record<string, string> = {
  '子': '午', '午': '子', '丑': '未', '未': '丑',
  '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
};

// 역마(驛馬): 申子辰→寅, 寅午戌→申, 巳酉丑→亥, 亥卯未→巳
const YEOKMA_MAP: Record<string, string> = {
  '申': '寅', '子': '寅', '辰': '寅',
  '寅': '申', '午': '申', '戌': '申',
  '巳': '亥', '酉': '亥', '丑': '亥',
  '亥': '巳', '卯': '巳', '未': '巳',
};

/**
 * 삼전(三傳)을 도출한다 — 九宗門 발용법.
 *
 * 초전(발용):
 * - 적극이 있으면 賊(하극상)을 剋(상극하)보다 우선 취한다.
 * - 후보가 여러 개면 비용법(知一: 일간과 음양이 같은 상신)으로 좁히고,
 *   그래도 남으면 섭해(涉害: 상신의 지반이 四孟 > 四仲 우선)로 취한다.
 * - 무적극이면 복음(양일 干上神, 음일 支上神)·반음(驛馬)·호시(상신극일)·
 *   탄사(일극상신) 순으로 취하고, 나머지 특수과는 제1과 상신으로 둔다.
 * 중전 = 초전이 놓인 지반 위의 천반신 (복음은 초전의 刑)
 * 말전 = 중전이 놓인 지반 위의 천반신 (복음은 중전의 刑)
 *
 * @param saGwa - 사과 4개
 * @param cheonJiBan - 천지반 배치
 * @param dayGan - 일간 (한자)
 * @param dayJi - 일지 (한자)
 * @returns 3개의 SamJeonItem
 */
export function deriveSamJeon(
  saGwa: SaGwaItem[],
  cheonJiBan: CheonJiBanPosition[],
  dayGan: string,
  dayJi: string,
): SamJeonItem[] {
  // 천반 조회 헬퍼
  function getHeavenBranch(earthBranch: string): string {
    const idx = branchIndex(earthBranch);
    return cheonJiBan[idx].heavenBranch;
  }

  const dayYang = YANG_STEM_SET.has(dayGan);

  // 賊(하극상): 하신이 상신을 극 / 剋(상극하): 상신이 하신을 극
  const jeoks = saGwa.filter(
    (g) => OHAENG_GEUK[BRANCH_OHAENG[g.lower]] === BRANCH_OHAENG[g.upper],
  );
  const geuks = saGwa.filter(
    (g) => OHAENG_GEUK[BRANCH_OHAENG[g.upper]] === BRANCH_OHAENG[g.lower],
  );

  const bokEum = saGwa.every((g) => g.upper === g.lower);
  const banEum = saGwa.every((g) => isChungPair(g.upper, g.lower));

  let chojeonBranch: string;
  let useHyung = false;

  if (jeoks.length + geuks.length > 0) {
    // 적극 발용: 賊 우선, 없으면 剋
    const candidates = jeoks.length > 0 ? jeoks : geuks;
    if (candidates.length === 1) {
      chojeonBranch = candidates[0].upper;
    } else {
      // 비용법: 일간과 음양이 같은 상신
      const matched = candidates.filter(
        (g) => YANG_BRANCH_SET.has(g.upper) === dayYang,
      );
      const pool = matched.length > 0 ? matched : candidates;
      if (pool.length === 1) {
        chojeonBranch = pool[0].upper;
      } else {
        // 섭해: 상신의 지반 위치가 四孟(寅申巳亥) > 四仲(子午卯酉) 우선
        const earthPosOf = (upper: string) => {
          const pos = cheonJiBan.find((p) => p.heavenBranch === upper);
          return pos ? pos.earthBranch : upper;
        };
        const MENG = new Set(['寅', '申', '巳', '亥']);
        const JUNG = new Set(['子', '午', '卯', '酉']);
        chojeonBranch =
          pool.find((g) => MENG.has(earthPosOf(g.upper)))?.upper ??
          pool.find((g) => JUNG.has(earthPosOf(g.upper)))?.upper ??
          pool[0].upper;
      }
    }
  } else if (bokEum) {
    // 복음: 양일은 干上神, 음일은 支上神을 초전으로
    chojeonBranch = dayYang ? saGwa[0].upper : saGwa[2].upper;
    useHyung = true;
  } else if (banEum) {
    // 반음(무적극): 초전 = 일지의 역마, 중전 = 支上神, 말전 = 干上神
    return [
      { name: '초전', branch: YEOKMA_MAP[dayJi] ?? saGwa[0].upper, cheonJang: null, yukChin: '' },
      { name: '중전', branch: saGwa[2].upper, cheonJang: null, yukChin: '' },
      { name: '말전', branch: saGwa[0].upper, cheonJang: null, yukChin: '' },
    ];
  } else {
    // 무적극 특수과: 호시(상신극일) -> 탄사(일극상신) -> 팔전/별책/묘성 fallback
    const dayGanOh = GAN_OHAENG[dayGan];
    const hosi = saGwa.find(
      (g) => OHAENG_GEUK[BRANCH_OHAENG[g.upper]] === dayGanOh,
    );
    const tansa = saGwa.find(
      (g) => OHAENG_GEUK[dayGanOh] === BRANCH_OHAENG[g.upper],
    );
    chojeonBranch = hosi?.upper ?? tansa?.upper ?? saGwa[0].upper;
  }

  // 중전, 말전
  let jungjeonBranch: string;
  let maljeonBranch: string;
  if (useHyung) {
    if (HYUNG_MAP[chojeonBranch] === chojeonBranch) {
      // 초전이 자형: 양일은 支上神, 음일은 干上神을 중전으로
      jungjeonBranch = dayYang ? saGwa[2].upper : saGwa[0].upper;
    } else {
      jungjeonBranch = HYUNG_MAP[chojeonBranch];
    }
    // 중전이 자형이면 말전은 그 충(沖)
    maljeonBranch =
      HYUNG_MAP[jungjeonBranch] === jungjeonBranch
        ? (CHUNG_MAP[jungjeonBranch] ?? jungjeonBranch)
        : HYUNG_MAP[jungjeonBranch];
  } else {
    jungjeonBranch = getHeavenBranch(chojeonBranch);
    maljeonBranch = getHeavenBranch(jungjeonBranch);
  }

  // 삼전 구성
  const samJeon: SamJeonItem[] = [
    {
      name: '초전',
      branch: chojeonBranch,
      cheonJang: null,
      yukChin: '',
    },
    {
      name: '중전',
      branch: jungjeonBranch,
      cheonJang: null,
      yukChin: '',
    },
    {
      name: '말전',
      branch: maljeonBranch,
      cheonJang: null,
      yukChin: '',
    },
  ];

  return samJeon;
}

// ===================================================================
// 공개 함수 - 12천장(天將) 배치
// ===================================================================

/**
 * 12천장(天將)을 배치한다.
 *
 * 1. 천을귀인 위치 결정 (일간별 주/야)
 * 2. 귀인을 해당 지지에 배치
 * 3. 나머지 천장을 순행(주간)/역행(야간)으로 배치
 *
 * @param dayGan - 일간 (예: '甲')
 * @param hourBranch - 시지 (예: '卯')
 * @returns 12개의 CheonJang
 */
export function placeCheonJang(
  dayGan: string,
  hourBranch: string,
): CheonJang[] {
  // 주야 판별
  const isDaytime = DAY_BRANCHES.has(hourBranch);

  // 귀인 위치 결정
  const guiinInfo = GUIIN_TABLE[dayGan];
  if (!guiinInfo) throw new Error(`유효하지 않은 일간: ${dayGan}`);

  const guiinBranch = isDaytime ? guiinInfo.day : guiinInfo.night;

  // 귀인의 지반 인덱스
  const guiinEarthIdx = branchIndex(guiinBranch);

  // 순행/역행 순서 선택
  const order = isDaytime ? CHEONJANG_FORWARD_ORDER : CHEONJANG_REVERSE_ORDER;

  // 12천장 배치
  const result: CheonJang[] = [];
  for (let i = 0; i < 12; i++) {
    const cjIdx = order[i]; // 천장 리스트에서의 인덱스
    const cj = CHEONJANG_LIST[cjIdx];

    // 지반 위치: 귀인의 지반 인덱스에서 i만큼 이동
    // 주간: 순행(+), 야간: 역행(-)
    let earthIdx: number;
    if (isDaytime) {
      earthIdx = (guiinEarthIdx + i) % 12;
    } else {
      earthIdx = (guiinEarthIdx - i + 12) % 12;
    }

    const branch = BRANCHES[earthIdx];

    result.push({
      name: cj.name,
      hanja: cj.hanja,
      branch,
      fortune: cj.fortune,
    });
  }

  return result;
}

// ===================================================================
// 공개 함수 - 과명(課名) 판별
// ===================================================================

const YANG_STEM_SET = new Set(['甲', '丙', '戊', '庚', '壬']);
const YANG_BRANCH_SET = new Set(['子', '寅', '辰', '午', '申', '戌']);
const CHUNG_PAIR_SET = new Set(['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥']);

function isChungPair(a: string, b: string): boolean {
  return CHUNG_PAIR_SET.has(a + b) || CHUNG_PAIR_SET.has(b + a);
}

/**
 * 과명(課名)을 판별한다 — 九宗門(구종문) 분류.
 *
 * 판별 순서:
 * 1. 복음과(伏吟): 모든 과의 상신 = 하신 (천반=지반)
 * 2. 반음과(返吟): 모든 과의 상신이 하신과 충(沖)
 * 3. 중심과(重審): 하극상(下賊上)이 1개
 * 4. 원수과(元首): 하극상 없이 상극하(上克下)가 1개
 * 5. 지일과(知一): 적극이 2개 이상 → 비용법(일간과 음양이 같은 상신)으로 1개 확정
 * 6. 섭해과(涉害): 비용법으로도 1개로 좁혀지지 않음
 * 7. 팔전과(八專): 일간 기거지지 = 일지 (간지동위, 과가 2개로 축약)
 * 8. 별책과(別責): 실질 과가 3개
 * 9. 호시과(蒿矢): 상신이 일간을 요극(遥剋)
 * 10. 탄사과(彈射): 일간이 상신을 요극
 * 11. 묘성과(昴星): 위 조건 모두 해당 없음
 *
 * @param saGwa - 사과 4개
 * @param dayGan - 일간 (한자)
 * @param dayJi - 일지 (한자)
 * @returns 과명 문자열
 */
export function determineGwaMyeong(saGwa: SaGwaItem[], dayGan: string, dayJi: string): string {
  // 1~2. 복음/반음 — 구조적 조건이라 최우선 판별
  if (saGwa.every((g) => g.upper === g.lower)) return '복음과';
  if (saGwa.every((g) => isChungPair(g.upper, g.lower))) return '반음과';

  // 적극 분류: 하극상(적)과 상극하(극)를 구분한다
  const haJek = saGwa.filter(
    (g) => OHAENG_GEUK[BRANCH_OHAENG[g.lower]] === BRANCH_OHAENG[g.upper],
  );
  const sangGeuk = saGwa.filter(
    (g) => OHAENG_GEUK[BRANCH_OHAENG[g.upper]] === BRANCH_OHAENG[g.lower],
  );

  // 3~4. 하극상이 상극하보다 우선한다
  if (haJek.length === 1) return '중심과';
  if (haJek.length === 0 && sangGeuk.length === 1) return '원수과';

  // 5~6. 적극이 여러 개면 비용법 → 섭해
  const candidates = haJek.length > 1 ? haJek : sangGeuk;
  if (candidates.length > 1) {
    const dayYang = YANG_STEM_SET.has(dayGan);
    const matched = candidates.filter((g) => YANG_BRANCH_SET.has(g.upper) === dayYang);
    if (matched.length === 1) return '지일과';
    return '섭해과';
  }

  // 무적극 — 7~8. 과 수가 줄어든 경우의 특수과
  const distinctUppers = new Set(saGwa.map((g) => g.upper)).size;
  if (GAN_TO_BRANCH[dayGan] === dayJi && distinctUppers <= 2) return '팔전과';
  if (distinctUppers === 3) return '별책과';

  // 9~10. 요극 — 사과 상신과 일간 사이의 극 관계
  const dayGanOh = GAN_OHAENG[dayGan];
  if (saGwa.some((g) => OHAENG_GEUK[BRANCH_OHAENG[g.upper]] === dayGanOh)) return '호시과';
  if (saGwa.some((g) => OHAENG_GEUK[dayGanOh] === BRANCH_OHAENG[g.upper])) return '탄사과';

  // 11. 묘성과
  return '묘성과';
}

// ===================================================================
// 내부 함수 - 절기 탐색
// ===================================================================

/**
 * 일간지에서 甲 旬을 구하고 공망을 결정한다.
 */
function getVoidBranches(dayGan: string, dayJi: string): [string, string] {
  const stemIdx = stemIndex(dayGan);
  const branchIdx = branchIndex(dayJi);
  if (stemIdx === -1 || branchIdx === -1) return ['戌', '亥']; // fallback

  const sexIdx = getSexagenaryIndex(stemIdx, branchIdx);
  const jiaName = getJiaGroupName(sexIdx);
  return VOID_BRANCHES[jiaName] ?? ['戌', '亥'];
}

// ===================================================================
// 메인 계산 함수
// ===================================================================

/**
 * 대육임 과식을 계산한다.
 *
 * 단계 요약:
 * 1. 양력 -> ManseryeokEngine으로 일간/일지 획득
 * 2. 시지 계산
 * 3. 절기 -> 월장 결정
 * 4. 천지반 구성
 * 5. 사과 도출
 * 6. 삼전 도출
 * 7. 12천장 배치
 * 8. 천지반에 천장 연결
 * 9. 삼전에 천장/육친 연결
 * 10. 과명 판별
 * 11. 공망 결정
 *
 * @param solarDate - 양력 날짜 "YYYY-MM-DD"
 * @param hour - 시각 (0-23)
 * @returns DaeyukimResult
 */
function findRelevantSolarTermForWolJang(solarDate: string, hour: number): string {
  const [year, month, day] = solarDate.split('-').map(Number);
  // 중기의 실제 절입 시각(KST timestamp)을 기준으로 비교한다
  const targetTime = toKstTimestamp({ year, month, day, hour, minute: 0, second: 0 });
  const candidates = [
    ...ManseryeokEngine.listSolarTermsForYear(year - 1),
    ...ManseryeokEngine.listSolarTermsForYear(year),
  ];

  let bestName = '동지';
  let bestTime = -Infinity;

  for (const term of candidates) {
    if (!WOLJIANG_SOLAR_TERMS.has(term.koreanName)) {
      continue;
    }

    const termTime = toKstTimestamp({
      year: term.year,
      month: term.month,
      day: term.day,
      hour: term.hour,
      minute: term.minute,
      second: term.second,
    });
    if (termTime <= targetTime && termTime > bestTime) {
      bestTime = termTime;
      bestName = term.koreanName;
    }
  }

  return bestName;
}

export function calculateDaeyukim(solarDate: string, hour: number): DaeyukimResult {
  // --- 1. 날짜 파싱 ---
  const context = ManseryeokEngine.getSolarContextFromDateString(solarDate, hour);

  // --- 2. 일간/일지 ---
  const dayGan: string = context.ganji.day.gan;
  const dayJi: string = context.ganji.day.ji;

  // --- 3. 시지 ---
  const hourBranchIdx = hourToBranchIndex(hour);
  const hourJi = BRANCHES[hourBranchIdx];

  // --- 4. 월장 결정 ---
  const solarTermName = findRelevantSolarTermForWolJang(solarDate, hour);
  const wolJang = getWolJang(solarTermName);

  // --- 5. 천지반 구성 ---
  const cheonJiBan = buildCheonJiBan(wolJang, hourJi);

  // --- 6. 사과 도출 ---
  const saGwa = deriveSaGwa(dayGan, dayJi, cheonJiBan);

  // --- 7. 삼전 도출 ---
  const samJeon = deriveSamJeon(saGwa, cheonJiBan, dayGan, dayJi);

  // --- 8. 12천장 배치 ---
  const cheonJangList = placeCheonJang(dayGan, hourJi);

  // --- 9. 천지반에 천장 연결 ---
  for (const cj of cheonJangList) {
    const earthIdx = branchIndex(cj.branch);
    if (earthIdx >= 0 && earthIdx < 12) {
      cheonJiBan[earthIdx] = {
        ...cheonJiBan[earthIdx],
        cheonJang: {
          name: cj.name,
          hanja: cj.hanja,
          branch: cj.branch,
          fortune: cj.fortune,
        },
      };
    }
  }

  // --- 10. 삼전에 천장/육친 연결 ---
  const dayGanOh = GAN_OHAENG[dayGan];
  for (const jeon of samJeon) {
    // 삼전의 branch가 놓인 지반 위치에서 천장을 가져옴
    const jeonBranchIdx = branchIndex(jeon.branch);
    if (jeonBranchIdx >= 0) {
      jeon.cheonJang = cheonJiBan[jeonBranchIdx].cheonJang;
    }
    // 육친 계산
    const jeonOh = BRANCH_OHAENG[jeon.branch];
    jeon.yukChin = getYukChin(dayGanOh, jeonOh);
  }

  // --- 11. 과명 판별 ---
  const gwaMyeong = determineGwaMyeong(saGwa, dayGan, dayJi);

  // --- 12. 공망 결정 ---
  const voidBranches = getVoidBranches(dayGan, dayJi);

  return {
    solarDate,
    dayGan,
    dayJi,
    hourJi,
    wolJang,
    cheonJiBan,
    saGwa,
    samJeon,
    cheonJangList,
    gwaMyeong,
    voidBranches,
  };
}
