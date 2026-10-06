import { calculateCompatibility } from '@/engine/compatibility';
import { getCalendarDay, getMonthlyCalendar } from '@/engine/calendar';
import { calculateDaejeong } from '@/engine/daejeong';
import { calculateDaeyukim } from '@/engine/daeyukim';
import { calculateGuseong } from '@/engine/guseong';
import { calculateHarak } from '@/engine/harak';
import { analyzeHongyeon } from '@/engine/hongyeon';
import { divineByName, divineByNumber, divineByTime } from '@/engine/maehwa';
import { analyzeNamesExtended } from '@/engine/naming';
import { recommendNames } from '@/engine/naming/recommend';
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
  if (moduleId === 'compatibility') {
    const value = input as EngineModuleInputMap['compatibility'];
    for (const key of ['person1', 'person2'] as const) {
      const person = value[key];
      if (person.hour == null || person.minute == null) {
        warnings.push({
          code: 'TIME_UNKNOWN',
          field: `${key}.hour`,
          message: `${key} 출생시각 미상: 3주(6글자) 기준으로 궁합을 산출합니다.`,
        });
      }
    }
  }
  if (moduleId === 'hongyeon' || moduleId === 'daejeong') {
    const palja = (input as EngineModuleInputMap['hongyeon']).palja;
    if (!palja.hourGan && !palja.hourJi) {
      warnings.push({
        code: 'PARTIAL_THREE_PILLARS',
        field: 'palja.hourGan',
        message: '시주가 없는 3주(6글자) 입력으로 계산했습니다.',
      });
    }
  }
  if (moduleId === 'guseong') {
    warnings.push({
      code: 'POLICY_ASSUMPTION',
      message: '구성 일반(日盤)은 동지·하지에 가장 가까운 갑자일을 기점으로 양둔 순행·음둔 역행하는 일원갑자법 기준입니다.',
    });
  }
  if (moduleId === 'qimen') {
    warnings.push({
      code: 'SIMPLIFIED_FORMULA',
      message: '기문 원(元)은 일간지 부두(符頭)법으로 판별하며, 부기·체용 해석은 단일 참조 학파 기준입니다.',
    });
  }
  if (moduleId === 'daeyukim') {
    warnings.push({
      code: 'SIMPLIFIED_FORMULA',
      message: '대육임은 구종문(九宗門) 발용법을 따르되, 팔전·별책·묘성 등 일부 무적극 특수과의 초전은 제1과 상신으로 둡니다.',
    });
  }
  if (moduleId === 'ziwei') {
    warnings.push({
      code: 'POLICY_ASSUMPTION',
      message: '자미두수 사화(四化) 테이블과 일부 유성 배치는 유파별 상이하며, 본 구현은 단일 참조 학파 기준입니다.',
    });
  }
  if (moduleId === 'harak') {
    warnings.push({
      code: 'SIMPLIFIED_FORMULA',
      message: '하락리수의 하도수→팔괘·낙서수→팔괘 매핑은 단일 참조 학파 기준이며, 년간지는 입춘이 아닌 역년(曆年) 기준입니다.',
    });
  }
  if (moduleId === 'naming') {
    warnings.push({ code: 'POLICY_ASSUMPTION', message: '원형이정은 실획수 사격, 오격은 가성수 별도 규칙입니다. 획수 출처와 자원오행 유파·인명 허용 여부를 확인하세요.' });
    const value = input as EngineModuleInputMap['naming'];
    if (value.mode === 'recommend' && (value.birth.hour == null || value.birth.minute == null)) warnings.push({ code: 'TIME_UNKNOWN', message: '출생시각 미상: 용신과 작명 추천은 잠정값입니다.' });
    if (value.mode !== 'recommend' && value.candidates.some(c => !c.hanjaChars?.length)) warnings.push({ code: 'MISSING_OPTIONAL_DATA', message: '한자 미입력 후보는 한글 획수 분석입니다. 한자 강희자전 결과와 구별하세요.' });
  }
  if (moduleId === 'tojeong') {
    warnings.push({
      code: 'POLICY_ASSUMPTION',
      message: '토정비결은 상·중·하 144괘를 개인별로 계산합니다. 대상 생월은 평달 기준이며 소월의 30일 생일은 29일로 당깁니다. 해설 원문 대응은 미검증으로 제공하지 않습니다.',
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
      return analyzeTojeong(value.birthYear, value.birthMonth, value.birthDay, value.targetYear, value) as EngineModuleResultMap[M];
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
      if (value.mode === 'recommend') return recommendNames(value) as EngineModuleResultMap[M];
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
