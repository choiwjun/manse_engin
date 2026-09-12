import { listSolarTermsForYear, type SolarTermInfo } from './solar-terms';
import { ManseryeokDataError } from './errors';
import { shiftDateTimeUtc, toJulianDay, toKstTimestamp } from './temporal';

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
const MONTH_BRANCH_START_INDEX = 2;

const MAJOR_SOLAR_TERM_TO_MONTH_INDEX: Record<string, number> = {
  소한: 11,
  입춘: 0,
  경칩: 1,
  청명: 2,
  입하: 3,
  망종: 4,
  소서: 5,
  입추: 6,
  백로: 7,
  한로: 8,
  입동: 9,
  대설: 10,
};

const TIGER_MONTH_STEM_START: Record<string, number> = {
  甲: 2,
  己: 2,
  乙: 4,
  庚: 4,
  丙: 6,
  辛: 6,
  丁: 8,
  壬: 8,
  戊: 0,
  癸: 0,
};

export interface GanjiPillar {
  gan: string;
  ji: string;
  ganji: string;
}

export interface GanjiResult {
  year: GanjiPillar;
  month: GanjiPillar;
  day: GanjiPillar;
  hour: GanjiPillar;
}

export interface GanjiInput {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
  sect?: number;
  yearMonthDateTime?: Partial<Pick<GanjiInput, 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'>>;
  dayHourDateTime?: Partial<Pick<GanjiInput, 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'>>;
  dayHourDateTimeSchoolApplied?: boolean;
}

interface ResolvedDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

interface ResolvedGanjiInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  sect: number;
  yearMonthDateTime: ResolvedDateTime;
  dayHourDateTime: ResolvedDateTime;
  dayHourDateTimeSchoolApplied: boolean;
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

/** 양간(陽干) 여부 — 甲丙戊庚壬 */
export function isYangGan(gan: string): boolean {
  return gan === '甲' || gan === '丙' || gan === '戊' || gan === '庚' || gan === '壬';
}

/** 대운 진행 방향: 양간 연주 남자/음간 연주 여자는 순행, 반대는 역행 */
export function isForwardDirection(gender: 'male' | 'female', yearGan: string): boolean {
  return gender === 'male' ? isYangGan(yearGan) : !isYangGan(yearGan);
}

function createPillar(sexagenaryIndex: number): GanjiPillar {
  const normalized = mod(sexagenaryIndex, 60);
  const gan = STEMS[normalized % 10];
  const ji = BRANCHES[normalized % 12];
  return { gan, ji, ganji: `${gan}${ji}` };
}

function resolveDateTime(
  base: Pick<GanjiInput, 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'>,
  override?: Partial<Pick<GanjiInput, 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'>>
): ResolvedDateTime {
  return {
    year: override?.year ?? base.year,
    month: override?.month ?? base.month,
    day: override?.day ?? base.day,
    hour: override?.hour ?? base.hour ?? 0,
    minute: override?.minute ?? base.minute ?? 0,
    second: override?.second ?? base.second ?? 0,
  };
}

function resolveInput(input: GanjiInput): ResolvedGanjiInput {
  const base = {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour ?? 0,
    minute: input.minute ?? 0,
    second: input.second ?? 0,
  };

  return {
    ...base,
    sect: input.sect ?? 2,
    yearMonthDateTime: resolveDateTime(base, input.yearMonthDateTime),
    dayHourDateTime: resolveDateTime(base, input.dayHourDateTime),
    dayHourDateTimeSchoolApplied: input.dayHourDateTimeSchoolApplied ?? false,
  };
}

function resolveEffectiveInputTimestamp(input: ResolvedGanjiInput): number {
  return toKstTimestamp(input.yearMonthDateTime);
}

function getIpchunTerm(year: number): SolarTermInfo {
  const ipchun = listSolarTermsForYear(year).find((term) => term.koreanName === '입춘');
  if (!ipchun) {
    throw new ManseryeokDataError(`No 입춘 data for ${year}`, { year });
  }
  return ipchun;
}

function getEffectiveYear(input: ResolvedGanjiInput): number {
  const context = input.yearMonthDateTime;
  const ipchun = getIpchunTerm(context.year);
  const effectiveTs = resolveEffectiveInputTimestamp(input);
  const ipchunTs = toKstTimestamp(ipchun);
  return effectiveTs >= ipchunTs ? context.year : context.year - 1;
}

function getLatestMajorSolarTerm(input: ResolvedGanjiInput): SolarTermInfo {
  const context = input.yearMonthDateTime;
  const effectiveTs = resolveEffectiveInputTimestamp(input);
  const candidates = [
    ...listSolarTermsForYear(context.year - 1),
    ...listSolarTermsForYear(context.year),
  ].filter((term) => term.koreanName in MAJOR_SOLAR_TERM_TO_MONTH_INDEX);

  let best: SolarTermInfo | null = null;
  for (const term of candidates) {
    const termTs = toKstTimestamp(term);
    if (termTs <= effectiveTs && (!best || termTs > toKstTimestamp(best))) {
      best = term;
    }
  }

  if (!best) {
    throw new ManseryeokDataError(`No major solar term found for ${context.year}-${context.month}-${context.day}`, { dateTime: context });
  }

  return best;
}

function getDayIndex(year: number, month: number, day: number): number {
  return mod(Math.floor(toJulianDay(year, month, day) + 49.5), 60);
}

function getHourBranchIndex(hour: number): number {
  if (hour === 23 || hour === 0) {
    return 0;
  }
  return Math.floor((hour + 1) / 2);
}

function getHourStemIndex(dayStem: string, hourBranchIndex: number): number {
  const dayStemIndex = STEMS.indexOf(dayStem as (typeof STEMS)[number]);
  const offsets = [0, 2, 4, 6, 8];
  return mod(offsets[dayStemIndex % 5] + hourBranchIndex, 10);
}

function getYearPillar(input: ResolvedGanjiInput): GanjiPillar {
  const effectiveYear = getEffectiveYear(input);
  return createPillar(effectiveYear - 1984);
}

function getMonthPillar(input: ResolvedGanjiInput): GanjiPillar {
  const latestTerm = getLatestMajorSolarTerm(input);
  const monthIndex = MAJOR_SOLAR_TERM_TO_MONTH_INDEX[latestTerm.koreanName];
  const yearPillar = getYearPillar(input);
  const stemStart = TIGER_MONTH_STEM_START[yearPillar.gan];
  const stem = STEMS[mod(stemStart + monthIndex, 10)];
  const branch = BRANCHES[mod(MONTH_BRANCH_START_INDEX + monthIndex, 12)];

  return {
    gan: stem,
    ji: branch,
    ganji: `${stem}${branch}`,
  };
}

function getDayPillar(input: ResolvedGanjiInput): GanjiPillar {
  const context = input.dayHourDateTime;
  const baseDate =
    input.sect === 1 && context.hour === 23 && !input.dayHourDateTimeSchoolApplied
      ? shiftDateTimeUtc(context, 24 * 60)
      : context;

  return createPillar(getDayIndex(baseDate.year, baseDate.month, baseDate.day));
}

function getHourPillar(input: ResolvedGanjiInput): GanjiPillar {
  const context = input.dayHourDateTime;
  const hourBranchIndex = getHourBranchIndex(context.hour);
  const hourBaseDate =
    context.hour === 23 && !input.dayHourDateTimeSchoolApplied
      ? shiftDateTimeUtc(context, 24 * 60)
      : context;
  const hourBaseDayPillar = createPillar(
    getDayIndex(hourBaseDate.year, hourBaseDate.month, hourBaseDate.day)
  );
  const hourStemIndex = getHourStemIndex(hourBaseDayPillar.gan, hourBranchIndex);
  const gan = STEMS[hourStemIndex];
  const ji = BRANCHES[hourBranchIndex];

  return {
    gan,
    ji,
    ganji: `${gan}${ji}`,
  };
}

export function getGanji(input: GanjiInput): GanjiResult {
  const resolved = resolveInput(input);

  return {
    year: getYearPillar(resolved),
    month: getMonthPillar(resolved),
    day: getDayPillar(resolved),
    hour: getHourPillar(resolved),
  };
}
