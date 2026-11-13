import { ManseryeokRangeError } from './errors';

const MILLISECONDS_PER_MINUTE = 60_000;
const MILLISECONDS_PER_DAY = 86_400_000;
const KST_OFFSET_MINUTES = 9 * 60;

export interface DateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new ManseryeokRangeError(`${label} must be an integer`, { label, value });
  }
}

function timestampFromUtcParts(dateTime: DateTimeParts): number {
  assertInteger(dateTime.year, 'year');
  assertInteger(dateTime.month, 'month');
  assertInteger(dateTime.day, 'day');
  assertInteger(dateTime.hour, 'hour');
  assertInteger(dateTime.minute, 'minute');
  assertInteger(dateTime.second, 'second');

  const date = new Date(Date.UTC(
    dateTime.year,
    dateTime.month - 1,
    dateTime.day,
    dateTime.hour,
    dateTime.minute,
    dateTime.second,
  ));
  date.setUTCFullYear(dateTime.year);
  const timestamp = date.getTime();

  if (!Number.isFinite(timestamp)) {
    throw new ManseryeokRangeError('Date-time is outside the supported JavaScript UTC range', { dateTime });
  }

  const normalized = partsFromUtcTimestamp(timestamp);
  if (compareDateTime(normalized, dateTime) !== 0) {
    throw new ManseryeokRangeError('Date-time contains invalid UTC calendar fields', { dateTime });
  }

  return timestamp;
}

function partsFromUtcTimestamp(timestamp: number): DateTimeParts {
  const date = new Date(timestamp);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

export function shiftDateTimeUtc(dateTime: DateTimeParts, minutes: number): DateTimeParts {
  assertInteger(minutes, 'minutes');
  return partsFromUtcTimestamp(timestampFromUtcParts(dateTime) + minutes * MILLISECONDS_PER_MINUTE);
}

export function toOffsetTimestamp(dateTime: DateTimeParts, offsetMinutes: number): number {
  assertInteger(offsetMinutes, 'offsetMinutes');
  return timestampFromUtcParts(dateTime) - offsetMinutes * MILLISECONDS_PER_MINUTE;
}

export function toKstTimestamp(dateTime: DateTimeParts): number {
  return toOffsetTimestamp(dateTime, KST_OFFSET_MINUTES);
}

export function dayOfYearUtc(dateTime: Pick<DateTimeParts, 'year' | 'month' | 'day'>): number {
  const current = timestampFromUtcParts({
    year: dateTime.year,
    month: dateTime.month,
    day: dateTime.day,
    hour: 0,
    minute: 0,
    second: 0,
  });
  const firstDay = timestampFromUtcParts({
    year: dateTime.year,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
  });

  return Math.floor((current - firstDay) / MILLISECONDS_PER_DAY) + 1;
}

export function compareDateTime(left: DateTimeParts, right: DateTimeParts): number {
  const fields = ['year', 'month', 'day', 'hour', 'minute', 'second'] as const;
  for (const field of fields) {
    if (left[field] < right[field]) {
      return -1;
    }
    if (left[field] > right[field]) {
      return 1;
    }
  }

  return 0;
}

export function formatDateKey(dateTime: Pick<DateTimeParts, 'year' | 'month' | 'day'>): string {
  return `${pad(dateTime.year, 4)}-${pad(dateTime.month, 2)}-${pad(dateTime.day, 2)}`;
}

export function diffMinutes(from: DateTimeParts, to: DateTimeParts): number {
  return Math.trunc((timestampFromUtcParts(to) - timestampFromUtcParts(from)) / MILLISECONDS_PER_MINUTE);
}

export function toJulianDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;

  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045 -
    0.5
  );
}
