// 역술 도메인 공통 타입

export type SajuSubSchool = 'gyeokguk' | 'johu' | 'gangyak' | 'mulsang';
export type Ohaeng = '목' | '화' | '토' | '금' | '수';
export type Gender = 'male' | 'female';
export type MidnightMode = 'yaja' | 'joja';

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
  /** 대운 지지의 오행 — 천간과 다른 축일 수 있어 이중 판정에 사용. */
  jiOhaeng?: Ohaeng;
  /** 출생 순간(KST)에 시작 개월 수를 더한 실제 구간 [시작, 다음 시작). */
  isCurrent: boolean;
  /** 소수 개월 포함. 정수 개월은 달력 가산, 나머지는 1개월=30일로 환산. */
  startAgeMonths?: number;
  /** 이 대운 구간의 실제 시작 시각 (epoch ms). 대운 전환 서사의 기준. */
  startsAt?: number;
  /** 이 대운 구간의 실제 종료 시각 (epoch ms) — 다음 대운의 startsAt과 같다. */
  endsAt?: number;
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
  /** 판정 신뢰도 — 화격·종격처럼 조건이 부분 충족일 때 '유력'/'참고'로 낮춘다 */
  confidence?: '확정' | '유력' | '참고';
  /** 성립 근거 — 어떤 글자·관계로 판정했는지 */
  basis?: string[];
  /** 불성립·약화 조건 — 있으면 확정 대신 후보로 읽어야 한다 */
  blockers?: string[];
  /**
   * 차순위 격국 후보 — 특수격이 성립해도 정격 등 대안 해석을 함께 노출한다.
   * 역술인이 applyPractitionerOverride로 최종 격국을 이 목록에서 선택할 수 있다.
   */
  candidates?: Gyeokguk[];
}

/**
 * 역술인 최종 판정 — 엔진 출력을 사람이 검토·수정한 값.
 * applyPractitionerOverride로 적용하면 용신·격국·운 판정·리포트 전체에 일관 반영된다.
 */
export interface PractitionerOverride {
  /** 채택한 용신 학파 — yongsinBySchool에서 해당 학파의 용신·기신을 최종 용신으로 사용 */
  yongsinSchool?: SajuSubSchool;
  /** 용신 오행 직접 지정 — yongsinSchool보다 우선한다 */
  yongsinOhaeng?: Ohaeng;
  /** 기신 오행 직접 지정 (선택 — 미지정 시 기존 기신을 유지한다) */
  gisinOhaeng?: Ohaeng;
  /** 격국 수정 — gyeokguk.candidates의 이름 또는 직접 입력 */
  gyeokgukName?: string;
  /** 역술인 판정 메모 — 리포트에 '역술인 선택' 근거로 표기된다 */
  note?: string;
}

export interface Yongsin {
  yongsin: string;
  gisin: string;
  ohaeng: Ohaeng;
  reasoning: string;
}

/** 왕상휴수사(旺相休囚死) — 월령 대비 일간 오행의 5단계 상태 */
export type WangState = '旺' | '相' | '休' | '囚' | '死';

/** 점수제 강약 3분류 */
export type StrengthLevel = 'strong' | 'neutral' | 'weak';
/** 점수제 강약 6단계 라벨 */
export type StrengthLabel = '태강' | '신강' | '중화신강' | '중화신약' | '신약' | '태약';

/**
 * 점수제 강약 판정 결과 — 득령(旺相休囚死)·득지(통근)·득세(투출) 가중 모델.
 * 오행 점유율 계량(interpretation/meter)과는 별개 알고리즘이며 둘을 병기한다.
 */
export interface StrengthAssessment {
  level: StrengthLevel;
  label: StrengthLabel;
  score: number;
  /** 일간을 설기·극·극당하는 방향의 세력 합 — 클수록 일간이 소모됨 */
  hostilePressure: number;
  wangState: WangState;
  deukryeong: boolean;
  deukji: boolean;
  deuksi: boolean;
  deukse: boolean;
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
  /**
   * 해석 기준 시각(ISO 8601) — daeun.isCurrent·seun·wolun이 이 시각으로 계산됐다.
   * 리포트 생성 시 now를 생략하면 이 값이 기준점이 되어 재현성이 보장된다.
   */
  asOf?: string;
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
  /**
   * 학파별 용신 판정 — 격국/조후/강약/물상 4학파 결과를 나란히 노출한다.
   * 기본값 하나만 보여주면 학파 차이가 숨겨지므로, 리포트는 이 스프레드를 함께 표기한다.
   */
  yongsinBySchool?: Partial<Record<SajuSubSchool, Yongsin>>;
  /** 점수제 강약 판정 — 점유율 계량 결과와 별개 모델. 병기해서 두 모델의 차이를 드러낸다. */
  strengthAssessment?: StrengthAssessment;
  /** 역술인 최종 판정 — applyPractitionerOverride 적용 시 기록된다 */
  practitionerOverride?: PractitionerOverride;
}

export interface BirthInputData {
  year: number;
  month: number;
  day: number;
  /** 한국 법정 시계 시각. hour/minute 중 하나라도 null이면 시각 미상. */
  hour: number | null;
  minute: number | null;
  gender: Gender;
  isLunar: boolean;
  /** 음력 윤달 여부 */
  isLeapMonth?: boolean;
  birthPlace: string | null;
}

// --- 만세력 달력(일진) 타입 ---

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
  /** 십이직(十二直) 이름 — 건일·제일·만일·평일·정일·집일·파일·위일·성일·수일·개일·폐일 */
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
