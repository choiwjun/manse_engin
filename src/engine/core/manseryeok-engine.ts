import type { BirthInputData, MidnightMode, Palja } from '@/engine/types';
import { getGanji, isForwardDirection, type GanjiInput, type GanjiPillar, type GanjiResult } from './ganji';
import {
  getSolarTermOnOrBefore,
  getSolarTermOnOrBeforeDateTime,
  isJeolSolarTerm,
  listSolarTermsForYear,
  normalizeSolarTermName,
  type SolarTermInfo,
} from './solar-terms';
import { lunarToSolar, solarToLunar, type LunarDateTime, type SolarDateTime } from './lunar-solar';
import { ManseryeokDataError } from './errors';
import { shiftDateTimeUtc, toKstTimestamp } from './temporal';
import {
  createNormalizedManseryeokContext,
  type NormalizedContextDateTime,
  type NormalizedDayHourContextDateTime,
  type NormalizedManseryeokContext,
} from './normalized-context';

export interface SolarDateContext {
  solar: Required<SolarDateTime>;
  lunar: LunarDateTime;
  ganji: GanjiResult;
  currentSolarTerm: SolarTermInfo;
  exactSolarTerm?: string;
}

export interface PaljaInput extends GanjiInput {
  isLunar?: boolean;
  isLeapMonth?: boolean;
}

function formatSolarDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function resolveSolarDateTime(input: SolarDateTime): Required<SolarDateTime> {
  return {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour ?? 0,
    minute: input.minute ?? 0,
    second: input.second ?? 0,
  };
}


function toGanjiDateTime(dateTime: NormalizedContextDateTime) {
  return {
    year: dateTime.year,
    month: dateTime.month,
    day: dateTime.day,
    hour: dateTime.hour,
    minute: dateTime.minute,
    second: dateTime.second,
  };
}

function toGanjiDayHourDateTime(dateTime: NormalizedDayHourContextDateTime) {
  return {
    year: dateTime.year,
    month: dateTime.month,
    day: dateTime.day,
    hour: dateTime.hour,
    minute: dateTime.minute,
    second: dateTime.second,
  };
}

function toBirthInput(input: PaljaInput, isLunar: boolean): BirthInputData {
  return {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour ?? null,
    minute: input.minute ?? null,
    gender: 'male',
    isLunar,
    isLeapMonth: input.isLeapMonth,
    birthPlace: null,
  };
}

function midnightModeFromSect(sect?: number): MidnightMode {
  return sect === 1 ? 'joja' : 'yaja';
}

function buildPalja(ganji: GanjiResult, includeTime: boolean): Palja {
  return {
    yearGan: ganji.year.gan,
    yearJi: ganji.year.ji,
    monthGan: ganji.month.gan,
    monthJi: ganji.month.ji,
    dayGan: ganji.day.gan,
    dayJi: ganji.day.ji,
    hourGan: includeTime ? ganji.hour.gan : '',
    hourJi: includeTime ? ganji.hour.ji : '',
  };
}

function getExactSolarTerm(date: Required<SolarDateTime>): string | undefined {
  const terms = listSolarTermsForYear(date.year);
  const exact = terms.find(
    (term) => term.year === date.year && term.month === date.month && term.day === date.day
  );

  return exact?.koreanName;
}

export interface YunStartAgeResolution {
  startAge: number;
  startAgeMonths: number;
  targetJeol: SolarTermInfo;
  direction: 'forward' | 'reverse';
}


function toSolarTermTimestamp(term: SolarTermInfo): number {
  return toKstTimestamp({
    year: term.year,
    month: term.month,
    day: term.day,
    hour: term.hour,
    minute: term.minute,
    second: term.second,
  });
}

export class ManseryeokEngine {
  static listSolarTermsForYear(year: number): SolarTermInfo[] {
    return listSolarTermsForYear(year);
  }

  static getSolarTermOnOrBefore(date: string): SolarTermInfo {
    return getSolarTermOnOrBefore(date);
  }

  static normalizeSolarTermName(name: string): string {
    return normalizeSolarTermName(name);
  }

  static solarToLunar(input: SolarDateTime): LunarDateTime {
    return solarToLunar(input);
  }

  static lunarToSolar(input: LunarDateTime): SolarDateTime {
    return lunarToSolar(input);
  }

  static getGanji(input: GanjiInput): GanjiResult {
    return getGanji(input);
  }

  static getGanjiFromContext(context: NormalizedManseryeokContext): GanjiResult {
    return getGanji({
      ...toGanjiDateTime(context.yearMonthContextDateTime),
      sect: context.schoolResolution.sect,
      yearMonthDateTime: toGanjiDateTime(context.yearMonthContextDateTime),
      dayHourDateTime: toGanjiDayHourDateTime(context.dayHourContextDateTime),
      dayHourDateTimeSchoolApplied: context.dayHourContextDateTime.schoolApplied,
    });
  }

  static getPaljaFromContext(context: NormalizedManseryeokContext, includeTime = true): Palja {
    return buildPalja(this.getGanjiFromContext(context), includeTime && context.timeKnown);
  }

  static getDayPillar(input: GanjiInput): GanjiPillar {
    return getGanji(input).day;
  }

  static getMonthPillar(input: GanjiInput): GanjiPillar {
    return getGanji(input).month;
  }

  static getYearPillar(input: GanjiInput): GanjiPillar {
    return getGanji(input).year;
  }

  static getSolarContext(input: SolarDateTime): SolarDateContext {
    const solar = resolveSolarDateTime(input);

    return {
      solar,
      lunar: solarToLunar(solar),
      ganji: getGanji(solar),
      currentSolarTerm: getSolarTermOnOrBeforeDateTime(solar),
      exactSolarTerm: getExactSolarTerm(solar),
    };
  }

  static getSolarContextFromDateString(
    solarDate: string,
    hour = 0,
    minute = 0,
    second = 0
  ): SolarDateContext {
    const [year, month, day] = solarDate.split('-').map(Number);
    return this.getSolarContext({ year, month, day, hour, minute, second });
  }

  static getPaljaFromSolarInput(input: PaljaInput, includeTime = true): Palja {
    if (input.yearMonthDateTime || input.dayHourDateTime) {
      const ganji = getGanji({
        year: input.year,
        month: input.month,
        day: input.day,
        hour: input.hour ?? 0,
        minute: input.minute ?? 0,
        second: input.second ?? 0,
        sect: input.sect,
        yearMonthDateTime: input.yearMonthDateTime,
        dayHourDateTime: input.dayHourDateTime,
        dayHourDateTimeSchoolApplied: input.dayHourDateTimeSchoolApplied,
      });

      return buildPalja(ganji, includeTime);
    }

    const context = createNormalizedManseryeokContext(
      toBirthInput(input, false),
      { trueSolarTime: false, midnightMode: midnightModeFromSect(input.sect) },
    );

    return this.getPaljaFromContext(context, includeTime);
  }

  static getPaljaFromLunarInput(input: PaljaInput, includeTime = true): Palja {
    if (input.yearMonthDateTime || input.dayHourDateTime) {
      const solar = lunarToSolar({
        year: input.year,
        month: input.month,
        day: input.day,
        isLeapMonth: input.isLeapMonth ?? false,
        hour: input.hour ?? 0,
        minute: input.minute ?? 0,
        second: input.second ?? 0,
      });

      return this.getPaljaFromSolarInput({
        ...solar,
        sect: input.sect,
        yearMonthDateTime: input.yearMonthDateTime,
        dayHourDateTime: input.dayHourDateTime,
        dayHourDateTimeSchoolApplied: input.dayHourDateTimeSchoolApplied,
      }, includeTime);
    }

    const context = createNormalizedManseryeokContext(
      toBirthInput(input, true),
      { trueSolarTime: false, midnightMode: midnightModeFromSect(input.sect) },
    );

    return this.getPaljaFromContext(context, includeTime);
  }

  /**
   * 대운 시작 나이를 계산한다.
   *
   * 음력 입력은 먼저 양력으로 변환하고, 한국 법정시를 KST로 환산한
   * 출생 순간에서 가장 가까운 12절까지의
   * 시간을 3일=1년, 1일=4개월 정책으로 환산한다. 최소 1세 보정은 하지 않는다.
   * 진태양시와 자시 학파는 이 실제 경과 시간에 영향을 주지 않는다.
   */
  static getYunStartAge(input: BirthInputData): number {
    const context = createNormalizedManseryeokContext(input);
    const yearGan = this.getGanjiFromContext(context).year.gan;

    return this.getYunStartAgeResolutionFromContext(context, input.gender, yearGan).startAge;
  }

  static getYunStartAgeResolutionFromContext(
    context: NormalizedManseryeokContext,
    gender: BirthInputData['gender'],
    yearGan: string,
  ): YunStartAgeResolution {
    const isForward = isForwardDirection(gender, yearGan);
    const birth = context.yearMonthContextDateTime;
    const birthTs = toKstTimestamp(birth);
    const candidates = [
      ...listSolarTermsForYear(birth.year - 1),
      ...listSolarTermsForYear(birth.year),
      ...listSolarTermsForYear(birth.year + 1),
    ].filter(isJeolSolarTerm);

    let targetJeol: SolarTermInfo | null = null;
    for (const term of candidates) {
      const termTs = toSolarTermTimestamp(term);
      if (isForward) {
        if (termTs >= birthTs && (!targetJeol || termTs < toSolarTermTimestamp(targetJeol))) {
          targetJeol = term;
        }
      } else if (termTs <= birthTs && (!targetJeol || termTs > toSolarTermTimestamp(targetJeol))) {
        targetJeol = term;
      }
    }

    if (!targetJeol) {
      throw new ManseryeokDataError(`No target jeol found for ${birth.year}-${birth.month}-${birth.day}`, { birth });
    }

    const diffMs = Math.abs(toSolarTermTimestamp(targetJeol) - birthTs);
    const startAgeMonths = Math.max(0, (diffMs / (1000 * 60 * 60 * 24)) * 4);

    return {
      startAge: Math.floor(startAgeMonths / 12),
      startAgeMonths,
      targetJeol,
      direction: isForward ? 'forward' : 'reverse',
    };
  }

  static getLunarMonthGanJi(year: number, month: number, day = 15): GanjiPillar {
    return this.getMonthPillar({ year, month, day });
  }

  static getSolarDayPillar(year: number, month: number, day: number): GanjiPillar {
    return this.getDayPillar({ year, month, day });
  }
}

export function shiftSolarDate(input: SolarDateTime, dayOffset: number): Required<SolarDateTime> {
  const solar = resolveSolarDateTime(input);
  return shiftDateTimeUtc(solar, dayOffset * 24 * 60);
}

export { formatSolarDate };
