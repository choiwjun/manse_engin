// src/engine 공개 표면 — packages/myeong-engine/src/index.ts와 동일한 모듈 집합을 유지한다.
// 패키지는 build.mjs가 이 디렉터리를 복사한 뒤 패키지 전용 index로 번들링한다.

export * from './contracts';
export * from './types';

// ---------- core 만세력 ----------
export { ManseryeokEngine } from './core/manseryeok-engine';
export {
  createNormalizedManseryeokContext,
  SUPPORTED_MANSERYEOK_RANGE,
  NORMALIZED_TERM_LOOKUP_BASIS,
} from './core/normalized-context';
export {
  getGanji,
  isYangGan,
  isForwardDirection,
} from './core/ganji';
export { solarToLunar, lunarToSolar, getLunarMonthDays } from './core/lunar-solar';
export {
  getSolarTermOnOrBefore,
  getSolarTermOnOrBeforeDateTime,
  getJeolOnOrBeforeDateTime,
  getSolarTermsOnDate,
  listSolarTermsForYear,
  isJeolSolarTerm,
  normalizeSolarTermName,
  JEOL_SOLAR_TERM_NAMES,
} from './core/solar-terms';
export {
  shiftDateTimeUtc,
  toKstTimestamp,
  toOffsetTimestamp,
  toJulianDay,
  compareDateTime,
  diffMinutes,
  dayOfYearUtc,
  formatDateKey,
} from './core/temporal';
export * from './core/errors';
export { resolveKoreanLegalTime } from './core/korean-legal-time';

// ---------- adapter ----------
export { resolveSchool } from './adapter/school-resolver';
export { correctToTrueSolarTime } from './adapter/time-corrector';

// ---------- 사주 ----------
export { calculatePalja } from './saju/calculator';
export { buildSajuResult } from './saju/result-builder';
export {
  calculateYunStartAge,
  calculateDaeun,
  calculateSeun,
  calculateWolun,
} from './saju/daeun';
export { determineGyeokguk } from './saju/gyeokguk';
export { determineYongsin } from './saju/yongsin';
export {
  calculateSipsin,
  calculateJijangganSipsin,
  calculateUnsung,
  extractJijanggan,
  determineSipsin,
  JIJANGGAN_TABLE,
} from './saju/sipsin';
export {
  calculateSinsal,
  analyzeJijiRelations,
  calculateGongmang,
  getNaeumOhaeng,
} from './saju/sinsal';
export {
  analyzeWonjin,
  WONJIN_TABLE,
  WONJIN_TABLE_KR,
} from './saju/wonjin';

// ---------- 궁합 ----------
export { calculateCompatibility } from './compatibility';

// ---------- 파생 모듈 진입점 ----------
export { analyzeTojeong } from './tojeong';
export { calculateZiwei, calculateZiweiByLunar } from './ziwei';
export { calculateQimen } from './qimen';
export { calculateDaeyukim } from './daeyukim';
export { calculateGuseong } from './guseong';
export { analyzeHongyeon } from './hongyeon';
export { divineByTime, divineByNumber, divineByName } from './maehwa';
export { calculateHarak, calculateHexagramNumber } from './harak';
export { calculateDaejeong } from './daejeong';
export {
  analyzeName,
  analyzeNames,
  analyzeNameExtended,
  analyzeNamesExtended,
} from './naming';
export {
  getCalendarDay,
  getMonthlyCalendar,
  getDayGanJi,
  getMonthJi,
  getSinsal12,
  getGilhyung,
  getTaekilInfo,
} from './calendar';

// ---------- 해석 함수 ----------
export { interpretResult as interpretQimenResult } from './qimen/interpret';
export { interpretResult as interpretDaeyukimResult } from './daeyukim/interpret';

// ---------- 해석 계층 (detector·조립기·동적 문장·축별 리포트·시점 서사) ----------
export {
  interpretSaju,
  runDetectors,
  runAllDetectors,
  DETECTORS,
  PATTERN_REGISTRY,
  isRegisteredPattern,
  measureOhaeng,
  renderPattern,
  strengthLabel,
  judgeOhaeng,
  buildTimingNarrative,
  assembleReport,
  renderReportMarkdown,
  renderReportHtml,
  renderCompatibilityMarkdown,
  renderNamingMarkdown,
  renderTaekilMarkdown,
  interpretCompatibility,
  interpretName,
  interpretNaming,
  interpretNameWithSaju,
  interpretNamingWithSaju,
  interpretTaekil,
  getContentEntry,
  contentEntryCount,
  conclusionFor,
} from './interpretation';
export type {
  DetectedPattern,
  PatternCategory,
  PatternFigures,
  PatternMeta,
  PatternPolarity,
  PatternSlot,
  RawPattern,
  SajuInterpretation,
  SipsinGroup,
  OhaengMeter,
  OhaengMeterSlot,
  ReportAxis,
  ReportSection,
  SajuReport,
  AssembleReportOptions,
  TimingNarrative,
  TimingVerdict,
  TimingVerdictInfo,
  RenderReportOptions,
  RenderReportHtmlOptions,
  CounselorBrand,
  CompatibilityInterpretation,
  CompatibilityLine,
  InterpretCompatibilityOptions,
  NamingInterpretation,
  NamingLine,
  InterpretNamingOptions,
  TaekilInterpretation,
  TaekilLine,
  ContentEntry,
  ContentBody,
  ContentDb,
} from './interpretation';
