import lunarSolarData from './data/lunar-solar.generated.json';
import { ManseryeokDataError } from './errors';

export interface SolarDateTime {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
}

export interface LunarDateTime {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
  hour?: number;
  minute?: number;
  second?: number;
}

interface LunarSolarLookup {
  solarToLunar: Record<string, [number, number, number, number]>;
  lunarToSolar: Record<string, [number, number, number]>;
}

const LOOKUP = lunarSolarData as unknown as LunarSolarLookup;

function withTimeDefaults<T extends SolarDateTime | LunarDateTime>(value: T): Required<T> {
  return {
    ...value,
    hour: value.hour ?? 0,
    minute: value.minute ?? 0,
    second: value.second ?? 0,
  } as Required<T>;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toSolarKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function toLunarKey(year: number, month: number, day: number, isLeapMonth: boolean): string {
  return `${year}-${pad(month)}-${pad(day)}-${isLeapMonth ? 1 : 0}`;
}

export function solarToLunar(input: SolarDateTime): LunarDateTime {
  const resolved = withTimeDefaults(input);
  const key = toSolarKey(resolved.year, resolved.month, resolved.day);
  const match = LOOKUP.solarToLunar[key];

  if (!match) {
    throw new ManseryeokDataError(`Unsupported solar date: ${key}`, { solarDate: key });
  }

  return {
    year: match[0],
    month: match[1],
    day: match[2],
    isLeapMonth: Boolean(match[3]),
    hour: resolved.hour,
    minute: resolved.minute,
    second: resolved.second,
  };
}

export function lunarToSolar(input: LunarDateTime): SolarDateTime {
  const resolved = withTimeDefaults(input);
  const key = toLunarKey(resolved.year, resolved.month, resolved.day, resolved.isLeapMonth);
  const match = LOOKUP.lunarToSolar[key];

  if (!match) {
    throw new ManseryeokDataError(`Unsupported lunar date: ${key}`, { lunarDate: key });
  }

  return {
    year: match[0],
    month: match[1],
    day: match[2],
    hour: resolved.hour,
    minute: resolved.minute,
    second: resolved.second,
  };
}
