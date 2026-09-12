import { calculateCompatibility } from '@/engine/compatibility';
import { getCalendarDay, getMonthlyCalendar } from '@/engine/calendar';
import { calculateDaejeong } from '@/engine/daejeong';
import { calculateDaeyukim } from '@/engine/daeyukim';
import { calculateGuseong } from '@/engine/guseong';
import { calculateHarak } from '@/engine/harak';
import { analyzeHongyeon } from '@/engine/hongyeon';
import { divineByName, divineByNumber, divineByTime } from '@/engine/maehwa';
import { analyzeNamesExtended } from '@/engine/naming';
import { calculateQimen } from '@/engine/qimen';
import { buildSajuResult } from '@/engine/saju/result-builder';
import { analyzeTojeong } from '@/engine/tojeong';
import { calculateZiwei, calculateZiweiByLunar } from '@/engine/ziwei';
import { EngineContractError, normalizeEngineError } from './error';
import { createInputHash } from './hash';
import { isEngineModuleId, type EngineModuleId } from './module-id';
import type {
  EngineModuleInputMap,
  EngineModuleResultMap,
  EngineRunEnvelope,
  EngineWarning,
  ExecuteEngineModuleOptions,
  MaehwaModuleInput,
} from './types';
import { validateEngineModuleInput } from './validate';
import {
  ENGINE_CONTRACT_VERSION,
  ENGINE_DATA_VERSION,
  ENGINE_POLICY_ID,
  ENGINE_VERSION,
} from './version';

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createRunId(): string {
  return globalThis.crypto.randomUUID();
}

function collectWarnings<M extends EngineModuleId>(moduleId: M, input: EngineModuleInputMap[M]): EngineWarning[] {
  const warnings: EngineWarning[] = [];
  if (moduleId === 'saju') {
    const birth = (input as EngineModuleInputMap['saju']).birth;
    if (birth.hour == null || birth.minute == null) {
      warnings.push({
        code: 'TIME_UNKNOWN',
        field: 'birth.hour',
        message: '출생시각 미상: 시주는 생략하고 정오를 대표 시각으로 사용합니다. 절기 경계의 년·월주와 대운 시작 시점은 잠정값입니다.',
      });
    }
  }
  if (moduleId === 'guseong') {
    warnings.push({
      code: 'SIMPLIFIED_FORMULA',
      message: '구성 월반·일반 공식은 전문가 교차 검증이 필요한 상태입니다.',
    });
  }
  return warnings;
}

function executeMaehwa(input: MaehwaModuleInput) {
  if (input.method === 'time') return divineByTime(input.year, input.month, input.day, input.hour);
  if (input.method === 'number') return divineByNumber(input.first, input.second);
  return divineByName(input.surnameStrokes, input.givenNameStrokes);
}

function executeUnsafe<M extends EngineModuleId>(moduleId: M, input: EngineModuleInputMap[M]): EngineModuleResultMap[M] {
  switch (moduleId) {
    case 'saju': {
      const value = input as EngineModuleInputMap['saju'];
      return buildSajuResult(value.birth, {
        calculateOptions: value.calculateOptions,
        now: new Date(value.now),
        subSchool: value.subSchool,
      }) as EngineModuleResultMap[M];
    }
    case 'compatibility':
      return calculateCompatibility(input as EngineModuleInputMap['compatibility']) as EngineModuleResultMap[M];
    case 'tojeong': {
      const value = input as EngineModuleInputMap['tojeong'];
      return analyzeTojeong(value.birthYear, value.birthMonth, value.birthDay, value.targetYear) as EngineModuleResultMap[M];
    }
    case 'ziwei': {
      const value = input as EngineModuleInputMap['ziwei'];
      return (value.calendarType === 'lunar'
        ? calculateZiweiByLunar(value.date, value.hour, value.gender, value.isLeapMonth ?? false)
        : calculateZiwei(value.date, value.hour, value.gender)) as EngineModuleResultMap[M];
    }
    case 'qimen': {
      const value = input as EngineModuleInputMap['qimen'];
      return calculateQimen(value.solarDate, value.hour) as EngineModuleResultMap[M];
    }
    case 'daeyukim': {
      const value = input as EngineModuleInputMap['daeyukim'];
      return calculateDaeyukim(value.solarDate, value.hour) as EngineModuleResultMap[M];
    }
    case 'guseong': {
      const value = input as EngineModuleInputMap['guseong'];
      return calculateGuseong(value.birthYear, value.gender, value.targetYear, value.targetMonth, value.targetDay) as EngineModuleResultMap[M];
    }
    case 'hongyeon':
      return analyzeHongyeon((input as EngineModuleInputMap['hongyeon']).palja) as EngineModuleResultMap[M];
    case 'maehwa':
      return executeMaehwa(input as EngineModuleInputMap['maehwa']) as EngineModuleResultMap[M];
    case 'harak': {
      const value = input as EngineModuleInputMap['harak'];
      return calculateHarak(value.year, value.month, value.day) as EngineModuleResultMap[M];
    }
    case 'daejeong':
      return calculateDaejeong((input as EngineModuleInputMap['daejeong']).palja) as EngineModuleResultMap[M];
    case 'naming': {
      const value = input as EngineModuleInputMap['naming'];
      return analyzeNamesExtended(value.surname, value.candidates, value.school) as EngineModuleResultMap[M];
    }
    case 'calendar': {
      const value = input as EngineModuleInputMap['calendar'];
      return (value.view === 'day'
        ? getCalendarDay(value.year, value.month, value.day)
        : getMonthlyCalendar(value.year, value.month)) as EngineModuleResultMap[M];
    }
    default:
      throw new EngineContractError({ code: 'INVALID_MODULE', message: `지원하지 않는 모듈: ${moduleId}` });
  }
}

export async function executeEngineModule<M extends EngineModuleId>(
  moduleId: M,
  input: EngineModuleInputMap[M],
  options: ExecuteEngineModuleOptions = {},
): Promise<EngineRunEnvelope<M>> {
  try {
    validateEngineModuleInput(moduleId, input);
    const normalizedInput = cloneJson(input);
    const result = executeUnsafe(moduleId, normalizedInput);
    return {
      runId: options.runId ?? createRunId(),
      moduleId,
      input: cloneJson(input),
      normalizedInput,
      result,
      engineVersion: ENGINE_VERSION,
      contractVersion: ENGINE_CONTRACT_VERSION,
      policyId: ENGINE_POLICY_ID,
      dataVersion: ENGINE_DATA_VERSION,
      inputHash: await createInputHash({ moduleId, input: normalizedInput }),
      calculatedAt: (options.calculatedAt ?? new Date()).toISOString(),
      warnings: collectWarnings(moduleId, normalizedInput),
    };
  } catch (error) {
    throw normalizeEngineError(error);
  }
}

export async function executeEngineModuleById(
  moduleId: string,
  input: unknown,
  options: ExecuteEngineModuleOptions = {},
): Promise<EngineRunEnvelope> {
  if (!isEngineModuleId(moduleId)) {
    throw new EngineContractError({
      code: 'INVALID_MODULE',
      message: `지원하지 않는 모듈: ${moduleId}`,
      details: { moduleId },
    });
  }
  validateEngineModuleInput(moduleId, input);
  return executeEngineModule(
    moduleId,
    input as EngineModuleInputMap[typeof moduleId],
    options,
  ) as Promise<EngineRunEnvelope>;
}
