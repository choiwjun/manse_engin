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
export { solarToLunar, lunarToSolar } from './engine/core/lunar-solar';
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

// ---------- 해석 함수 (봉투 계약 밖의 순수 해석기) ----------
export { interpretResult as interpretQimenResult } from './engine/qimen/interpret';
export { interpretResult as interpretDaeyukimResult } from './engine/daeyukim/interpret';
