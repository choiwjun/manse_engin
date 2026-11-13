import type { CalculateOptions } from '@/engine/saju/calculator';
import type { BirthInputData, CalendarDay, MonthlyCalendar, SajuResult, SajuSubSchool } from '@/engine/types';
import type { EngineModuleId } from './module-id';

export type EngineWarningCode =
  | 'TIME_UNKNOWN'
  | 'PARTIAL_THREE_PILLARS'
  | 'SIMPLIFIED_FORMULA'
  | 'MISSING_OPTIONAL_DATA'
  | 'POLICY_ASSUMPTION';

export interface EngineWarning {
  code: EngineWarningCode;
  message: string;
  field?: string;
}

export type EngineContractErrorCode =
  | 'INVALID_MODULE'
  | 'INVALID_INPUT'
  | 'OUT_OF_RANGE'
  | 'AMBIGUOUS_CIVIL_TIME'
  | 'NONEXISTENT_CIVIL_TIME'
  | 'POLICY_ERROR'
  | 'DATA_MISSING'
  | 'ENGINE_EXECUTION_ERROR';

export interface EngineErrorPayload {
  code: EngineContractErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface EngineRunEnvelope<M extends EngineModuleId = EngineModuleId> {
  runId: string;
  moduleId: M;
  input: EngineModuleInputMap[M];
  normalizedInput: EngineModuleInputMap[M];
  result: EngineModuleResultMap[M];
  engineVersion: string;
  contractVersion: string;
  policyId: string;
  dataVersion: string;
  inputHash: string;
  calculatedAt: string;
  warnings: EngineWarning[];
}

export interface SajuModuleInput {
  birth: BirthInputData;
  calculateOptions?: CalculateOptions;
  now: string;
  subSchool?: SajuSubSchool;
}

export type CalendarModuleInput =
  | { view: 'day'; year: number; month: number; day: number }
  | { view: 'month'; year: number; month: number };

export interface EngineModuleInputMap {
  saju: SajuModuleInput;
  calendar: CalendarModuleInput;
}

export interface EngineModuleResultMap {
  saju: SajuResult;
  calendar: CalendarDay | MonthlyCalendar;
}

export interface ExecuteEngineModuleOptions {
  runId?: string;
  calculatedAt?: Date;
}
