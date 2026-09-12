import solarTermsByYear from './data/solar-terms.generated.json';
import { ManseryeokDataError } from './errors';
import type { DateTimeParts } from './temporal';
import { toJulianDay, toKstTimestamp } from './temporal';

const SOLAR_TERM_NAME_MAP: Record<string, string> = {
  冬至: '동지',
  小寒: '소한',
  大寒: '대한',
  立春: '입춘',
  雨水: '우수',
  惊蛰: '경칩',
  驚蟄: '경칩',
  春分: '춘분',
  清明: '청명',
  淸明: '청명',
  谷雨: '곡우',
  穀雨: '곡우',
  立夏: '입하',
  小满: '소만',
  小滿: '소만',
  芒种: '망종',
  芒種: '망종',
  夏至: '하지',
  小暑: '소서',
  大暑: '대서',
  立秋: '입추',
  处暑: '처서',
  處暑: '처서',
  白露: '백로',
  秋分: '추분',
  寒露: '한로',
  霜降: '상강',
  立冬: '입동',
  小雪: '소설',
  大雪: '대설',
  DONG_ZHI: '동지',
  XIAO_HAN: '소한',
  DA_HAN: '대한',
  LI_CHUN: '입춘',
  YU_SHUI: '우수',
  JING_ZHE: '경칩',
  CHUN_FEN: '춘분',
  QING_MING: '청명',
  GU_YU: '곡우',
  LI_XIA: '입하',
  XIAO_MAN: '소만',
  MANG_ZHONG: '망종',
  XIA_ZHI: '하지',
  XIAO_SHU: '소서',
  DA_SHU: '대서',
  LI_QIU: '입추',
  CHU_SHU: '처서',
  BAI_LU: '백로',
  QIU_FEN: '추분',
  HAN_LU: '한로',
  SHUANG_JIANG: '상강',
  LI_DONG: '입동',
  XIAO_XUE: '소설',
  DA_XUE: '대설',
};

export interface SolarTermInfo {
  sourceName: string;
  koreanName: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  julianDay: number;
}

const SOLAR_TERMS = solarTermsByYear as Record<string, SolarTermInfo[]>;
const normalizedSolarTermsByYear = new Map<number, readonly Readonly<SolarTermInfo>[]>();

export const JEOL_SOLAR_TERM_NAMES = [
  '소한',
  '입춘',
  '경칩',
  '청명',
  '입하',
  '망종',
  '소서',
  '입추',
  '백로',
  '한로',
  '입동',
  '대설',
] as const;

export type JeolSolarTermName = typeof JEOL_SOLAR_TERM_NAMES[number];

const INTERNAL_JEOL_SOLAR_TERM_NAME_SET = new Set<string>(JEOL_SOLAR_TERM_NAMES);

export const JEOL_SOLAR_TERM_NAME_SET: ReadonlySet<string> = new Set(INTERNAL_JEOL_SOLAR_TERM_NAME_SET);

const SOURCE_TO_KST_OFFSET_HOURS = 1;

export function normalizeSolarTermName(name: string): string {
  return SOLAR_TERM_NAME_MAP[name] ?? name;
}

function normalizeToKst(term: SolarTermInfo): SolarTermInfo {
  const shifted = new Date(Date.UTC(
    term.year,
    term.month - 1,
    term.day,
    term.hour + SOURCE_TO_KST_OFFSET_HOURS,
    term.minute,
    term.second,
  ));

  return {
    ...term,
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    julianDay: term.julianDay + SOURCE_TO_KST_OFFSET_HOURS / 24,
  };
}

function cloneSolarTerm(term: Readonly<SolarTermInfo>): SolarTermInfo {
  return { ...term };
}

function getCachedSolarTermsForYear(year: number): readonly Readonly<SolarTermInfo>[] {
  const cached = normalizedSolarTermsByYear.get(year);
  if (cached) {
    return cached;
  }

  const normalized = (SOLAR_TERMS[String(year)] ?? [])
    .map(normalizeToKst)
    .map((term) => Object.freeze(term));
  normalizedSolarTermsByYear.set(year, normalized);
  return normalized;
}

function solarTermTimestamp(term: Readonly<SolarTermInfo>): number {
  return toKstTimestamp({
    year: term.year,
    month: term.month,
    day: term.day,
    hour: term.hour,
    minute: term.minute,
    second: term.second,
  });
}

export function isJeolSolarTerm(term: Pick<SolarTermInfo, 'koreanName'> | string): boolean {
  return INTERNAL_JEOL_SOLAR_TERM_NAME_SET.has(typeof term === 'string' ? term : term.koreanName);
}

export function listSolarTermsForYear(year: number): SolarTermInfo[] {
  return getCachedSolarTermsForYear(year).map(cloneSolarTerm);
}

export function getSolarTermsOnDate(year: number, month: number, day: number): SolarTermInfo[] {
  return [
    ...getCachedSolarTermsForYear(year - 1),
    ...getCachedSolarTermsForYear(year),
    ...getCachedSolarTermsForYear(year + 1),
  ]
    .filter((term) => term.year === year && term.month === month && term.day === day)
    .map(cloneSolarTerm);
}

export function getSolarTermOnOrBeforeDateTime(dateTime: DateTimeParts): SolarTermInfo {
  const target = toKstTimestamp(dateTime);
  const candidates = [
    ...getCachedSolarTermsForYear(dateTime.year - 1),
    ...getCachedSolarTermsForYear(dateTime.year),
    ...getCachedSolarTermsForYear(dateTime.year + 1),
  ];

  let best: Readonly<SolarTermInfo> | null = null;
  for (const term of candidates) {
    const termTimestamp = solarTermTimestamp(term);
    if (termTimestamp <= target && (!best || termTimestamp > solarTermTimestamp(best))) {
      best = term;
    }
  }

  if (!best) {
    throw new ManseryeokDataError(`No solar term found for ${dateTime.year}-${dateTime.month}-${dateTime.day} ${dateTime.hour}:${dateTime.minute}:${dateTime.second}`, { dateTime });
  }

  return cloneSolarTerm(best);
}

export function getJeolOnOrBeforeDateTime(dateTime: DateTimeParts): SolarTermInfo {
  const target = toKstTimestamp(dateTime);
  const candidates = [
    ...getCachedSolarTermsForYear(dateTime.year - 1),
    ...getCachedSolarTermsForYear(dateTime.year),
    ...getCachedSolarTermsForYear(dateTime.year + 1),
  ].filter(isJeolSolarTerm);

  let best: Readonly<SolarTermInfo> | null = null;
  for (const term of candidates) {
    const termTimestamp = solarTermTimestamp(term);
    if (termTimestamp <= target && (!best || termTimestamp > solarTermTimestamp(best))) {
      best = term;
    }
  }

  if (!best) {
    throw new ManseryeokDataError(`No jeol solar term found for ${dateTime.year}-${dateTime.month}-${dateTime.day} ${dateTime.hour}:${dateTime.minute}:${dateTime.second}`, { dateTime });
  }

  return cloneSolarTerm(best);
}

export function getSolarTermOnOrBefore(date: string): SolarTermInfo {
  const [year, month, day] = date.split('-').map(Number);
  const target = toJulianDay(year, month, day);
  const candidates = [...listSolarTermsForYear(year - 1), ...listSolarTermsForYear(year)];

  let best: SolarTermInfo | null = null;
  for (const term of candidates) {
    if (term.julianDay <= target && (!best || term.julianDay > best.julianDay)) {
      best = term;
    }
  }

  if (!best) {
    throw new ManseryeokDataError(`No solar term found for ${date}`, { date });
  }

  return best;
}
