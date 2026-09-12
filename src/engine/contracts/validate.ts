import { EngineContractError } from './error';
import type { EngineModuleId } from './module-id';

const MIN_PUBLIC_DATE = '1908-04-01';
const MAX_PUBLIC_YEAR = 2101;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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

function validatePublicDate(year: number, month: number, day = 1): void {
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (iso < MIN_PUBLIC_DATE || year > MAX_PUBLIC_YEAR) {
    throw new EngineContractError({
      code: 'OUT_OF_RANGE',
      message: `지원 날짜는 ${MIN_PUBLIC_DATE}부터 ${MAX_PUBLIC_YEAR}년까지입니다.`,
      details: { year, month, day },
    });
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    throw new EngineContractError({
      code: 'INVALID_INPUT',
      message: '존재하지 않는 날짜입니다.',
      details: { year, month, day },
    });
  }
}

export function validateEngineModuleInput(moduleId: EngineModuleId, input: unknown): void {
  if (!isRecord(input)) {
    throw new EngineContractError({ code: 'INVALID_INPUT', message: '모듈 입력은 객체여야 합니다.' });
  }

  switch (moduleId) {
    case 'saju':
      if (!isRecord(input.birth) || typeof input.now !== 'string' || Number.isNaN(Date.parse(input.now))) {
        throw new EngineContractError({ code: 'INVALID_INPUT', message: '사주 입력의 birth와 now가 필요합니다.' });
      }
      break;
    case 'compatibility':
      if (!isRecord(input.person1) || !isRecord(input.person2)) {
        throw new EngineContractError({ code: 'INVALID_INPUT', message: '궁합에는 두 사람의 입력이 필요합니다.' });
      }
      break;
    case 'ziwei':
      if (!['solar', 'lunar'].includes(String(input.calendarType)) || typeof input.date !== 'string') {
        throw new EngineContractError({ code: 'INVALID_INPUT', message: '자미두수 날짜와 달력 구분이 필요합니다.' });
      }
      requireFiniteInteger(input, 'hour');
      break;
    case 'qimen':
    case 'daeyukim':
      if (typeof input.solarDate !== 'string') {
        throw new EngineContractError({ code: 'INVALID_INPUT', message: '양력 실행일이 필요합니다.' });
      }
      requireFiniteInteger(input, 'hour');
      break;
    case 'tojeong':
      for (const field of ['birthYear', 'birthMonth', 'birthDay', 'targetYear']) {
        requireFiniteInteger(input, field);
      }
      break;
    case 'guseong':
      for (const field of ['birthYear', 'targetYear', 'targetMonth', 'targetDay']) {
        requireFiniteInteger(input, field);
      }
      break;
    case 'harak':
      for (const field of ['year', 'month', 'day']) {
        requireFiniteInteger(input, field);
      }
      break;
    case 'hongyeon':
    case 'daejeong':
      if (!isRecord(input.palja)) {
        throw new EngineContractError({ code: 'INVALID_INPUT', message: '팔자 입력이 필요합니다.' });
      }
      break;
    case 'naming':
      if (typeof input.surname !== 'string' || !Array.isArray(input.candidates)) {
        throw new EngineContractError({ code: 'INVALID_INPUT', message: '성과 이름 후보가 필요합니다.' });
      }
      break;
    case 'maehwa':
      if (!['time', 'number', 'name'].includes(String(input.method))) {
        throw new EngineContractError({ code: 'INVALID_INPUT', message: '매화역수 입력 방식을 확인해 주세요.' });
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
