import { EngineContractError } from './error';
import type { EngineModuleId } from './module-id';
import { getLunarMonthDays } from '@/engine/core/lunar-solar';
import { ManseryeokDataError } from '@/engine/core/errors';

const MIN_PUBLIC_DATE = '1908-04-01';
const MAX_PUBLIC_YEAR = 2101;
const MIN_DATA_YEAR = 1899;
const MAX_DATA_YEAR = 2101;

const VALID_GAN = new Set(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']);
const VALID_JI = new Set(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);
const VALID_GENDERS = new Set(['male', 'female']);
const VALID_SUB_SCHOOLS = new Set(['gyeokguk', 'johu', 'gangyak', 'mulsang']);
const VALID_MIDNIGHT_MODES = new Set(['yaja', 'joja']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function invalidInput(message: string, details?: Record<string, unknown>): never {
  throw new EngineContractError({ code: 'INVALID_INPUT', message, details });
}

function requireFiniteInteger(record: Record<string, unknown>, field: string): void {
  const value = record[field];
  if (!Number.isInteger(value)) {
    throw new EngineContractError({
      code: 'INVALID_INPUT',
      message: `${field}는 정수여야 합니다.`,
      details: { field, value },
    });
  }
}

function requireIntegerInRange(
  record: Record<string, unknown>,
  field: string,
  min: number,
  max: number,
): void {
  requireFiniteInteger(record, field);
  const value = record[field] as number;
  if (value < min || value > max) {
    throw new EngineContractError({
      code: 'OUT_OF_RANGE',
      message: `${field}는 ${min}~${max} 범위여야 합니다.`,
      details: { field, value, min, max },
    });
  }
}

/** 존재하는 양력 날짜인지(달력 의미론)만 검사한다. 공개 범위는 검사하지 않는다. */
function validateCalendarDate(year: number, month: number, day: number): void {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    invalidInput('존재하지 않는 날짜입니다.', { year, month, day });
  }
}

/**
 * 존재하는 음력 날짜인지 검사한다.
 * - 음력 월은 1~12, 일은 1~30.
 * - 월의 실제 날수(29/30)는 음양력 변환 테이블(getLunarMonthDays)로 확인한다.
 * - isLeapMonth이면 해당 연도에 그 윤달이 실제로 존재해야 한다.
 * - 평달 월 자체가 테이블에 없으면 지원 범위 밖(OUT_OF_RANGE)이다.
 */
function validateLunarDate(year: number, month: number, day: number, isLeapMonth: boolean): void {
  if (month < 1 || month > 12 || day < 1 || day > 30) {
    invalidInput('존재하지 않는 음력 날짜입니다.', { year, month, day, isLeapMonth });
  }
  try {
    getLunarMonthDays(year, month, false);
  } catch (error) {
    if (error instanceof ManseryeokDataError) {
      throw new EngineContractError({
        code: 'OUT_OF_RANGE',
        message: `음력 ${year}년 ${month}월은 지원 범위에 없습니다.`,
        details: { year, month, isLeapMonth },
      });
    }
    throw error;
  }
  if (isLeapMonth) {
    try {
      getLunarMonthDays(year, month, true);
    } catch (error) {
      if (error instanceof ManseryeokDataError) {
        invalidInput(`음력 ${year}년 ${month}월은 윤달이 없습니다.`, { year, month, isLeapMonth });
      }
      throw error;
    }
  }
  const monthDays = getLunarMonthDays(year, month, isLeapMonth);
  if (day > monthDays) {
    invalidInput('존재하지 않는 음력 날짜입니다.', { year, month, day, isLeapMonth, monthDays });
  }
}

/**
 * RFC 3339 기준시각 검증.
 * "YYYY-MM-DDTHH:mm:ss" + "Z" 또는 명시적 ±HH:MM 오프셋만 허용한다.
 * Date.parse만으로는 "0", "2025-02-30", 타임존 없는 시각 등이 통과하므로
 * 형식과 실존 날짜·시각을 직접 검증한다.
 */
const RFC3339_RE =
  /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;

function requireNowString(value: unknown, field: string): void {
  if (typeof value !== 'string' || !RFC3339_RE.test(value)) {
    invalidInput(
      `${field}는 RFC 3339 형식(예: 2025-01-15T00:00:00Z 또는 2026-09-13T12:00:00+09:00)이어야 합니다.`,
      { field, value },
    );
  }
  const m = RFC3339_RE.exec(value as string)!;
  const [, year, month, day, hour, minute, second, , offset] = m;
  validateCalendarDate(Number(year), Number(month), Number(day));
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) {
    invalidInput(`${field}의 시각이 유효하지 않습니다.`, { field, value });
  }
  if (offset !== 'Z' && offset !== 'z') {
    const [offsetHour, offsetMinute] = offset.slice(1).split(':').map(Number);
    if (offsetHour > 23 || offsetMinute > 59) {
      invalidInput(`${field}의 UTC 오프셋이 유효하지 않습니다.`, { field, value });
    }
  }
  if (Number.isNaN(Date.parse(value as string))) {
    invalidInput(`${field}를 시각으로 해석할 수 없습니다.`, { field, value });
  }
}

/** 코어 역법 데이터가 커버하는 연도 범위(1899~2101)인지 검사한다. */
function validateDataYearRange(year: number, field = 'year'): void {
  if (year < MIN_DATA_YEAR || year > MAX_DATA_YEAR) {
    throw new EngineContractError({
      code: 'OUT_OF_RANGE',
      message: `${field}는 ${MIN_DATA_YEAR}~${MAX_DATA_YEAR} 범위여야 합니다.`,
      details: { field, value: year },
    });
  }
}

function validatePublicDate(year: number, month: number, day = 1): void {
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (iso < MIN_PUBLIC_DATE || year > MAX_PUBLIC_YEAR) {
    throw new EngineContractError({
      code: 'OUT_OF_RANGE',
      message: `지원 날짜는 ${MIN_PUBLIC_DATE}부터 ${MAX_PUBLIC_YEAR}년까지입니다.`,
      details: { year, month, day },
    });
  }
  validateCalendarDate(year, month, day);
}

/** "YYYY-MM-DD" 형식 문자열을 파싱해 실존 날짜인지 확인한다. */
function requireDateString(value: unknown, field: string): void {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    invalidInput(`${field}는 YYYY-MM-DD 형식이어야 합니다.`, { field, value });
  }
  const [year, month, day] = (value as string).split('-').map(Number);
  validateCalendarDate(year, month, day);
  validateDataYearRange(year, field);
}

/** 시/분 필드. null 허용 여부를 지정할 수 있다. */
function validateHourMinute(record: Record<string, unknown>, allowNull: boolean): void {
  for (const [field, min, max] of [['hour', 0, 23], ['minute', 0, 59]] as const) {
    const value = record[field];
    if (allowNull && value == null) continue;
    if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
      throw new EngineContractError({
        code: 'OUT_OF_RANGE',
        message: `${field}는 ${min}~${max} 범위의 정수${allowNull ? ' 또는 null' : ''}이어야 합니다.`,
        details: { field, value },
      });
    }
  }
}

function validateEnum(value: unknown, allowed: Set<string>, field: string): void {
  if (typeof value !== 'string' || !allowed.has(value)) {
    invalidInput(`${field} 값이 유효하지 않습니다.`, { field, value });
  }
}

function validateOptionalBoolean(record: Record<string, unknown>, field: string): void {
  const value = record[field];
  if (value !== undefined && typeof value !== 'boolean') {
    invalidInput(`${field}는 boolean이어야 합니다.`, { field, value });
  }
}

/** 사주 계산 옵션(calculateOptions) 검증. */
function validateCalculateOptions(value: unknown, field: string): void {
  if (value === undefined) return;
  if (!isRecord(value)) invalidInput(`${field}는 객체여야 합니다.`, { field });
  validateOptionalBoolean(value, 'trueSolarTime');
  if (value.longitude !== undefined) {
    if (typeof value.longitude !== 'number' || !Number.isFinite(value.longitude) || value.longitude < -180 || value.longitude > 180) {
      invalidInput(`${field}.longitude는 -180~180의 유한수여야 합니다.`, { field, value: value.longitude });
    }
  }
  if (value.midnightMode !== undefined) {
    validateEnum(value.midnightMode, VALID_MIDNIGHT_MODES, `${field}.midnightMode`);
  }
}

/** 출생정보(saju.birth, compatibility.personN) 공통 검증. */
function validatePerson(record: Record<string, unknown>, prefix: string): void {
  for (const field of ['year', 'month', 'day']) {
    requireFiniteInteger(record, field);
  }
  const year = record.year as number;
  const month = record.month as number;
  const day = record.day as number;
  validateDataYearRange(year, `${prefix}.year`);
  validateOptionalBoolean(record, 'isLunar');
  validateOptionalBoolean(record, 'isLeapMonth');
  const isLunar = record.isLunar === true;
  const isLeapMonth = record.isLeapMonth === true;
  if (isLunar) {
    validateLunarDate(year, month, day, isLeapMonth);
  } else {
    if (isLeapMonth) {
      invalidInput('양력 날짜에는 isLeapMonth를 적용할 수 없습니다.', { field: `${prefix}.isLeapMonth` });
    }
    validateCalendarDate(year, month, day);
  }
  validateHourMinute(record, true);
  validateEnum(record.gender, VALID_GENDERS, `${prefix}.gender`);
  if (record.birthPlace !== undefined && record.birthPlace !== null && typeof record.birthPlace !== 'string') {
    invalidInput(`${prefix}.birthPlace는 문자열 또는 null이어야 합니다.`);
  }
  validateCalculateOptions(record.calculateOptions, `${prefix}.calculateOptions`);
}

/** 팔자 입력(hongyeon/daejeong) 검증. 년·월·일주는 필수, 시주는 생략 가능. */
function validatePalja(record: Record<string, unknown>): void {
  const ganFields = ['yearGan', 'monthGan', 'dayGan', 'hourGan'] as const;
  const jiFields = ['yearJi', 'monthJi', 'dayJi', 'hourJi'] as const;

  for (const field of [...ganFields, ...jiFields]) {
    if (typeof record[field] !== 'string') {
      invalidInput(`팔자 ${field}는 문자열이어야 합니다.`, { field });
    }
  }
  for (const field of ganFields.slice(0, 3)) {
    if (!VALID_GAN.has(record[field] as string)) {
      invalidInput(`팔자 ${field}가 유효한 천간이 아닙니다.`, { field, value: record[field] });
    }
  }
  for (const field of jiFields.slice(0, 3)) {
    if (!VALID_JI.has(record[field] as string)) {
      invalidInput(`팔자 ${field}가 유효한 지지가 아닙니다.`, { field, value: record[field] });
    }
  }
  // 시주: 둘 다 비어있거나(시간미상) 둘 다 유효해야 한다
  const hourGan = record.hourGan as string;
  const hourJi = record.hourJi as string;
  if ((hourGan === '') !== (hourJi === '')) {
    invalidInput('팔자 시주는 천간과 지지를 함께 입력하거나 함께 비워야 합니다.', { hourGan, hourJi });
  }
  if (hourGan !== '' && (!VALID_GAN.has(hourGan) || !VALID_JI.has(hourJi))) {
    invalidInput('팔자 시주가 유효한 간지가 아닙니다.', { hourGan, hourJi });
  }
}

export function validateEngineModuleInput(moduleId: EngineModuleId, input: unknown): void {
  if (!isRecord(input)) {
    throw new EngineContractError({ code: 'INVALID_INPUT', message: '모듈 입력은 객체여야 합니다.' });
  }

  switch (moduleId) {
    case 'saju':
      if (!isRecord(input.birth)) {
        throw new EngineContractError({ code: 'INVALID_INPUT', message: '사주 입력의 birth가 필요합니다.' });
      }
      requireNowString(input.now, 'now');
      validatePerson(input.birth, 'birth');
      if (input.subSchool !== undefined) {
        validateEnum(input.subSchool, VALID_SUB_SCHOOLS, 'subSchool');
      }
      validateCalculateOptions(input.calculateOptions, 'calculateOptions');
      break;
    case 'compatibility':
      if (!isRecord(input.person1) || !isRecord(input.person2)) {
        throw new EngineContractError({ code: 'INVALID_INPUT', message: '궁합에는 두 사람의 입력이 필요합니다.' });
      }
      validatePerson(input.person1, 'person1');
      validatePerson(input.person2, 'person2');
      break;
    case 'ziwei': {
      const calendarType = String(input.calendarType);
      if (!['solar', 'lunar'].includes(calendarType) || typeof input.date !== 'string') {
        throw new EngineContractError({ code: 'INVALID_INPUT', message: '자미두수 날짜와 달력 구분이 필요합니다.' });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
        invalidInput('date는 YYYY-MM-DD 형식이어야 합니다.', { field: 'date', value: input.date });
      }
      validateOptionalBoolean(input, 'isLeapMonth');
      const [ziYear, ziMonth, ziDay] = input.date.split('-').map(Number);
      validateDataYearRange(ziYear, 'date');
      if (calendarType === 'lunar') {
        validateLunarDate(ziYear, ziMonth, ziDay, input.isLeapMonth === true);
      } else {
        if (input.isLeapMonth === true) {
          invalidInput('양력 날짜에는 isLeapMonth를 적용할 수 없습니다.', { field: 'isLeapMonth' });
        }
        validateCalendarDate(ziYear, ziMonth, ziDay);
      }
      requireIntegerInRange(input, 'hour', 0, 23);
      validateEnum(input.gender, VALID_GENDERS, 'gender');
      break;
    }
    case 'qimen':
    case 'daeyukim':
      if (typeof input.solarDate !== 'string') {
        throw new EngineContractError({ code: 'INVALID_INPUT', message: '양력 실행일이 필요합니다.' });
      }
      requireDateString(input.solarDate, 'solarDate');
      requireIntegerInRange(input, 'hour', 0, 23);
      break;
    case 'tojeong':
      for (const field of ['birthYear', 'birthMonth', 'birthDay', 'targetYear']) {
        requireFiniteInteger(input, field);
      }
      validateDataYearRange(input.birthYear as number, 'birthYear');
      requireIntegerInRange(input, 'birthMonth', 1, 12);
      requireIntegerInRange(input, 'birthDay', 1, 30);
      validateDataYearRange(input.targetYear as number, 'targetYear');
      if ((input.birthYear as number) > (input.targetYear as number)) {
        invalidInput('토정비결 생년은 대상 연도 이하여야 합니다.', { birthYear: input.birthYear, targetYear: input.targetYear });
      }
      break;
    case 'guseong':
      for (const field of ['birthYear', 'targetYear', 'targetMonth', 'targetDay']) {
        requireFiniteInteger(input, field);
      }
      validateCalendarDate(input.targetYear as number, input.targetMonth as number, input.targetDay as number);
      validateEnum(input.gender, VALID_GENDERS, 'gender');
      break;
    case 'harak':
      for (const field of ['year', 'month', 'day']) {
        requireFiniteInteger(input, field);
      }
      validateCalendarDate(input.year as number, input.month as number, input.day as number);
      break;
    case 'hongyeon':
    case 'daejeong':
      if (!isRecord(input.palja)) {
        throw new EngineContractError({ code: 'INVALID_INPUT', message: '팔자 입력이 필요합니다.' });
      }
      validatePalja(input.palja);
      break;
    case 'naming':
      if (typeof input.surname !== 'string' || input.surname.length === 0 || !Array.isArray(input.candidates)) {
        throw new EngineContractError({ code: 'INVALID_INPUT', message: '성과 이름 후보가 필요합니다.' });
      }
      if (input.candidates.length === 0) {
        invalidInput('이름 후보가 하나 이상 필요합니다.');
      }
      const surnameLen = [...(input.surname as string)].length;
      for (const candidate of input.candidates) {
        if (!isRecord(candidate) || typeof candidate.givenName !== 'string' || candidate.givenName.length === 0) {
          invalidInput('이름 후보에는 비어있지 않은 givenName이 필요합니다.');
        }
        if (candidate.hanjaChars !== undefined && candidate.hanjaChars !== null) {
          if (!Array.isArray(candidate.hanjaChars) || candidate.hanjaChars.some((c) => typeof c !== 'string')) {
            invalidInput('hanjaChars는 문자열 배열이어야 합니다.');
          }
          const expected = surnameLen + [...(candidate.givenName as string)].length;
          if ((candidate.hanjaChars as string[]).length !== expected) {
            invalidInput('hanjaChars 길이는 성+이름 글자 수와 일치해야 합니다.', {
              hanjaChars: candidate.hanjaChars,
              expected,
            });
          }
        }
      }
      if (input.school !== undefined && !['kangxi', 'modern'].includes(String(input.school))) {
        invalidInput('school은 kangxi 또는 modern이어야 합니다.', { value: input.school });
      }
      break;
    case 'maehwa':
      if (!['time', 'number', 'name'].includes(String(input.method))) {
        throw new EngineContractError({ code: 'INVALID_INPUT', message: '매화역수 입력 방식을 확인해 주세요.' });
      }
      if (input.method === 'time') {
        for (const field of ['year', 'month', 'day', 'hour']) {
          requireFiniteInteger(input, field);
        }
        validateCalendarDate(input.year as number, input.month as number, input.day as number);
        requireIntegerInRange(input, 'hour', 0, 23);
      } else if (input.method === 'number') {
        requireIntegerInRange(input, 'first', 1, Number.MAX_SAFE_INTEGER);
        requireIntegerInRange(input, 'second', 1, Number.MAX_SAFE_INTEGER);
      } else {
        requireIntegerInRange(input, 'surnameStrokes', 1, Number.MAX_SAFE_INTEGER);
        requireIntegerInRange(input, 'givenNameStrokes', 1, Number.MAX_SAFE_INTEGER);
      }
      break;
    case 'calendar':
      if (!['day', 'month'].includes(String(input.view))) {
        throw new EngineContractError({ code: 'INVALID_INPUT', message: '달력 보기 방식을 확인해 주세요.' });
      }
      requireFiniteInteger(input, 'year');
      requireFiniteInteger(input, 'month');
      if (input.view === 'day') requireFiniteInteger(input, 'day');
      validatePublicDate(input.year as number, input.month as number, input.view === 'day' ? input.day as number : 1);
      break;
    default:
      break;
  }
}
