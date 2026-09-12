// @TASK P9-R1-T1 - 기문둔갑(奇門遁甲) 코어 엔진
// @SPEC docs/planning/06-tasks.md#P9-R1-T1

import type { DunType, QimenPalace, QimenResult, QimenGyeokguk } from '@/engine/types';
import { ManseryeokEngine } from '@/engine/core/manseryeok-engine';
import { ManseryeokDataError } from '@/engine/core/errors';
import {
  STEMS,
  BRANCHES,
  PALACE_NAMES,
  QIMEN_STARS,
  QIMEN_GATES,
  YANG_DEITIES,
  YIN_DEITIES,
  SANQI_LIUYI,
  JIA_HIDE_MAP,
  VOID_BRANCHES,
  YANG_BUREAU,
  YIN_BUREAU,
  QIMEN_GYEOKGUKS,
  nextPalaceForward,
  nextPalaceReverse,
  getSexagenaryIndex,
} from './constants';


// ---------- 절기 집합 ----------

const YANG_TERMS = new Set(Object.keys(YANG_BUREAU));
const YIN_TERMS = new Set(Object.keys(YIN_BUREAU));

// ---------- 8궁 순서 (중궁 5 제외) ----------

const FORWARD_ORDER = [1, 2, 3, 4, 6, 7, 8, 9] as const;
const REVERSE_ORDER = [9, 8, 7, 6, 4, 3, 2, 1] as const;

// ---------- 간체 중국어 -> 한국어 절기명 매핑 ----------
// 절기명은 solar-terms 모듈에서 한국어로 변환하여 제공한다.

// ---------- 시각 -> 지지 인덱스 ----------

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

// ---------- 보조 유틸 ----------

function stemIndex(stem: string): number {
  const idx = STEMS.indexOf(stem as (typeof STEMS)[number]);
  if (idx === -1) throw new Error(`유효하지 않은 천간: ${stem}`);
  return idx;
}

function sanqiIndex(stem: string): number {
  const idx = SANQI_LIUYI.indexOf(stem as (typeof SANQI_LIUYI)[number]);
  if (idx === -1) throw new Error(`삼기육의에 없는 간: ${stem}`);
  return idx;
}

/** 중궁(5)이면 기궁 궁(양둔=2, 음둔=8)으로 변환한다. */
function resolveCenter(palace: number, dunType: DunType): number {
  if (palace !== 5) return palace;
  return dunType === '양둔' ? 2 : 8;
}

// ===================================================================
// 공개 함수 - 시간 지지/천간
// ===================================================================

/**
 * 시각(0-23)에서 시진 지지(한자)를 반환한다.
 *
 * @param hour - 시각 (0-23)
 * @returns 지지 한자 (예: '子', '丑')
 */
export function getHourBranch(hour: number): string {
  if (hour < 0 || hour > 23) throw new Error(`유효하지 않은 시각: ${hour}`);
  return BRANCHES[hourToBranchIndex(hour)];
}

/**
 * 일간과 시진 지지 인덱스로 시간 천간을 계산한다.
 *
 * 오서기(五鼠起) 원리:
 *   甲/己일 -> 甲子시 시작 (offset 0)
 *   乙/庚일 -> 丙子시 시작 (offset 2)
 *   丙/辛일 -> 戊子시 시작 (offset 4)
 *   丁/壬일 -> 庚子시 시작 (offset 6)
 *   戊/癸일 -> 壬子시 시작 (offset 8)
 *
 * @param dayGan - 일간 한자 (예: '甲')
 * @param hourBranchIdx - 시진 지지 인덱스 (0=子 ~ 11=亥)
 * @returns 시간 천간 한자
 */
export function getHourStem(dayGan: string, hourBranchIdx: number): string {
  const dayIdx = stemIndex(dayGan);
  const group = dayIdx % 5;
  const offsets = [0, 2, 4, 6, 8];
  return STEMS[(offsets[group] + hourBranchIdx) % 10];
}

// ===================================================================
// 공개 함수 - 양둔/음둔, 국수, 지반
// ===================================================================

/**
 * 절기명으로 양둔/음둔을 판별한다.
 *
 * 동지~망종(12절기) = 양둔, 하지~대설(12절기) = 음둔
 */
export function getDunType(solarTermName: string): DunType {
  if (YANG_TERMS.has(solarTermName)) return '양둔';
  if (YIN_TERMS.has(solarTermName)) return '음둔';
  throw new Error(`인식할 수 없는 절기: ${solarTermName}`);
}

/**
 * 절기명과 원(元)으로 국수를 결정한다.
 */
export function getBureauNumber(
  solarTermName: string,
  yuan: '상원' | '중원' | '하원',
): number {
  const yuanIdx = yuan === '상원' ? 0 : yuan === '중원' ? 1 : 2;
  const bureau = YANG_BUREAU[solarTermName] ?? YIN_BUREAU[solarTermName];
  if (!bureau) throw new ManseryeokDataError(`절기 '${solarTermName}'에 대한 국수 데이터가 없습니다.`, { solarTermName });
  return bureau[yuanIdx];
}

/**
 * 지반(地盤)을 배치한다.
 *
 * 삼기육의 9개 간(戊->己->庚->辛->壬->癸->丁->丙->乙)을 9궁에 배치한다.
 * - 양둔: 戊를 국수 궁에 놓고 궁수 순행 (戊->己->… 순으로 궁수 +1, mod 9)
 * - 음둔: 戊를 국수 궁에 놓고 궁수 역행 (궁수 -1, mod 9)
 * - 중궁(5)에도 간이 놓인다. 중궁의 간은 후속 8궁 구조(구성/팔문/팔신)에서
 *   기궁 궁(양둔=곤궁2, 음둔=간궁8)으로 귀속시켜 해석한다.
 *
 * @param bureauNumber - 국수 (1-9)
 * @param dunType - '양둔' | '음둔'
 * @returns Map<궁번호(1-9), 지반간>
 */
export function placeEarthPlate(
  bureauNumber: number,
  dunType: DunType,
): Map<number, string> {
  const plate = new Map<number, string>();
  const dir = dunType === '양둔' ? 1 : -1;

  // SANQI_LIUYI = [戊, 己, 庚, 辛, 壬, 癸, 丁, 丙, 乙]
  // 9개 간을 9궁(중궁 포함)에 모두 배치한다.
  for (let i = 0; i < 9; i++) {
    const palace = (((bureauNumber - 1 + dir * i) % 9) + 9) % 9 + 1;
    plate.set(palace, SANQI_LIUYI[i]);
  }

  return plate;
}

// ===================================================================
// 내부 함수 - 절기 탐색 / 원(元) / 甲旬
// ===================================================================

/**
 * 일간지로 원(元)을 결정한다 (拆補法 부두 규칙).
 *
 * 부두(符頭)는 5일 주기의 시작일로 천간이 甲 또는 己인 날이다.
 * 해당일이 속한 부두의 지지로 원을 정한다:
 * - 부두 지지가 子·午·卯·酉 → 상원
 * - 부두 지지가 寅·申·巳·亥 → 중원
 * - 부두 지지가 辰·戌·丑·未 → 하원
 */
function determineYuan(dayGan: string, dayJi: string): '상원' | '중원' | '하원' {
  const sexIdx = getSexagenaryIndex(
    stemIndex(dayGan),
    (BRANCHES as readonly string[]).indexOf(dayJi),
  );
  // 가장 가까운 이전 부두(甲=간지인덱스%10==0, 己==5)까지의 거리
  const r = sexIdx % 10;
  const back = r < 5 ? r : r - 5;
  const buduBranchIdx = ((sexIdx - back) % 12 + 12) % 12;
  if ([0, 6, 3, 9].includes(buduBranchIdx)) return '상원'; // 子午卯酉
  if ([2, 8, 4, 10].includes(buduBranchIdx)) return '중원'; // 寅申巳亥
  return '하원'; // 辰戌丑未
}

/**
 * 시간 천간/지지 인덱스로 해당 시진이 속하는 甲 旬 이름을 구한다.
 */
function getJiaGroupName(hourStemIdx: number, hourBranchIdx: number): string {
  const sexIdx = getSexagenaryIndex(hourStemIdx, hourBranchIdx);
  const names = ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'];
  return names[Math.floor(sexIdx / 10)];
}

// ===================================================================
// 내부 함수 - 포국 배치
// ===================================================================

/** 지반에서 특정 간이 놓인 궁을 찾는다 (중궁 제외). */
function findPalaceOfStem(plate: Map<number, string>, stem: string): number {
  for (const [p, s] of plate.entries()) {
    if (p === 5) continue;
    if (s === stem) return p;
  }
  return 5;
}

/**
 * 구성(九星)을 배치한다.
 *
 * 직부성을 시간 의(儀)가 놓인 지반 궁에 배치하고
 * 나머지를 순행(양둔)/역행(음둔)으로 돌린다.
 *
 * @returns Map<궁번호, QIMEN_STARS 인덱스(0-8)>
 */
function placeStars(
  zhifuHomePalace: number,
  hourEarthPalace: number,
  dunType: DunType,
): Map<number, number> {
  const result = new Map<number, number>();
  const nextFn = dunType === '양둔' ? nextPalaceForward : nextPalaceReverse;

  const zhifuIdx = resolveCenter(zhifuHomePalace, dunType) - 1;

  // 직부성부터 8개 성을 순서대로 배치 (9번째는 중궁=기궁)
  const stars: number[] = [];
  for (let i = 0; i < 8; i++) {
    stars.push((zhifuIdx + i) % 9);
  }

  let palace = resolveCenter(hourEarthPalace, dunType);
  for (let i = 0; i < 8; i++) {
    result.set(palace, stars[i]);
    palace = nextFn(palace);
    if (palace === 5) palace = nextFn(palace);
  }

  // 중궁: 기궁 궁과 동일
  result.set(5, result.get(dunType === '양둔' ? 2 : 8)!);
  return result;
}

/**
 * 천반(天盤)을 배치한다.
 *
 * 직부성 본궁의 지반간을 시간 의(儀) 궁으로 이동시키는 편차를 구하고,
 * 8궁 전부에 같은 편차를 적용한다.
 */
function placeHeavenPlate(
  earthPlate: Map<number, string>,
  zhifuHomePalace: number,
  hourEarthPalace: number,
  dunType: DunType,
): Map<number, string> {
  const heaven = new Map<number, string>();
  const order: readonly number[] = dunType === '양둔' ? FORWARD_ORDER : REVERSE_ORDER;

  const effHome = resolveCenter(zhifuHomePalace, dunType);
  const effHour = resolveCenter(hourEarthPalace, dunType);

  const fromIdx = order.indexOf(effHome);
  const toIdx = order.indexOf(effHour);
  const shift = ((toIdx - fromIdx) % 8 + 8) % 8;

  for (let i = 0; i < 8; i++) {
    const src = order[i];
    const dst = order[(i + shift) % 8];
    heaven.set(dst, earthPlate.get(src)!);
  }

  heaven.set(5, heaven.get(dunType === '양둔' ? 2 : 8)!);
  return heaven;
}

/**
 * 팔문(八門)을 배치한다.
 *
 * 직사문(值使門) = 직부성 본궁의 문.
 * 직사문을 시간 의(儀) 궁에 놓고 나머지를 순행/역행.
 *
 * @returns Map<궁번호, QIMEN_GATES 인덱스(0-7)>
 */
function placeGates(
  zhifuHomePalace: number,
  hourEarthPalace: number,
  dunType: DunType,
): Map<number, number> {
  const result = new Map<number, number>();
  const nextFn = dunType === '양둔' ? nextPalaceForward : nextPalaceReverse;

  const effHome = resolveCenter(zhifuHomePalace, dunType);
  const zhishiIdx = QIMEN_GATES.findIndex(g => g.homePalace === effHome);
  if (zhishiIdx === -1) throw new Error(`본궁 ${effHome}에 해당하는 문이 없습니다.`);

  const gates: number[] = [];
  for (let i = 0; i < 8; i++) {
    gates.push((zhishiIdx + i) % 8);
  }

  let palace = resolveCenter(hourEarthPalace, dunType);
  for (let i = 0; i < 8; i++) {
    result.set(palace, gates[i]);
    palace = nextFn(palace);
    if (palace === 5) palace = nextFn(palace);
  }

  result.set(5, result.get(dunType === '양둔' ? 2 : 8)!);
  return result;
}

/**
 * 팔신(八神)을 배치한다.
 *
 * 직부(值符)신을 직부성이 있는 궁에 놓고 나머지를 순행/역행.
 *
 * @returns Map<궁번호, 팔신 인덱스(0-7)>
 */
function placeDeities(
  zhifuStarPalace: number,
  dunType: DunType,
): Map<number, number> {
  const result = new Map<number, number>();
  const nextFn = dunType === '양둔' ? nextPalaceForward : nextPalaceReverse;

  let palace = resolveCenter(zhifuStarPalace, dunType);
  for (let i = 0; i < 8; i++) {
    result.set(palace, i);
    palace = nextFn(palace);
    if (palace === 5) palace = nextFn(palace);
  }

  result.set(5, result.get(dunType === '양둔' ? 2 : 8)!);
  return result;
}

// ===================================================================
// 격국 판별
// ===================================================================

function determineGyeokguk(
  earthPlate: Map<number, string>,
  heavenPlate: Map<number, string>,
): QimenGyeokguk | null {
  const palaces8 = [1, 2, 3, 4, 6, 7, 8, 9];

  // 복음: 천반간 === 지반간 3개 이상
  let fuyin = 0;
  for (const p of palaces8) {
    if (heavenPlate.get(p) === earthPlate.get(p)) fuyin++;
  }
  if (fuyin >= 3) {
    const g = QIMEN_GYEOKGUKS[0];
    return { name: g.name, hanja: g.hanja, description: g.description, fortune: g.fortune };
  }

  // 반음: 삼기육의 인덱스 합이 8인 쌍 3개 이상
  let fanyin = 0;
  for (const p of palaces8) {
    const e = earthPlate.get(p);
    const h = heavenPlate.get(p);
    if (!e || !h) continue;
    try {
      if (sanqiIndex(e) + sanqiIndex(h) === 8) fanyin++;
    } catch { /* skip */ }
  }
  if (fanyin >= 3) {
    const g = QIMEN_GYEOKGUKS[1];
    return { name: g.name, hanja: g.hanja, description: g.description, fortune: g.fortune };
  }

  // 특수 격국
  for (const p of palaces8) {
    const h = heavenPlate.get(p);
    const e = earthPlate.get(p);
    if (!h || !e) continue;

    if (h === '乙' && e === '戊') {
      const g = QIMEN_GYEOKGUKS[3]; // 용둔격
      return { name: g.name, hanja: g.hanja, description: g.description, fortune: g.fortune };
    }
    if (h === '辛' && e === '乙') {
      const g = QIMEN_GYEOKGUKS[4]; // 호둔격
      return { name: g.name, hanja: g.hanja, description: g.description, fortune: g.fortune };
    }
    if (h === '乙' && e === '丙') {
      const g = QIMEN_GYEOKGUKS[5]; // 풍둔격
      return { name: g.name, hanja: g.hanja, description: g.description, fortune: g.fortune };
    }
    if (h === '丙' && e === '壬') {
      const g = QIMEN_GYEOKGUKS[6]; // 운둔격
      return { name: g.name, hanja: g.hanja, description: g.description, fortune: g.fortune };
    }
  }

  return null;
}

// ===================================================================
// 궁별 공망 대응 지지
// ===================================================================

const PALACE_BRANCHES: Record<number, string[]> = {
  1: ['子'], 2: ['未', '申'], 3: ['卯'], 4: ['辰', '巳'],
  5: [],
  6: ['戌', '亥'], 7: ['酉'], 8: ['丑', '寅'], 9: ['午'],
};

// ===================================================================
// 메인 계산 함수
// ===================================================================

/**
 * 기문둔갑 포국을 계산한다 (시국파 기본).
 *
 * 단계 요약:
 * 1. 양력 -> ManseryeokEngine으로 일간/일지 획득
 * 2. 시간 천간/시지 계산
 * 3. 절기 -> 양둔/음둔 판별
 * 4. 원(元) -> 국수 결정
 * 5. 지반 배치
 * 6. 甲旬 -> 둔갑 의(儀) 결정
 * 7. 직부성/직사문 결정
 * 8. 구성/천반/팔문/팔신 배치
 * 9. 공망/격국 판별
 *
 * @param solarDate - 양력 날짜 "YYYY-MM-DD"
 * @param hour      - 시각 (0-23)
 * @returns QimenResult
 */
export function calculateQimen(solarDate: string, hour: number): QimenResult {
  // --- 1. 날짜 파싱 ---
  const context = ManseryeokEngine.getSolarContextFromDateString(solarDate, hour);

  // --- 2. 일간/일지 ---
  const dayGan: string = context.ganji.day.gan;
  const dayJi: string = context.ganji.day.ji;

  // --- 3. 시간 천간/시지 ---
  const hourBranchIdx = hourToBranchIndex(hour);
  const hourJi = BRANCHES[hourBranchIdx];
  const hourGan = getHourStem(dayGan, hourBranchIdx);

  // --- 4. 절기 -> 양둔/음둔 ---
  // 현재 절기는 입력 시각의 실제 timestamp 기준으로 조회한다
  const termInfo = context.currentSolarTerm;
  const dunType = getDunType(termInfo.koreanName);

  // --- 5. 원(元) ---
  const yuan = determineYuan(dayGan, dayJi);

  // --- 6. 국수 ---
  const bureauNumber = getBureauNumber(termInfo.koreanName, yuan);

  // --- 7. 지반 배치 ---
  const earthPlate = placeEarthPlate(bureauNumber, dunType);

  // --- 8. 甲旬 / 둔갑 ---
  const hourStemIdx = stemIndex(hourGan);
  const jiaGroup = getJiaGroupName(hourStemIdx, hourBranchIdx);
  const hiddenJia = JIA_HIDE_MAP[jiaGroup];

  // --- 9. 직부성: 지반에서 甲이 숨는 의(儀)가 놓인 궁의 구성 ---
  const zhifuHomePalace = findPalaceOfStem(earthPlate, hiddenJia);

  // --- 10. 시간 의(儀)가 놓인 지반 궁 ---
  const effectiveHourStem = hourGan === '甲' ? hiddenJia : hourGan;
  const isSanqi = SANQI_LIUYI.includes(effectiveHourStem as (typeof SANQI_LIUYI)[number]);
  const hourEarthPalace = isSanqi
    ? findPalaceOfStem(earthPlate, effectiveHourStem)
    : zhifuHomePalace;

  // --- 11. 구성 배치 ---
  const starMap = placeStars(zhifuHomePalace, hourEarthPalace, dunType);

  // --- 12. 천반 배치 ---
  const heavenPlate = placeHeavenPlate(earthPlate, zhifuHomePalace, hourEarthPalace, dunType);

  // --- 13. 팔문 배치 ---
  const gateMap = placeGates(zhifuHomePalace, hourEarthPalace, dunType);

  // --- 14. 팔신 배치 ---
  const zhifuStarPalace = resolveCenter(hourEarthPalace, dunType);
  const deityMap = placeDeities(zhifuStarPalace, dunType);

  // --- 15. 공망 ---
  const voidBranches = VOID_BRANCHES[jiaGroup];

  // --- 16. 격국 ---
  const gyeokguk = determineGyeokguk(earthPlate, heavenPlate);

  // --- 17. 직부성/직사문 이름 ---
  const zhifuStarName = QIMEN_STARS[resolveCenter(zhifuHomePalace, dunType) - 1].name;
  const effGateHome = resolveCenter(zhifuHomePalace, dunType);
  const zhishiGate = QIMEN_GATES.find(g => g.homePalace === effGateHome);
  const zhishiGateName = zhishiGate?.name ?? '미상';

  // --- 18. 9궁 조립 ---
  const deities = dunType === '양둔' ? YANG_DEITIES : YIN_DEITIES;
  const palaces: QimenPalace[] = [];

  for (let num = 1; num <= 9; num++) {
    const starIdx = starMap.get(num) ?? 0;
    const gateIdx = gateMap.get(num) ?? 0;
    const deityIdx = deityMap.get(num) ?? 0;

    const star = QIMEN_STARS[starIdx];
    const gate = QIMEN_GATES[gateIdx];
    const deity = deities[deityIdx];

    const branches = PALACE_BRANCHES[num] ?? [];
    const isVoid = branches.some(b => b === voidBranches[0] || b === voidBranches[1]);

    palaces.push({
      index: num,
      name: PALACE_NAMES[num - 1],
      earthStem: earthPlate.get(num) ?? '',
      heavenStem: heavenPlate.get(num) ?? '',
      gate: gate.name,
      gateHanja: gate.hanja,
      star: star.name,
      starHanja: star.hanja,
      deity: deity.name,
      deityHanja: deity.hanja,
      isVoid,
    });
  }

  return {
    dunType,
    bureauNumber,
    solarTerm: termInfo.koreanName,
    yuan,
    solarDate,
    dayGan,
    dayJi,
    hourGan,
    hourJi,
    hiddenJia,
    palaces,
    gyeokguk,
    voidBranches,
    zhifu: zhifuStarName,
    zhishi: zhishiGateName,
  };
}
