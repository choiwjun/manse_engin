import { getCalendarDay, getMonthlyCalendar } from '@/engine/calendar';
import { buildSajuResult } from '@/engine/saju/result-builder';
import { EngineContractError, normalizeEngineError } from './error';
import { createInputHash } from './hash';
import { isEngineModuleId, type EngineModuleId } from './module-id';
import type {
  EngineModuleInputMap,
  EngineModuleResultMap,
  EngineRunEnvelope,
  EngineWarning,
  ExecuteEngineModuleOptions,
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
  return warnings;
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
