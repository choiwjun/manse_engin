// 역술 도메인 공통 타입

export type SchoolType = 'saju' | 'jamidusu' | 'gimun';
export type SajuSubSchool = 'gyeokguk' | 'johu' | 'gangyak' | 'mulsang';
export type Ohaeng = '목' | '화' | '토' | '금' | '수';
export type Gender = 'male' | 'female';
export type MidnightMode = 'yaja' | 'joja';
export type ReadingType =
  | 'saju'
  | 'tojeong'
  | 'ziwei'
  | 'qimen'
  | 'daeyukim'
  | 'naming'
  | 'calendar'
  | 'hongyeon'
  | 'maehwa'
  | 'harak'
  | 'guseong'
  | 'daejeong';

export const CORE_READING_TYPES = [
  'saju',
  'tojeong',
  'ziwei',
  'qimen',
  'daeyukim',
] as const satisfies readonly ReadingType[];

export type CoreReadingType = (typeof CORE_READING_TYPES)[number];

export interface Palja {
  yearGan: string;
  yearJi: string;
  monthGan: string;
  monthJi: string;
  dayGan: string;
  dayJi: string;
  hourGan: string;
  hourJi: string;
}

export interface Daeun {
  age: number;
  gan: string;
  ji: string;
  ohaeng: Ohaeng;
  isCurrent: boolean;
  startAgeMonths?: number;
}

export interface Sinsal {
  name: string;
  hanja: string;
  description: string;
  position: string;
}

export interface Gyeokguk {
  name: string;
  hanja: string;
  description: string;
}

export interface Yongsin {
  yongsin: string;
  gisin: string;
  ohaeng: Ohaeng;
  reasoning: string;
}

export interface Wolun {
  gan: string;
  ji: string;
}

export interface JijiRelation {
  type: string;
  positions: string[];
  jijis: string[];
  description: string;
  /** 충돌 주석: 같은 지지 쌍에 합과 충이 동시 존재 시 해석 가이드 */
  conflictNote?: string;
}

export interface NaeumOhaeng {
  name: string;
  hanja: string;
  ohaeng: string;
}

export interface NaeumOhaengSet {
  year: NaeumOhaeng;
  month: NaeumOhaeng;
  day: NaeumOhaeng;
  hour: NaeumOhaeng | null;
}

export interface WonjinPair {
  position1: string;
  branch1: string;
  position2: string;
  branch2: string;
  interpretation: string;
}

export interface WonjinResult {
  hasWonjin: boolean;
  pairs: WonjinPair[];
}

/** 지지 위치별 지장간 십신 (본기/중기/여기 각각의 십신) */
export interface JijangganSipsin {
  bongi: string;    // 본기 십신 (주 십신)
  junggi?: string;  // 중기 십신
  yeogi?: string;   // 여기 십신
}

export interface SajuResult {
  palja: Palja;
  sipsin: Record<string, string>;
  /** 지지 위치별 지장간 십신 상세 (본기/중기/여기) */
  jijangganSipsin?: Record<string, JijangganSipsin>;
  unsung: Record<string, string>;
  jijanggan: Record<string, string[]>;
  daeun: Daeun[];
  seun: { gan: string; ji: string };
  wolun?: Wolun;
  sinsal: Sinsal[];
  jijiRelations?: JijiRelation[];
  gongmang?: string[];
  naeum?: NaeumOhaengSet;
  wonjin?: WonjinResult;
  gyeokguk: Gyeokguk;
  yongsin: Yongsin;
}

export interface BirthInputData {
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
  gender: Gender;
  isLunar: boolean;
  /** 음력 윤달 여부 */
  isLeapMonth?: boolean;
  birthPlace: string | null;
}

// --- 토정비결 (土亭秘訣) 타입 ---

export interface TojeongGwae {
  /** 상괘 - 태세수/납음오행 수 (1~5) */
  sangGwae: number;
  /** 중괘 - 음력 월 기반 (1~8) */
  jungGwae: number;
  /** 하괘 - 음력 일 기반 (1~8) */
  haGwae: number;
  /** 괘 조합 코드 (예: "1-3-5") */
  gwaeCode: string;
  /** 144괘 중 번호 (1~144) */
  gwaeNumber: number;
}

export interface TojeongInterpretation {
  /** 괘 제목 */
  title: string;
  /** 한시/시구 */
  poem: string;
  /** 해설 */
  description: string;
  /** 총운 */
  overall: string;
  /** 월별 운세 (12개월) */
  monthly: string[];
}

export interface TojeongResult {
  /** 음력 생년 */
  birthYear: number;
  /** 대상 연도 */
  targetYear: number;
  /** 괘 정보 */
  gwae: TojeongGwae;
  /** 해석 */
  interpretation: TojeongInterpretation;
}

// --- 작명 분석 (作名分析) 타입 ---
// @TASK P4-R1-T1 - 작명 분석 엔진 타입 정의
// @SPEC docs/planning/02-trd.md#작명-분석-엔진

export interface Suri81Entry {
  /** 수리 번호 (1~81) */
  number: number;
  /** 길흉 판단 */
  gilhyung: '길' | '흉';
  /** 해설 문자열 (한국어) */
  description: string;
}

export interface OhaengPair {
  /** 첫 번째 글자 */
  first: string;
  /** 두 번째 글자 */
  second: string;
  /** 오행 관계 */
  relation: '상생' | '상극' | '비화';
}

export interface NamingAnalysis {
  /** 이름 (성 제외) */
  name: string;
  /** 각 글자의 획수 (성 포함) */
  strokes: number[];
  /** 원형이정 사격 */
  wonhyeong: {
    /** 원격(元格): 초년운 */
    won: number;
    /** 형격(亨格): 청년운 */
    hyeong: number;
    /** 이격(利格): 중년운 */
    yi: number;
    /** 정격(貞格): 말년운/총운 */
    jeong: number;
  };
  /** 81수리 길흉 (각 격별) */
  suri81: {
    won: Suri81Entry;
    hyeong: Suri81Entry;
    yi: Suri81Entry;
    jeong: Suri81Entry;
  };
  /** 각 글자의 수리오행 (성 포함) */
  suriOhaeng: Ohaeng[];
  /** 각 글자의 발음오행 (성 포함) */
  balumOhaeng: Ohaeng[];
  /** 인접 글자 간 오행 관계 */
  ohaengRelation: {
    pairs: OhaengPair[];
    /** 오행 조화 점수 (0~100) */
    score: number;
  };
  /** 종합 점수 (0~100) */
  totalScore: number;
}

export interface NamingResult {
  /** 성씨 */
  surname: string;
  /** 후보 분석 결과 (최대 6개) */
  candidates: NamingAnalysis[];
}

// --- 확장 작명 분석 (성명학 자원오행) 타입 ---
// @TASK EXT-NAMING - 성명학 확장 타입 정의
// @SPEC 성명학: 한자 획수 DB, 자원오행, 학파 분기

/** 학파 선택 */
export type StrokeSchool = 'kangxi' | 'modern';

/** 자원오행 쌍 관계 */
export interface JawonOhaengPair {
  first: string;
  second: string;
  firstOhaeng: Ohaeng | null;
  secondOhaeng: Ohaeng | null;
  relation: '상생' | '상극' | '비화' | '판별불가';
}

/** 자원오행 분석 결과 */
export interface JawonOhaengResult {
  /** 각 글자의 자원오행 (null = DB에 없음) */
  ohaengs: (Ohaeng | null)[];
  /** 인접 쌍 관계 */
  pairs: JawonOhaengPair[];
  /** 조화 판정 문자열 */
  harmony: string;
  /** 조화 점수 (0~100) */
  score: number;
}

/** 3중 오행 비교 (자원 + 수리 + 발음) */
export interface TripleOhaengComparison {
  /** 글자 인덱스 */
  charIndex: number;
  /** 해당 글자 */
  char: string;
  /** 자원오행 */
  jawon: Ohaeng | null;
  /** 수리오행 */
  suri: Ohaeng;
  /** 발음오행 */
  balum: Ohaeng;
}

/** 확장 이름 분석 (기존 + 자원오행) */
export interface NamingAnalysisExtended extends NamingAnalysis {
  /** 한자 입력 (성 포함) */
  hanjaChars: string[] | null;
  /** 자원오행 분석 (한자 입력 시) */
  jawonOhaeng: JawonOhaengResult | null;
  /** 3중 오행 비교표 (한자 입력 시) */
  tripleOhaeng: TripleOhaengComparison[] | null;
  /** 학파 */
  school: StrokeSchool;
  /** 한자 획수 (학파 기반, 성 포함) */
  hanjaStrokes: (number | null)[] | null;
}

/** 확장 작명 결과 */
export interface NamingResultExtended {
  /** 성씨 */
  surname: string;
  /** 학파 */
  school: StrokeSchool;
  /** 후보 분석 결과 */
  candidates: NamingAnalysisExtended[];
}

// --- 역학달력/일진 (曆學曆/日辰) 타입 ---
// @TASK P4-R3-T1 - 역학달력/일진 엔진 타입 정의
// @SPEC docs/planning/02-trd.md#역학달력-일진

export interface CalendarDay {
  /** 양력 날짜 YYYY-MM-DD */
  solarDate: string;
  /** 음력 날짜 YYYY-MM-DD */
  lunarDate: string;
  /** 음력 월 */
  lunarMonth: number;
  /** 음력 일 */
  lunarDay: number;
  /** 윤달 여부 */
  isLeapMonth: boolean;
  /** 일간 (천간) 한글 */
  dayGan: string;
  /** 일지 (지지) 한글 */
  dayJi: string;
  /** 간지 결합 한글 (예: "갑자") */
  dayGanJi: string;
  /** 일간의 오행 */
  ohaeng: Ohaeng;
  /** 12신살 이름 */
  sinsal12: string;
  /** 길흉 판단 */
  gilhyung: '길' | '흉' | '평';
  /** 택일 정보 (좋은 일/나쁜 일) */
  taekil: string;
  /** 절기 (해당일에 절기가 있으면) */
  jieqi?: string;
}

export interface MonthlyCalendar {
  /** 양력 연도 */
  year: number;
  /** 양력 월 */
  month: number;
  /** 해당 월의 모든 일별 정보 */
  days: CalendarDay[];
  /** 월간지 한글 (예: "을축") */
  monthGanJi: string;
}

// --- 팔괘(八卦) 공용 타입 ---

export interface Trigram {
  /** 팔괘 번호 (1~8) */
  number: number;
  /** 한글 이름: 건/태/리/진/손/감/간/곤 */
  name: string;
  /** 오행 */
  ohaeng: Ohaeng;
}

// --- 하락리수 (河洛理數) 타입 ---

export interface HarakResult {
  /** 하도수 */
  hadosu: number;
  /** 하도 오행 */
  hadoOhaeng: Ohaeng;
  /** 하도 방위 */
  hadoDirection: string;
  /** 낙서수 */
  nakseosu: number;
  /** 낙서 위치 */
  nakseoPosition: string;
  /** 상괘 (하도수 기반) */
  upperTrigram: Trigram;
  /** 하괘 (낙서수 기반) */
  lowerTrigram: Trigram;
  /** 64괘 번호 */
  hexagramNumber: number;
  /** 64괘 이름 */
  hexagramName: string;
  /** 해석 */
  interpretation: string;
}

// --- 대정수작괘 (大定數作卦) 타입 ---
// @TASK P7-R5-T1 - 대정수작괘 엔진 타입 정의
// @SPEC docs/planning/02-trd.md#대정수작괘-엔진

export interface TrigramInfo {
  /** 선천 팔괘수 (1~8) */
  number: number;
  /** 괘 이름 (한글) */
  name: string;
  /** 괘 이름 (한자) */
  hanja: string;
  /** 괘의 오행 */
  ohaeng: Ohaeng;
}

export interface DaejeongResult {
  /** 각 천간의 선천수 상세 */
  seoncheonsuDetail: { label: string; value: number }[];
  /** 각 지지의 후천수 상세 */
  hucheonsuDetail: { label: string; value: number }[];
  /** 선천수 합계 */
  seoncheonsuTotal: number;
  /** 후천수 합계 */
  hucheonsuTotal: number;
  /** 상괘 (선천수합 % 8) */
  upperTrigram: TrigramInfo;
  /** 하괘 (후천수합 % 8) */
  lowerTrigram: TrigramInfo;
  /** 64괘 번호 (1~64) */
  hexagramNumber: number;
  /** 64괘 이름 */
  hexagramName: string;
  /** 변효 (1~6) */
  changingLine: number;
  /** 해석 */
  interpretation: string;
}

// --- 구성기학/구성포국 (九星氣學/九星布局) 타입 ---
// @TASK P7-R4-T1 - 구성포국 엔진 타입 정의
// @SPEC docs/planning/02-trd.md#구성포국-엔진

export interface GuseongStar {
  /** 구성 번호 (1~9) */
  number: number;
  /** 한글 이름 (예: 일백수성) */
  name: string;
  /** 한자 이름 (예: 一白水星) */
  hanja: string;
  /** 오행 */
  ohaeng: Ohaeng;
  /** 색상 (白/黑/碧/綠/黃/赤/紫) */
  color: string;
}

export interface GugungGrid {
  /** 9궁 위치별 구성 배치 (index: 0=SE, 1=S, 2=SW, 3=E, 4=C, 5=W, 6=NE, 7=N, 8=NW) */
  positions: GuseongStar[];
  /** 중궁에 놓인 구성 */
  centerStar: GuseongStar;
}

// --- 자미두수 (紫微斗數) 타입 ---
// @TASK P8-R1-T1 - 자미두수 엔진 타입 정의
// @SPEC docs/planning/02-trd.md#자미두수-엔진

export interface ZiweiStar {
  /** 성요 이름 (한글/중문) */
  name: string;
  /** 성요 유형 */
  type: 'major' | 'minor' | 'adjective';
  /** 밝기 (묘/왕/득/리/평/한/불) */
  brightness?: string;
  /** 사화 (록/권/과/기) */
  mutagen?: string;
}

export interface ZiweiPalace {
  /** 궁 인덱스 (0~11) */
  index: number;
  /** 궁 이름 (명궁/형제/부처/자녀/재백/질액/천이/노복/관록/전택/복덕/부모) */
  name: string;
  /** 궁 천간 */
  heavenlyStem: string;
  /** 궁 지지 */
  earthlyBranch: string;
  /** 신궁 여부 */
  isBodyPalace: boolean;
  /** 주성 */
  majorStars: ZiweiStar[];
  /** 보성 */
  minorStars: ZiweiStar[];
  /** 잡요성 */
  adjectiveStars: ZiweiStar[];
  /** 대한 (시작나이~끝나이) */
  decadal: { range: [number, number]; heavenlyStem: string; earthlyBranch: string };
  /** 소한 해당 나이 */
  ages: number[];
}

export interface ZiweiResult {
  /** 양력 생년월일 */
  solarDate: string;
  /** 음력 생년월일 */
  lunarDate: string;
  /** 간지 생년월일 */
  chineseDate: string;
  /** 성별 */
  gender: string;
  /** 시간 */
  time: string;
  /** 띠 */
  zodiac: string;
  /** 별자리 */
  sign: string;
  /** 오행국 (금사국/수이국/화육국/토오국/목삼국) */
  fiveElementsClass: string;
  /** 명궁 지지 */
  soulPalaceBranch: string;
  /** 신궁 지지 */
  bodyPalaceBranch: string;
  /** 명주 */
  soulStar: string;
  /** 신주 */
  bodyStar: string;
  /** 12궁 배치 */
  palaces: ZiweiPalace[];
}

export type ZiweiSchool = 'samhap' | 'sahwa' | 'jungju';

// --- 자미두수 해석 타입 ---
// @TASK P8-R1-T2, P8-R2-T1, P8-R3-T1, P8-R4-T1

/** 사화 유형 */
export type MutagenType = '록' | '권' | '과' | '기';

/** 궁별 해석 결과 */
export interface PalaceInterpretation {
  /** 궁 인덱스 (0~11) */
  palaceIndex: number;
  /** 궁 이름 */
  palaceName: string;
  /** 주성 이름 목록 */
  majorStarNames: string[];
  /** 전체 길흉 판별 ('길' | '흉' | '평') */
  fortune: '길' | '흉' | '평';
  /** 밝기 가중치 합산 (-12 ~ +12 범위) */
  brightnessScore: number;
  /** 사화 정보 */
  mutagens: { starName: string; mutagenType: MutagenType }[];
  /** 해석 요약 */
  summary: string;
}

/** 사화 위치 매핑 */
export interface MutagenLocation {
  /** 사화 유형 */
  type: MutagenType;
  /** 해당 성요 이름 */
  starName: string;
  /** 궁 인덱스 */
  palaceIndex: number;
  /** 궁 이름 */
  palaceName: string;
}

/** 사화 분석 결과 */
export interface MutagenAnalysis {
  /** 4개 사화 위치 매핑 */
  locations: MutagenLocation[];
  /** 화록 위치 */
  rok: MutagenLocation | null;
  /** 화권 위치 */
  gwon: MutagenLocation | null;
  /** 화과 위치 */
  gwa: MutagenLocation | null;
  /** 화기 위치 */
  gi: MutagenLocation | null;
  /** 분석 요약 */
  summary: string;
}

/** 전체 명반 해석 */
export interface ZiweiInterpretation {
  /** 각 궁별 해석 (12개) */
  palaceInterpretations: PalaceInterpretation[];
  /** 사화 분석 */
  mutagenAnalysis: MutagenAnalysis;
  /** 명궁 해석 */
  soulPalace: PalaceInterpretation;
  /** 신궁 해석 */
  bodyPalace: PalaceInterpretation;
  /** 종합 요약 */
  overallSummary: string;
}

/** 삼합 관계 (3궁 세트) */
export interface TriangleGroup {
  /** 삼합 이름 (예: 명궁 삼합) */
  name: string;
  /** 3개 궁 인덱스 */
  indices: [number, number, number];
  /** 3개 궁 이름 */
  palaceNames: [string, string, string];
}

/** 자미두수 격국 (특수 배치 패턴) — 사주 Gyeokguk 확장 */
export interface ZiweiGyeokguk extends Gyeokguk {
  /** 길흉 */
  fortune: '길' | '흉';
  /** 관련 성요 */
  relatedStars: string[];
}

/** 삼합파 분석 결과 */
export interface SamhapAnalysis {
  /** 명궁 삼합 (명-재백-관록) 분석 */
  soulTriangle: {
    group: TriangleGroup;
    majorStars: string[];
    brightnessTotal: number;
    fortune: '길' | '흉' | '평';
  };
  /** 전체 4개 삼합 그룹 */
  triangleGroups: TriangleGroup[];
  /** 발견된 격국 목록 */
  gyeokguks: ZiweiGyeokguk[];
  /** 분석 요약 */
  summary: string;
}

/** 비성 사화 추적 항목 */
export interface FlyingMutagen {
  /** 원래 궁 인덱스 */
  fromPalaceIndex: number;
  /** 원래 궁 이름 */
  fromPalaceName: string;
  /** 비성 도착 궁 인덱스 */
  toPalaceIndex: number;
  /** 비성 도착 궁 이름 */
  toPalaceName: string;
  /** 사화 유형 */
  mutagenType: MutagenType;
  /** 관련 성요 */
  starName: string;
}

/** 사화파 분석 결과 */
export interface SahwaAnalysis {
  /** 생년사화 위치 분석 */
  birthMutagens: MutagenAnalysis;
  /** 비성 사화 추적 목록 */
  flyingMutagens: FlyingMutagen[];
  /** 사화 집중 궁 (2개 이상 사화가 모인 궁) */
  concentratedPalaces: { palaceIndex: number; palaceName: string; mutagenCount: number }[];
  /** 화기 충돌 분석 */
  giConflicts: { description: string; severity: '경' | '중' | '위험' }[];
  /** 분석 요약 */
  summary: string;
}

/** 중주파 분석 결과 */
export interface JungjuAnalysis {
  /** 성요 조합 해석 */
  starCombinations: {
    stars: string[];
    palaceName: string;
    interpretation: string;
    fortune: '길' | '흉' | '평';
  }[];
  /** 명궁-신궁 관계 */
  soulBodyRelation: {
    soulPalaceName: string;
    bodyPalaceName: string;
    relation: string;
    interpretation: string;
  };
  /** 대한 흐름 분석 */
  decadalFlow: {
    range: [number, number];
    palaceName: string;
    fortune: '길' | '흉' | '평';
    interpretation: string;
  }[];
  /** 왕정농 특수 해석 */
  wangSpecials: {
    name: string;
    description: string;
    applicable: boolean;
  }[];
  /** 분석 요약 */
  summary: string;
}

export interface GuseongResult {
  /** 생년 */
  birthYear: number;
  /** 성별 */
  gender: 'male' | 'female';
  /** 본명성(本命星) */
  bonmyeongseong: GuseongStar;
  /** 연반(年盤) - 연도별 구궁 배치 */
  yearChart: GugungGrid;
  /** 월반(月盤) - 월별 구궁 배치 */
  monthChart: GugungGrid;
  /** 일반(日盤) - 일별 구궁 배치 */
  dailyChart: GugungGrid;
  /** 해석 */
  interpretation: string;
}

// --- 기문둔갑 (奇門遁甲) 타입 ---
// @TASK P9-R1-T1 - 기문둔갑 엔진 타입 정의
// @SPEC docs/planning/06-tasks.md#P9-R1-T1

export type QimenSchool = 'siguk' | 'yeonguk' | 'wolguk' | 'hongyeon';

/** 둔갑 방식 */
export type DunType = '양둔' | '음둔';

/** 기문둔갑 궁(宮) */
export interface QimenPalace {
  /** 궁 번호 (1-9, 낙서 배열) */
  index: number;
  /** 궁 이름 (감궁/곤궁/진궁/손궁/중궁/건궁/태궁/간궁/이궁) */
  name: string;
  /** 지반간(地盤干) */
  earthStem: string;
  /** 천반간(天盤干) */
  heavenStem: string;
  /** 문(門) 이름 */
  gate: string;
  /** 문(門) 한자 */
  gateHanja: string;
  /** 성(星) 이름 */
  star: string;
  /** 성(星) 한자 */
  starHanja: string;
  /** 신(神) 이름 */
  deity: string;
  /** 신(神) 한자 */
  deityHanja: string;
  /** 공망 여부 */
  isVoid: boolean;
}

/** 기문둔갑 격국 */
export interface QimenGyeokguk {
  /** 격국 이름 */
  name: string;
  /** 한자 */
  hanja: string;
  /** 설명 */
  description: string;
  /** 길흉 */
  fortune: '길' | '흉';
}

/** 기문둔갑 포국 결과 */
export interface QimenResult {
  /** 양둔/음둔 */
  dunType: DunType;
  /** 국수 (1-9) */
  bureauNumber: number;
  /** 절기 이름 */
  solarTerm: string;
  /** 절기의 상/중/하원 */
  yuan: '상원' | '중원' | '하원';
  /** 양력 날짜 */
  solarDate: string;
  /** 일간 */
  dayGan: string;
  /** 일지 */
  dayJi: string;
  /** 시간 천간 */
  hourGan: string;
  /** 시지 */
  hourJi: string;
  /** 갑이 숨는 곳 (둔갑 의(儀)) */
  hiddenJia: string;
  /** 9궁 배치 */
  palaces: QimenPalace[];
  /** 격국 */
  gyeokguk: QimenGyeokguk | null;
  /** 공망 지지 쌍 */
  voidBranches: [string, string];
  /** 직부성(值符星) 이름 */
  zhifu: string;
  /** 직사문(值使門) 이름 */
  zhishi: string;
}

/** 기문둔갑 궁별 해석 */
export interface QimenPalaceInterpretation {
  /** 궁 번호 */
  palaceIndex: number;
  /** 궁 이름 */
  palaceName: string;
  /** 천지반 관계 해석 */
  stemRelation: string;
  /** 문성 관계 해석 */
  gateStarRelation: string;
  /** 길흉 */
  fortune: '길' | '흉' | '평';
  /** 종합 해석 */
  summary: string;
}

/** 기문둔갑 용신 */
export interface QimenYongsin {
  /** 용신 유형 */
  type: '시간' | '방향' | '행동';
  /** 추천 궁 번호 */
  palaceIndex: number;
  /** 추천 궁 이름 */
  palaceName: string;
  /** 추천 이유 */
  reason: string;
}

/** 기문둔갑 해석 결과 */
export interface QimenInterpretation {
  /** 궁별 해석 (9개) */
  palaceInterpretations: QimenPalaceInterpretation[];
  /** 용신 추천 */
  yongsin: QimenYongsin[];
  /** 격국 해석 */
  gyeokgukInterpretation: string;
  /** 종합 요약 */
  summary: string;
}

// --- 대육임 (大六壬) 타입 ---
// @TASK P10-R1-T1 - 대육임 엔진 타입 정의
// @SPEC docs/planning/06-tasks.md#P10-R1-T1

/** 12천장(天將) */
export interface CheonJang {
  /** 이름 (한글) */
  name: string;
  /** 한자 */
  hanja: string;
  /** 지지 */
  branch: string;
  /** 길흉 */
  fortune: '길' | '흉' | '평';
}

/** 천지반(天地盤) 한 위치 */
export interface CheonJiBanPosition {
  /** 지반 지지 (고정) */
  earthBranch: string;
  /** 천반 지지 (회전) */
  heavenBranch: string;
  /** 해당 위치의 천장 */
  cheonJang: CheonJang | null;
}

/** 사과(四課) 한 항목 */
export interface SaGwaItem {
  /** 과 번호 (1-4) */
  index: number;
  /** 상신(上神) - 천반 */
  upper: string;
  /** 하신(下神) - 지반 */
  lower: string;
  /** 상신-하신 관계 */
  relation: string;
}

/** 삼전(三傳) 한 항목 */
export interface SamJeonItem {
  /** 전 이름 (초전/중전/말전) */
  name: '초전' | '중전' | '말전';
  /** 천반 지지 */
  branch: string;
  /** 배속 천장 */
  cheonJang: CheonJang | null;
  /** 육친 관계 */
  yukChin: string;
}

/** 대육임 과식 결과 */
export interface DaeyukimResult {
  /** 양력 날짜 */
  solarDate: string;
  /** 일간 */
  dayGan: string;
  /** 일지 */
  dayJi: string;
  /** 시간 지지 */
  hourJi: string;
  /** 월장(月將) */
  wolJang: string;
  /** 천지반 12궁 배치 */
  cheonJiBan: CheonJiBanPosition[];
  /** 사과 (4개) */
  saGwa: SaGwaItem[];
  /** 삼전 (3개) */
  samJeon: SamJeonItem[];
  /** 12천장 배치 */
  cheonJangList: CheonJang[];
  /** 과명(課名) - 9과 분류 */
  gwaMyeong: string;
  /** 공망 지지 쌍 */
  voidBranches: [string, string];
}

/** 대육임 궁별 해석 */
export interface DaeyukimInterpretation {
  /** 사과 해석 */
  saGwaInterpretation: {
    index: number;
    relation: string;
    fortune: '길' | '흉' | '평';
    summary: string;
  }[];
  /** 삼전 흐름 해석 */
  samJeonInterpretation: {
    name: string;
    fortune: '길' | '흉' | '평';
    summary: string;
  }[];
  /** 과명 해석 */
  gwaMyeongInterpretation: string;
  /** 종합 요약 */
  summary: string;
}
