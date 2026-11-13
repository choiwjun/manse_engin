// @TASK P10-R1-T1 - 대육임(大六壬) 상수 데이터
// @SPEC docs/planning/06-tasks.md#P10-R1-T1

// ---------- 천간/지지 ----------

/** 10천간 (天干) */
export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;

/** 12지지 (地支) */
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

// ---------- 지지별 오행 ----------

/** 지지 -> 오행 매핑 */
export const BRANCH_OHAENG: Record<string, string> = {
  '子': '수', '丑': '토', '寅': '목', '卯': '목',
  '辰': '토', '巳': '화', '午': '화', '未': '토',
  '申': '금', '酉': '금', '戌': '토', '亥': '수',
};

// ---------- 오행 상극 관계 ----------

/**
 * 오행 상극: A가 B를 극하는 관계
 * 목->토, 화->금, 토->수, 금->목, 수->화
 */
export const OHAENG_GEUK: Record<string, string> = {
  '목': '토',
  '화': '금',
  '토': '수',
  '금': '목',
  '수': '화',
};

/**
 * 오행 상생: A가 B를 생하는 관계
 * 목->화, 화->토, 토->금, 금->수, 수->목
 */
export const OHAENG_SAENG: Record<string, string> = {
  '목': '화',
  '화': '토',
  '토': '금',
  '금': '수',
  '수': '목',
};

// ---------- 천간 -> 지지 매핑 (양신/기거지지) ----------

/**
 * 일간 -> 기거지지(寄居地支) 매핑
 * 甲→寅, 乙→卯, 丙→巳, 丁→午, 戊→巳, 己→午,
 * 庚→申, 辛→酉, 壬→亥, 癸→子
 */
export const GAN_TO_BRANCH: Record<string, string> = {
  '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
  '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子',
};

/** 천간의 오행 */
export const GAN_OHAENG: Record<string, string> = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
  '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
};

// ---------- 월장(月將) 테이블 ----------

/**
 * 절기별 월장 매핑
 * 절기 입기 시점부터 다음 절기 전까지 해당 월장을 사용
 *
 * 우수~춘분: 亥, 춘분~곡우: 戌, 곡우~소만: 酉, 소만~하지: 申,
 * 하지~대서: 未, 대서~처서: 午, 처서~추분: 巳, 추분~상강: 辰,
 * 상강~소설: 卯, 소설~동지: 寅, 동지~대한: 丑, 대한~우수: 子
 */
export const WOLJIANG_TABLE: Record<string, string> = {
  '우수': '亥',
  '춘분': '戌',
  '곡우': '酉',
  '소만': '申',
  '하지': '未',
  '대서': '午',
  '처서': '巳',
  '추분': '辰',
  '상강': '卯',
  '소설': '寅',
  '동지': '丑',
  '대한': '子',
};

/**
 * 월장을 결정하기 위한 절기 순서 (역순으로 검색)
 * 현재 날짜 이전의 가장 가까운 절기를 찾아 월장을 결정
 */
export const WOLJIANG_TERMS_ORDER = [
  '우수', '춘분', '곡우', '소만', '하지', '대서',
  '처서', '추분', '상강', '소설', '동지', '대한',
] as const;

// ---------- 12천장(天將) ----------

/**
 * 12천장 정보
 * 순행 순서: 귀인→등사→주작→육합→구진→청룡→천공→백호→태상→현무→태음→천후
 */
export const CHEONJANG_LIST = [
  { name: '귀인', hanja: '貴人', branch: '丑', fortune: '길' as const },
  { name: '등사', hanja: '螣蛇', branch: '巳', fortune: '흉' as const },
  { name: '주작', hanja: '朱雀', branch: '午', fortune: '흉' as const },
  { name: '육합', hanja: '六合', branch: '卯', fortune: '길' as const },
  { name: '구진', hanja: '勾陳', branch: '辰', fortune: '흉' as const },
  { name: '청룡', hanja: '靑龍', branch: '寅', fortune: '길' as const },
  { name: '천공', hanja: '天空', branch: '戌', fortune: '흉' as const },
  { name: '백호', hanja: '白虎', branch: '申', fortune: '흉' as const },
  { name: '태상', hanja: '太常', branch: '未', fortune: '길' as const },
  { name: '현무', hanja: '玄武', branch: '亥', fortune: '흉' as const },
  { name: '태음', hanja: '太陰', branch: '酉', fortune: '길' as const },
  { name: '천후', hanja: '天后', branch: '子', fortune: '길' as const },
] as const;

/**
 * 순행 순서 (주간): 귀인부터 시계 방향
 * 귀인→등사→주작→육합→구진→청룡→천공→백호→태상→현무→태음→천후
 */
export const CHEONJANG_FORWARD_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

/**
 * 역행 순서 (야간): 귀인부터 반시계 방향
 * 귀인→천후→태음→현무→태상→백호→천공→청룡→구진→육합→주작→등사
 */
export const CHEONJANG_REVERSE_ORDER = [0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const;

// ---------- 귀인(貴人) 테이블 ----------

/**
 * 일간별 천을귀인(天乙貴人) 위치
 * day: 주간(晝) 귀인 지지, night: 야간(夜) 귀인 지지
 */
export const GUIIN_TABLE: Record<string, { day: string; night: string }> = {
  '甲': { day: '丑', night: '未' },
  '戊': { day: '丑', night: '未' },
  '乙': { day: '子', night: '申' },
  '己': { day: '子', night: '申' },
  '丙': { day: '亥', night: '酉' },
  '丁': { day: '亥', night: '酉' },
  '庚': { day: '午', night: '寅' },
  '辛': { day: '午', night: '寅' },
  '壬': { day: '巳', night: '卯' },
  '癸': { day: '巳', night: '卯' },
};

// ---------- 주야(晝夜) 판별 ----------

/**
 * 주간 시지 범위: 卯(index 3)~申(index 8)
 * 즉 시지가 卯, 辰, 巳, 午, 未, 申 이면 주간
 */
export const DAY_BRANCHES = new Set(['卯', '辰', '巳', '午', '未', '申']);

// ---------- 공망(空亡) ----------

/**
 * 각 甲 旬의 공망 지지 쌍
 * 기문둔갑과 동일한 구조
 */
export const VOID_BRANCHES: Record<string, [string, string]> = {
  '甲子': ['戌', '亥'],
  '甲戌': ['申', '酉'],
  '甲申': ['午', '未'],
  '甲午': ['辰', '巳'],
  '甲辰': ['寅', '卯'],
  '甲寅': ['子', '丑'],
};

// ---------- 60갑자 인덱스 ----------

/**
 * 천간+지지 인덱스로 60甲子 인덱스 계산
 */
export function getSexagenaryIndex(stemIdx: number, branchIdx: number): number {
  for (let i = 0; i < 60; i++) {
    if (i % 10 === stemIdx && i % 12 === branchIdx) return i;
  }
  return 0;
}

/**
 * 60갑자 인덱스로 甲 旬 이름 반환
 */
export function getJiaGroupName(sexIdx: number): string {
  const jiaNames = ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'];
  return jiaNames[Math.floor(sexIdx / 10)];
}

// ---------- 육친(六親) 관계 ----------

/**
 * 일간 오행 기준 육친 판별
 * 비견: 같은 오행
 * 식상: 내가 생하는 오행
 * 재성: 내가 극하는 오행
 * 관귀: 나를 극하는 오행
 * 인수: 나를 생하는 오행
 */
export function getYukChin(dayGanOhaeng: string, targetOhaeng: string): string {
  if (dayGanOhaeng === targetOhaeng) return '비견';
  if (OHAENG_SAENG[dayGanOhaeng] === targetOhaeng) return '식상';
  if (OHAENG_GEUK[dayGanOhaeng] === targetOhaeng) return '재성';
  if (OHAENG_GEUK[targetOhaeng] === dayGanOhaeng) return '관귀';
  if (OHAENG_SAENG[targetOhaeng] === dayGanOhaeng) return '인수';
  return '비견'; // fallback
}

// ---------- 간체 중국어 -> 한국어 절기명 매핑 ----------

export const CHINESE_TO_KOREAN: Record<string, string> = {
  '冬至': '동지', '小寒': '소한', '大寒': '대한',
  '立春': '입춘', '雨水': '우수', '惊蛰': '경칩',
  '春分': '춘분', '清明': '청명', '谷雨': '곡우',
  '立夏': '입하', '小满': '소만', '芒种': '망종',
  '夏至': '하지', '小暑': '소서', '大暑': '대서',
  '立秋': '입추', '处暑': '처서', '白露': '백로',
  '秋分': '추분', '寒露': '한로', '霜降': '상강',
  '立冬': '입동', '小雪': '소설', '大雪': '대설',
};

/**
 * 월장 결정에 사용되는 절기 목록 (중기 위주)
 * 12개 절기만 사용 (절기가 아닌 중기)
 */
export const WOLJIANG_SOLAR_TERMS = new Set(Object.keys(WOLJIANG_TABLE));
