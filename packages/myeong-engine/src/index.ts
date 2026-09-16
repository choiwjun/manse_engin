// myeong-engine public API — src/engine의 공개 표면을 재노출한다.
// 이 파일만 커밋되며, ./engine 소스는 build.mjs가 루트 src/engine에서 복사·생성한다.

export * from './engine/contracts';
export * from './engine/types';

// ---------- core 만세력 ----------
export { ManseryeokEngine } from './engine/core/manseryeok-engine';
export {
  createNormalizedManseryeokContext,
  SUPPORTED_MANSERYEOK_RANGE,
  NORMALIZED_TERM_LOOKUP_BASIS,
} from './engine/core/normalized-context';
export type {
  NormalizedManseryeokContext,
  NormalizedSolarCivilDateTime,
  NormalizedContextDateTime,
  NormalizedDayHourContextDateTime,
  NormalizedSchoolResolution,
  NormalizedTrueSolarContext,
  NormalizedOriginalInput,
  NormalizedTermLookupBasis,
  SupportedManseryeokRange,
  NormalizeBirthContextOptions,
} from './engine/core/normalized-context';
export {
  getGanji,
  isYangGan,
  isForwardDirection,
} from './engine/core/ganji';
export type {
  GanjiInput,
  GanjiResult,
  GanjiPillar,
} from './engine/core/ganji';
export { solarToLunar, lunarToSolar, getLunarMonthDays } from './engine/core/lunar-solar';
export type { SolarDateTime, LunarDateTime } from './engine/core/lunar-solar';
export {
  getSolarTermOnOrBefore,
  getSolarTermOnOrBeforeDateTime,
  getJeolOnOrBeforeDateTime,
  getSolarTermsOnDate,
  listSolarTermsForYear,
  isJeolSolarTerm,
  normalizeSolarTermName,
  JEOL_SOLAR_TERM_NAMES,
} from './engine/core/solar-terms';
export type { SolarTermInfo } from './engine/core/solar-terms';
export {
  shiftDateTimeUtc,
  toKstTimestamp,
  toOffsetTimestamp,
  toJulianDay,
  compareDateTime,
  diffMinutes,
  dayOfYearUtc,
  formatDateKey,
} from './engine/core/temporal';
export type { DateTimeParts } from './engine/core/temporal';
export * from './engine/core/errors';
export { resolveKoreanLegalTime } from './engine/core/korean-legal-time';
export type { KoreanLegalTimeResolution } from './engine/core/korean-legal-time';

// ---------- adapter ----------
export { resolveSchool } from './engine/adapter/school-resolver';
export type { SchoolResolution } from './engine/adapter/school-resolver';
export { correctToTrueSolarTime } from './engine/adapter/time-corrector';

// ---------- 사주 ----------
export { calculatePalja } from './engine/saju/calculator';
export type { CalculateOptions } from './engine/saju/calculator';
export { buildSajuResult } from './engine/saju/result-builder';
export {
  calculateYunStartAge,
  calculateDaeun,
  calculateSeun,
  calculateWolun,
} from './engine/saju/daeun';
export { determineGyeokguk } from './engine/saju/gyeokguk';
export { determineYongsin } from './engine/saju/yongsin';
export {
  calculateSipsin,
  calculateJijangganSipsin,
  calculateUnsung,
  extractJijanggan,
  determineSipsin,
  JIJANGGAN_TABLE,
} from './engine/saju/sipsin';
export {
  calculateSinsal,
  analyzeJijiRelations,
  calculateGongmang,
  getNaeumOhaeng,
} from './engine/saju/sinsal';
export type { JijiRelation } from './engine/saju/sinsal';
export {
  analyzeWonjin,
  WONJIN_TABLE,
  WONJIN_TABLE_KR,
} from './engine/saju/wonjin';
export type { WonjinPair, WonjinResult } from './engine/saju/wonjin';

// ---------- 궁합 ----------
export { calculateCompatibility } from './engine/compatibility';
export type { CompatibilityInput, CompatibilityResult } from './engine/compatibility/types';

// ---------- 파생 모듈 진입점 ----------
export { analyzeTojeong } from './engine/tojeong';
export { calculateZiwei, calculateZiweiByLunar } from './engine/ziwei';
export { calculateQimen } from './engine/qimen';
export { calculateDaeyukim } from './engine/daeyukim';
export { calculateGuseong } from './engine/guseong';
export { analyzeHongyeon } from './engine/hongyeon';
export { divineByTime, divineByNumber, divineByName } from './engine/maehwa';
export { calculateHarak, calculateHexagramNumber } from './engine/harak';
export { calculateDaejeong } from './engine/daejeong';
export {
  analyzeName,
  analyzeNames,
  analyzeNameExtended,
  analyzeNamesExtended,
} from './engine/naming';
export {
  getCalendarDay,
  getMonthlyCalendar,
  getDayGanJi,
  getMonthJi,
  getSinsal12,
  getGilhyung,
  getTaekilInfo,
} from './engine/calendar';

// ---------- 해석 함수 (봉투 계약 밖의 순수 해석기) ----------
export { interpretResult as interpretQimenResult } from './engine/qimen/interpret';
export { interpretResult as interpretDaeyukimResult } from './engine/daeyukim/interpret';

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
  judgeGanJi,
  buildTimingNarrative,
  assembleReport,
  renderReportMarkdown,
  renderReportHtml,
  renderCompatibilityHtml,
  renderNamingHtml,
  renderTaekilHtml,
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
} from './engine/interpretation';
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
  GanJiJudgement,
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
} from './engine/interpretation';
