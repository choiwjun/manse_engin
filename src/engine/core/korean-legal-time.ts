import { AmbiguousCivilTimeError, ManseryeokPolicyError, NonexistentCivilTimeError } from './errors';
import { compareDateTime, type DateTimeParts, formatDateKey, shiftDateTimeUtc } from './temporal';

export const KOREAN_LEGAL_TIME_POLICY_ID = 'korean-legal-civil-time@manseryeok-policy-cases-v1';

export type KoreanLegalTimeTransitionStatus = 'standard' | 'daylight';

export interface KoreanLegalTimeResolution {
  policyId: typeof KOREAN_LEGAL_TIME_POLICY_ID;
  standardOffsetMinutes: number;
  daylightOffsetMinutes: number;
  totalOffsetMinutes: number;
  standardMeridianDegrees: number;
  transitionStatus: KoreanLegalTimeTransitionStatus;
  sourceIds: string[];
}

interface StandardTimeRule {
  start: DateTimeParts;
  end?: DateTimeParts;
  standardOffsetMinutes: number;
  sourceIds: string[];
}

interface DaylightSavingRule {
  start: DateTimeParts;
  end: DateTimeParts;
  daylightOffsetMinutes: number;
  sourceIds: string[];
}

const KASI_SOURCE_IDS = ['kasi-200307-pdf', 'iana-tzdb-asia-seoul'];
const STANDARD_1954_SOURCE_IDS = [
  'national-archives-1954-standard-time',
  'donga-1961-standard-time',
  'iana-tzdb-asia-seoul',
];
const STANDARD_1961_SOURCE_IDS = ['donga-1961-standard-time', 'iana-tzdb-asia-seoul'];
const POST_1989_SOURCE_IDS = ['encykorea-dst', 'iana-tzdb-asia-seoul'];
const HISTORICAL_DST_SOURCE_IDS = ['encykorea-dst', 'national-archives-dst-decree', 'iana-tzdb-asia-seoul'];
const DST_1987_SOURCE_IDS = ['timeanddate-1987-seoul', 'iana-tzdb-asia-seoul'];
const DST_1988_SOURCE_IDS = ['timeanddate-1988-seoul', 'iana-tzdb-asia-seoul'];

const STANDARD_TIME_RULES: StandardTimeRule[] = [
  {
    start: parts(1908, 4, 1),
    end: parts(1912, 1, 1),
    standardOffsetMinutes: 510,
    sourceIds: KASI_SOURCE_IDS,
  },
  {
    start: parts(1912, 1, 1),
    end: parts(1954, 3, 21),
    standardOffsetMinutes: 540,
    sourceIds: KASI_SOURCE_IDS,
  },
  {
    start: parts(1954, 3, 21),
    end: parts(1961, 8, 10),
    standardOffsetMinutes: 510,
    sourceIds: STANDARD_1954_SOURCE_IDS,
  },
  {
    start: parts(1961, 8, 10, 0, 30),
    end: parts(1987, 1, 1),
    standardOffsetMinutes: 540,
    sourceIds: STANDARD_1961_SOURCE_IDS,
  },
  {
    start: parts(1987, 1, 1),
    end: parts(1989, 1, 1),
    standardOffsetMinutes: 540,
    sourceIds: ['encykorea-dst', 'iana-tzdb-asia-seoul'],
  },
  {
    start: parts(1989, 1, 1),
    standardOffsetMinutes: 540,
    sourceIds: POST_1989_SOURCE_IDS,
  },
];

// The legal-time policy is source-cited in docs/engine/korean-legal-time-policy.md and
// tests/fixtures/manseryeok-policy-cases.json. Intervals below are local civil labels and use [start, end).
const DAYLIGHT_SAVING_RULES: DaylightSavingRule[] = [
  { start: parts(1948, 6, 1), end: parts(1948, 9, 13), daylightOffsetMinutes: 60, sourceIds: HISTORICAL_DST_SOURCE_IDS },
  { start: parts(1949, 4, 3), end: parts(1949, 9, 11), daylightOffsetMinutes: 60, sourceIds: HISTORICAL_DST_SOURCE_IDS },
  { start: parts(1950, 4, 1), end: parts(1950, 9, 10), daylightOffsetMinutes: 60, sourceIds: HISTORICAL_DST_SOURCE_IDS },
  { start: parts(1951, 5, 6), end: parts(1951, 9, 9), daylightOffsetMinutes: 60, sourceIds: HISTORICAL_DST_SOURCE_IDS },
  { start: parts(1955, 5, 5), end: parts(1955, 9, 9), daylightOffsetMinutes: 60, sourceIds: HISTORICAL_DST_SOURCE_IDS },
  { start: parts(1956, 5, 20), end: parts(1956, 9, 30), daylightOffsetMinutes: 60, sourceIds: HISTORICAL_DST_SOURCE_IDS },
  { start: parts(1957, 5, 5), end: parts(1957, 9, 22), daylightOffsetMinutes: 60, sourceIds: HISTORICAL_DST_SOURCE_IDS },
  { start: parts(1958, 5, 4), end: parts(1958, 9, 21), daylightOffsetMinutes: 60, sourceIds: HISTORICAL_DST_SOURCE_IDS },
  { start: parts(1959, 5, 3), end: parts(1959, 9, 20), daylightOffsetMinutes: 60, sourceIds: HISTORICAL_DST_SOURCE_IDS },
  { start: parts(1960, 5, 1), end: parts(1960, 9, 18), daylightOffsetMinutes: 60, sourceIds: HISTORICAL_DST_SOURCE_IDS },
  { start: parts(1987, 5, 10, 2), end: parts(1987, 10, 11, 3), daylightOffsetMinutes: 60, sourceIds: DST_1987_SOURCE_IDS },
  { start: parts(1988, 5, 8, 2), end: parts(1988, 10, 9, 3), daylightOffsetMinutes: 60, sourceIds: DST_1988_SOURCE_IDS },
];

function parts(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): DateTimeParts {
  return { year, month, day, hour, minute, second };
}

function isBefore(left: DateTimeParts, right: DateTimeParts): boolean {
  return compareDateTime(left, right) < 0;
}

function isOnOrAfter(left: DateTimeParts, right: DateTimeParts): boolean {
  return compareDateTime(left, right) >= 0;
}

function isInInterval(dateTime: DateTimeParts, start: DateTimeParts, end?: DateTimeParts): boolean {
  return isOnOrAfter(dateTime, start) && (!end || isBefore(dateTime, end));
}

function dedupeSourceIds(sourceIds: string[]): string[] {
  return [...new Set(sourceIds)];
}

function assertSupportedStandardTransitionLabel(dateTime: DateTimeParts): void {
  const repeated1954Start = parts(1954, 3, 21);
  const repeated1954End = parts(1954, 3, 21, 0, 30);
  if (isInInterval(dateTime, repeated1954Start, repeated1954End)) {
    throw new AmbiguousCivilTimeError('Korean civil time label is repeated by the 1954 standard-time transition', {
      dateTime,
      transitionStart: repeated1954Start,
      transitionEnd: repeated1954End,
      policyId: KOREAN_LEGAL_TIME_POLICY_ID,
      sourceIds: STANDARD_1954_SOURCE_IDS,
    });
  }

  const skipped1961Start = parts(1961, 8, 10);
  const skipped1961End = parts(1961, 8, 10, 0, 30);
  if (isInInterval(dateTime, skipped1961Start, skipped1961End)) {
    throw new NonexistentCivilTimeError('Korean civil time label is skipped by the 1961 standard-time transition', {
      dateTime,
      transitionStart: skipped1961Start,
      transitionEnd: skipped1961End,
      policyId: KOREAN_LEGAL_TIME_POLICY_ID,
      sourceIds: STANDARD_1961_SOURCE_IDS,
    });
  }
}

function findStandardTimeRule(dateTime: DateTimeParts): StandardTimeRule {
  const rule = STANDARD_TIME_RULES.find((candidate) => isInInterval(dateTime, candidate.start, candidate.end));
  if (!rule) {
    throw new ManseryeokPolicyError('Korean legal time is not defined before the 1908 standard-time policy interval', {
      date: formatDateKey(dateTime),
      policyId: KOREAN_LEGAL_TIME_POLICY_ID,
    });
  }

  return rule;
}

function findDaylightSavingRule(dateTime: DateTimeParts): DaylightSavingRule | undefined {
  return DAYLIGHT_SAVING_RULES.find((rule) => {
    const nonexistentEnd = shiftDateTimeUtc(rule.start, rule.daylightOffsetMinutes);
    const ambiguousStart = shiftDateTimeUtc(rule.end, -rule.daylightOffsetMinutes);
    return isInInterval(dateTime, rule.start, nonexistentEnd) || isInInterval(dateTime, ambiguousStart, rule.end) || isInInterval(dateTime, nonexistentEnd, ambiguousStart);
  });
}

function assertSupportedTransitionLabel(dateTime: DateTimeParts, rule: DaylightSavingRule): void {
  const nonexistentEnd = shiftDateTimeUtc(rule.start, rule.daylightOffsetMinutes);
  if (isInInterval(dateTime, rule.start, nonexistentEnd)) {
    throw new NonexistentCivilTimeError('Korean civil time label is skipped by a daylight-saving transition', {
      dateTime,
      transitionStart: rule.start,
      transitionEnd: nonexistentEnd,
      policyId: KOREAN_LEGAL_TIME_POLICY_ID,
      sourceIds: rule.sourceIds,
    });
  }

  const ambiguousStart = shiftDateTimeUtc(rule.end, -rule.daylightOffsetMinutes);
  if (isInInterval(dateTime, ambiguousStart, rule.end)) {
    throw new AmbiguousCivilTimeError('Korean civil time label is repeated by a daylight-saving transition', {
      dateTime,
      transitionStart: ambiguousStart,
      transitionEnd: rule.end,
      policyId: KOREAN_LEGAL_TIME_POLICY_ID,
      sourceIds: rule.sourceIds,
    });
  }
}

export function resolveKoreanLegalTime(dateTime: DateTimeParts): KoreanLegalTimeResolution {
  assertSupportedStandardTransitionLabel(dateTime);
  const standardRule = findStandardTimeRule(dateTime);
  const daylightRule = findDaylightSavingRule(dateTime);

  if (daylightRule) {
    assertSupportedTransitionLabel(dateTime, daylightRule);
  }

  const daylightOffsetMinutes = daylightRule ? daylightRule.daylightOffsetMinutes : 0;
  const sourceIds = dedupeSourceIds([
    ...standardRule.sourceIds,
    ...(daylightRule?.sourceIds ?? []),
  ]);

  return {
    policyId: KOREAN_LEGAL_TIME_POLICY_ID,
    standardOffsetMinutes: standardRule.standardOffsetMinutes,
    daylightOffsetMinutes,
    totalOffsetMinutes: standardRule.standardOffsetMinutes + daylightOffsetMinutes,
    standardMeridianDegrees: standardRule.standardOffsetMinutes / 4,
    transitionStatus: daylightRule ? 'daylight' : 'standard',
    sourceIds,
  };
}
