// @TASK P9-R1-T1 - 기문둔갑 상수 데이터
// @SPEC docs/planning/06-tasks.md#P9-R1-T1

// ---------- 천간/지지 ----------

/** 10천간 (天干) */
export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;

/** 12지지 (地支) */
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

// ---------- 구궁 (九宮) ----------

/** 궁 이름 (낙서 순서 1-9) */
export const PALACE_NAMES = [
  '감궁', // 1 - 坎 (북)
  '곤궁', // 2 - 坤 (남서)
  '진궁', // 3 - 震 (동)
  '손궁', // 4 - 巽 (남동)
  '중궁', // 5 - 中 (중앙)
  '건궁', // 6 - 乾 (북서)
  '태궁', // 7 - 兌 (서)
  '간궁', // 8 - 艮 (북동)
  '이궁', // 9 - 離 (남)
] as const;

/** 궁 한자 이름 */
export const PALACE_HANJA = [
  '坎宮', '坤宮', '震宮', '巽宮', '中宮', '乾宮', '兌宮', '艮宮', '離宮',
] as const;

// ---------- 구성 (九星) ----------

/** 기문둔갑 구성 (九星) - 본궁 순서 1-9 */
export const QIMEN_STARS = [
  { name: '천봉', hanja: '天蓬', homePalace: 1 },
  { name: '천예', hanja: '天芮', homePalace: 2 },
  { name: '천충', hanja: '天沖', homePalace: 3 },
  { name: '천보', hanja: '天輔', homePalace: 4 },
  { name: '천금', hanja: '天禽', homePalace: 5 },
  { name: '천심', hanja: '天心', homePalace: 6 },
  { name: '천주', hanja: '天柱', homePalace: 7 },
  { name: '천임', hanja: '天任', homePalace: 8 },
  { name: '천영', hanja: '天英', homePalace: 9 },
] as const;

// ---------- 팔문 (八門) ----------

/** 기문둔갑 팔문 (八門) - 본궁 순서 */
export const QIMEN_GATES = [
  { name: '휴문', hanja: '休門', homePalace: 1 },
  { name: '사문', hanja: '死門', homePalace: 2 },
  { name: '상문', hanja: '傷門', homePalace: 3 },
  { name: '두문', hanja: '杜門', homePalace: 4 },
  // 중궁(5)에는 문이 없음
  { name: '개문', hanja: '開門', homePalace: 6 },
  { name: '경문', hanja: '驚門', homePalace: 7 },
  { name: '생문', hanja: '生門', homePalace: 8 },
  { name: '경문', hanja: '景門', homePalace: 9 },
] as const;

// ---------- 팔신 (八神) ----------

/** 양둔 팔신 순서 */
export const YANG_DEITIES = [
  { name: '직부', hanja: '值符' },
  { name: '등사', hanja: '螣蛇' },
  { name: '태음', hanja: '太陰' },
  { name: '육합', hanja: '六合' },
  { name: '백호', hanja: '白虎' },
  { name: '현무', hanja: '玄武' },
  { name: '구지', hanja: '九地' },
  { name: '구천', hanja: '九天' },
] as const;

/** 음둔 팔신 순서 */
export const YIN_DEITIES = [
  { name: '직부', hanja: '值符' },
  { name: '등사', hanja: '螣蛇' },
  { name: '태음', hanja: '太陰' },
  { name: '육합', hanja: '六合' },
  { name: '현무', hanja: '玄武' },
  { name: '백호', hanja: '白虎' },
  { name: '구천', hanja: '九天' },
  { name: '구지', hanja: '九地' },
] as const;

// ---------- 삼기육의 (三奇六儀) ----------

/**
 * 삼기육의 배치 순서 (지반 배치용)
 * 六儀: 戊(甲子), 己(甲戌), 庚(甲申), 辛(甲午), 壬(甲辰), 癸(甲寅)
 * 三奇: 丁(星奇), 丙(月奇), 乙(日奇)
 */
export const SANQI_LIUYI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'] as const;

/**
 * 6甲 → 둔갑 의(儀) 매핑
 * 甲이 숨는 위치: 甲子→戊, 甲戌→己, 甲申→庚, 甲午→辛, 甲辰→壬, 甲寅→癸
 */
export const JIA_HIDE_MAP: Record<string, string> = {
  '甲子': '戊', '甲戌': '己', '甲申': '庚',
  '甲午': '辛', '甲辰': '壬', '甲寅': '癸',
};

/**
 * 60甲子에서 각 간지가 속하는 甲 旬
 * 0~9: 甲子旬, 10~19: 甲戌旬, 20~29: 甲申旬,
 * 30~39: 甲午旬, 40~49: 甲辰旬, 50~59: 甲寅旬
 */
export function getJiaGroup(stemIdx: number, branchIdx: number): string {
  const ganzhiIdx = (stemIdx * 6 + branchIdx * 5) % 60;
  // 더 간단한 방법: 60甲子 인덱스 = (stemIdx - branchIdx + 60) % 10 gives the offset within group
  // 甲 그룹 = floor(ganzhiIdx / 10) * 10
  const jiaNames = ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'];
  const groupIdx = Math.floor(ganzhiIdx / 10);
  return jiaNames[groupIdx];
}

/**
 * 천간+지지 인덱스로 60甲子 인덱스 계산
 */
export function getSexagenaryIndex(stemIdx: number, branchIdx: number): number {
  // 60甲子: 甲子=0, 乙丑=1, ..., 癸亥=59
  // stemIdx와 branchIdx의 패리티가 같아야 유효한 간지
  for (let i = 0; i < 60; i++) {
    if (i % 10 === stemIdx && i % 12 === branchIdx) return i;
  }
  return 0;
}

// ---------- 공망 (空亡) ----------

/**
 * 각 甲 旬의 공망 지지 쌍
 */
export const VOID_BRANCHES: Record<string, [string, string]> = {
  '甲子': ['戌', '亥'],
  '甲戌': ['申', '酉'],
  '甲申': ['午', '未'],
  '甲午': ['辰', '巳'],
  '甲辰': ['寅', '卯'],
  '甲寅': ['子', '丑'],
};

// ---------- 절기 → 국수 매핑 ----------

/** 24절기 이름 (순서대로) */
export const SOLAR_TERMS = [
  '소한', '대한', '입춘', '우수', '경칩', '춘분',
  '청명', '곡우', '입하', '소만', '망종', '하지',
  '소서', '대서', '입추', '처서', '백로', '추분',
  '한로', '상강', '입동', '소설', '대설', '동지',
] as const;

/**
 * 양둔 절기별 국수 [상원, 중원, 하원]
 * 동지~망종 (12절기)
 */
export const YANG_BUREAU: Record<string, [number, number, number]> = {
  '동지': [1, 7, 4],
  '소한': [2, 8, 5],
  '대한': [3, 9, 6],
  '입춘': [8, 5, 2],
  '우수': [9, 6, 3],
  '경칩': [1, 7, 4],
  '춘분': [3, 9, 6],
  '청명': [4, 1, 7],
  '곡우': [5, 2, 8],
  '입하': [4, 1, 7],
  '소만': [5, 2, 8],
  '망종': [6, 3, 9],
};

/**
 * 음둔 절기별 국수 [상원, 중원, 하원]
 * 하지~대설 (12절기)
 */
export const YIN_BUREAU: Record<string, [number, number, number]> = {
  '하지': [9, 3, 6],
  '소서': [8, 2, 5],
  '대서': [7, 1, 4],
  '입추': [2, 5, 8],
  '처서': [1, 4, 7],
  '백로': [9, 3, 6],
  '추분': [7, 1, 4],
  '한로': [6, 9, 3],
  '상강': [5, 8, 2],
  '입동': [6, 9, 3],
  '소설': [5, 8, 2],
  '대설': [4, 7, 1],
};

// ---------- 순행/역행 궁 순서 ----------

/**
 * 양둔 궁 순행 순서 (중궁 제외, 중궁은 곤궁2에 기궁)
 * 1→2→3→4→(5→2)→6→7→8→9→1
 */
export const FORWARD_SEQUENCE = [1, 2, 3, 4, 6, 7, 8, 9] as const;

/**
 * 음둔 궁 역행 순서
 * 9→8→7→6→(5→8)→4→3→2→1→9
 */
export const REVERSE_SEQUENCE = [9, 8, 7, 6, 4, 3, 2, 1] as const;

/**
 * 양둔 순행: 현재 궁에서 다음 궁 (중궁 5 건너뜀)
 */
export function nextPalaceForward(current: number): number {
  if (current === 4) return 6; // 5(중궁) 건너뜀
  if (current === 9) return 1;
  return current + 1;
}

/**
 * 음둔 역행: 현재 궁에서 다음 궁 (중궁 5 건너뜀)
 */
export function nextPalaceReverse(current: number): number {
  if (current === 6) return 4; // 5(중궁) 건너뜀
  if (current === 1) return 9;
  return current - 1;
}

// ---------- 격국 판별 상수 ----------

/** 기문둔갑 격국 정의 */
export const QIMEN_GYEOKGUKS = [
  {
    name: '복음격',
    hanja: '伏吟格',
    description: '천반과 지반이 동일한 간이 같은 궁에 위치. 사물이 정체되어 움직이지 못함.',
    fortune: '흉' as const,
  },
  {
    name: '반음격',
    hanja: '反吟格',
    description: '천반과 지반이 대충(對沖) 관계. 사물이 반복되거나 되돌아옴.',
    fortune: '흉' as const,
  },
  {
    name: '천을회합격',
    hanja: '天乙會合格',
    description: '일기(乙)와 직부(값부)가 같은 궁에 회합. 귀인의 도움을 받음.',
    fortune: '길' as const,
  },
  {
    name: '용둔격',
    hanja: '龍遁格',
    description: '천반에 乙이 있고 지반에 戊가 있는 궁. 용이 구름을 타고 오르는 상.',
    fortune: '길' as const,
  },
  {
    name: '호둔격',
    hanja: '虎遁格',
    description: '천반에 辛이 있고 지반에 乙이 있는 궁. 호랑이가 숲에 숨는 상.',
    fortune: '길' as const,
  },
  {
    name: '풍둔격',
    hanja: '風遁格',
    description: '천반에 乙이 있고 지반에 丙이 있는 궁. 바람이 불어 불이 일어나는 상.',
    fortune: '길' as const,
  },
  {
    name: '운둔격',
    hanja: '雲遁格',
    description: '천반에 丙이 있고 지반에 壬이 있는 궁. 구름이 하늘을 덮는 상.',
    fortune: '길' as const,
  },
  {
    name: '청룡반수격',
    hanja: '靑龍返首格',
    description: '직부(값부)가 임지(臨地) 천반에서 생문·개문과 동궁. 대길한 격.',
    fortune: '길' as const,
  },
  {
    name: '비조타혈격',
    hanja: '飛鳥跌穴格',
    description: '직사(값사)가 양둔 순행/음둔 역행하여 도착한 궁이 본궁과 충. 난관이 해소됨.',
    fortune: '길' as const,
  },
  {
    name: '형격',
    hanja: '刑格',
    description: '천반의 간이 지반의 간을 극(克)하는 관계. 형벌과 손해의 상.',
    fortune: '흉' as const,
  },
] as const;

// ---------- 문·성 길흉 ----------

/** 팔문 길흉 판별 */
export const GATE_FORTUNE: Record<string, '길' | '흉' | '평'> = {
  '개문': '길', '휴문': '길', '생문': '길',
  '경문': '평',
  '사문': '흉', '상문': '흉', '두문': '흉',
};

// 경문(驚門)과 경문(景門) 구분을 위해 한자 기반 판별
export const GATE_FORTUNE_BY_HANJA: Record<string, '길' | '흉' | '평'> = {
  '開門': '길', '休門': '길', '生門': '길',
  '景門': '평', '驚門': '흉',
  '死門': '흉', '傷門': '흉', '杜門': '흉',
};

/** 구성 길흉 판별 */
export const STAR_FORTUNE: Record<string, '길' | '흉' | '평'> = {
  '천심': '길', '천임': '길', '천보': '길',
  '천충': '평', '천금': '평',
  '천봉': '흉', '천예': '흉', '천주': '흉', '천영': '흉',
};
