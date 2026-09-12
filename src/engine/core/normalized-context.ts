import { correctToTrueSolarTime } from '@/engine/adapter/time-corrector';
import { resolveSchool, type SchoolResolution } from '@/engine/adapter/school-resolver';
import type { BirthInputData, Gender, MidnightMode } from '@/engine/types';
import { lunarToSolar } from './lunar-solar';
import { ManseryeokPolicyError } from './errors';
import {
  resolveKoreanLegalTime,
  type KoreanLegalTimeResolution,
} from './korean-legal-time';
import { shiftDateTimeUtc, type DateTimeParts } from './temporal';

export type NormalizedCalendarType = 'solar' | 'lunar';
export type NormalizedDateTimeBasis = 'true-solar' | 'legal-civil';
export type SolarCivilDateTimeSource = 'input-solar' | 'converted-from-lunar';

export interface NormalizedOriginalInput {
  calendar: NormalizedCalendarType;
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
  second: number;
  isLeapMonth: boolean;
  gender?: Gender;
  birthPlace: string | null;
  longitude: number;
  midnightMode: MidnightMode;
  trueSolarTime: boolean;
}

export interface SupportedManseryeokRange {
  publicStartYear: 1908;
  publicStartDate: '1908-04-01';
  publicEndYear: 2101;
  rawLunarSolarStartYear: 1899;
  rawSolarTermStartYear: 1899;
  rawSolarTermEndYear: 2101;
  policyId: string;
}

export interface NormalizedSolarCivilDateTime extends DateTimeParts {
  source: SolarCivilDateTimeSource;
}

export interface NormalizedTrueSolarContext {
  enabled: boolean;
  longitude: number;
  standardLongitude: number;
  dayOffset: number;
  dateTime: DateTimeParts;
}

export interface NormalizedSchoolResolution extends SchoolResolution {
  mode: MidnightMode;
  evaluatedDateTimeBasis: NormalizedDateTimeBasis;
  sect: 1 | 2;
}

export interface NormalizedContextDateTime extends DateTimeParts {
  basis: NormalizedDateTimeBasis;
}

export interface NormalizedDayHourContextDateTime extends NormalizedContextDateTime {
  schoolApplied: boolean;
}

export interface NormalizedTermLookupBasis {
  kind: 'timestamp';
  jeolPolicy: 'TWELVE_JEOL_MAJOR_TERMS';
  currentSolarTermBasis: 'at-or-before-context-timestamp';
  legacyDateOnlyWrappersPreserved: boolean;
}

export interface NormalizedManseryeokContext {
  originalInput: NormalizedOriginalInput;
  supportedRange: SupportedManseryeokRange;
  solarCivilDateTime: NormalizedSolarCivilDateTime;
  legalTime: KoreanLegalTimeResolution;
  trueSolar: NormalizedTrueSolarContext;
  schoolResolution: NormalizedSchoolResolution;
  yearMonthContextDateTime: NormalizedContextDateTime;
  dayHourContextDateTime: NormalizedDayHourContextDateTime;
  termLookupBasis: NormalizedTermLookupBasis;
}

export interface NormalizeBirthContextOptions {
  trueSolarTime?: boolean;
  longitude?: number;
  midnightMode?: MidnightMode;
}

const DEFAULT_CONTEXT_OPTIONS: Required<NormalizeBirthContextOptions> = {
  trueSolarTime: false,
  longitude: 127.0,
  midnightMode: 'yaja',
};

export const SUPPORTED_MANSERYEOK_RANGE: SupportedManseryeokRange = {
  publicStartYear: 1908,
  publicStartDate: '1908-04-01',
  publicEndYear: 2101,
  rawLunarSolarStartYear: 1899,
  rawSolarTermStartYear: 1899,
  rawSolarTermEndYear: 2101,
  policyId: 'manseryeok-supported-range@legal-palja-1908-04-01-2101-raw-data-1899-2101',
};

export const NORMALIZED_TERM_LOOKUP_BASIS: NormalizedTermLookupBasis = {
  kind: 'timestamp',
  jeolPolicy: 'TWELVE_JEOL_MAJOR_TERMS',
  currentSolarTermBasis: 'at-or-before-context-timestamp',
  legacyDateOnlyWrappersPreserved: true,
};

function toInternalDateTime(input: BirthInputData): DateTimeParts {
  return {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour ?? 0,
    minute: input.minute ?? 0,
    second: 0,
  };
}

function toSolarCivilDateTime(input: BirthInputData): NormalizedSolarCivilDateTime {
  const internal = toInternalDateTime(input);

  if (!input.isLunar) {
    return {
      ...internal,
      source: 'input-solar',
    };
  }

  const solar = lunarToSolar({
    year: input.year,
    month: input.month,
    day: input.day,
    isLeapMonth: input.isLeapMonth ?? false,
    hour: internal.hour,
    minute: internal.minute,
    second: internal.second,
  });

  return {
    year: solar.year,
    month: solar.month,
    day: solar.day,
    hour: solar.hour ?? 0,
    minute: solar.minute ?? 0,
    second: solar.second ?? 0,
    source: 'converted-from-lunar',
  };
}

function withBasis(dateTime: DateTimeParts, basis: NormalizedDateTimeBasis): NormalizedContextDateTime {
  return { ...dateTime, basis };
}

function applySchoolResolution(
  dateTime: DateTimeParts,
  basis: NormalizedDateTimeBasis,
  schoolResolution: SchoolResolution,
): NormalizedDayHourContextDateTime {
  const schoolAdjustedDateTime = schoolResolution.useCurrentDay
    ? dateTime
    : shiftDateTimeUtc(dateTime, 24 * 60);

  return {
    ...schoolAdjustedDateTime,
    basis,
    schoolApplied: !schoolResolution.useCurrentDay,
  };
}

export function createNormalizedManseryeokContext(
  input: BirthInputData,
  options: NormalizeBirthContextOptions = {},
): NormalizedManseryeokContext {
  const resolvedOptions = { ...DEFAULT_CONTEXT_OPTIONS, ...options };
  const originalInput: NormalizedOriginalInput = {
    calendar: input.isLunar ? 'lunar' : 'solar',
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute,
    second: 0,
    isLeapMonth: input.isLeapMonth ?? false,
    gender: input.gender,
    birthPlace: input.birthPlace,
    longitude: resolvedOptions.longitude,
    midnightMode: resolvedOptions.midnightMode,
    trueSolarTime: resolvedOptions.trueSolarTime,
  };

  const solarCivilDateTime = toSolarCivilDateTime(input);
  if (solarCivilDateTime.year > SUPPORTED_MANSERYEOK_RANGE.publicEndYear) {
    throw new ManseryeokPolicyError(
      'Date is outside the supported manseryeok range',
      {
        solarCivilDateTime,
        publicEndYear: SUPPORTED_MANSERYEOK_RANGE.publicEndYear,
        policyId: SUPPORTED_MANSERYEOK_RANGE.policyId,
      },
    );
  }
  const legalTime = resolveKoreanLegalTime(solarCivilDateTime);
  const standardLongitude = legalTime.standardMeridianDegrees;
  const standardCivilDateTime = legalTime.daylightOffsetMinutes === 0
    ? solarCivilDateTime
    : shiftDateTimeUtc(solarCivilDateTime, -legalTime.daylightOffsetMinutes);

  const corrected = resolvedOptions.trueSolarTime
    ? correctToTrueSolarTime(
        standardCivilDateTime,
        resolvedOptions.longitude,
        { standardLongitude },
      )
    : undefined;
  const trueSolarDateTime = corrected
    ? shiftDateTimeUtc(
        {
          year: corrected.year,
          month: corrected.month,
          day: corrected.day,
          hour: corrected.hour,
          minute: corrected.minute,
          second: standardCivilDateTime.second,
        },
        corrected.dayOffset * 24 * 60,
      )
    : solarCivilDateTime;
  const basis: NormalizedDateTimeBasis = resolvedOptions.trueSolarTime ? 'true-solar' : 'legal-civil';
  const schoolEvaluationDateTime = resolvedOptions.trueSolarTime ? trueSolarDateTime : standardCivilDateTime;
  const school = resolveSchool(
    resolvedOptions.midnightMode,
    schoolEvaluationDateTime.hour,
  );
  const schoolResolution: NormalizedSchoolResolution = {
    mode: resolvedOptions.midnightMode,
    evaluatedDateTimeBasis: basis,
    sect: school.sect as 1 | 2,
    useCurrentDay: school.useCurrentDay,
  };

  return {
    originalInput,
    supportedRange: SUPPORTED_MANSERYEOK_RANGE,
    solarCivilDateTime,
    legalTime,
    trueSolar: {
      enabled: resolvedOptions.trueSolarTime,
      longitude: resolvedOptions.longitude,
      standardLongitude,
      dayOffset: corrected?.dayOffset ?? 0,
      dateTime: trueSolarDateTime,
    },
    schoolResolution,
    yearMonthContextDateTime: withBasis(schoolEvaluationDateTime, basis),
    dayHourContextDateTime: applySchoolResolution(schoolEvaluationDateTime, basis, schoolResolution),
    termLookupBasis: NORMALIZED_TERM_LOOKUP_BASIS,
  };
}
