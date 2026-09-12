import type { CalculateOptions } from '@/engine/saju/calculator';
import type { CompatibilityInput, CompatibilityResult } from '@/engine/compatibility/types';
import type {
  BirthInputData,
  CalendarDay,
  DaejeongResult,
  DaeyukimResult,
  Gender,
  GuseongResult,
  HarakResult,
  MonthlyCalendar,
  NamingResultExtended,
  Palja,
  QimenResult,
  SajuResult,
  SajuSubSchool,
  TojeongResult,
  ZiweiResult,
} from '@/engine/types';
import type { MaehwaResult } from '@/engine/maehwa';
import type { HongyeonResult } from '@/engine/hongyeon';
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

export interface TojeongModuleInput {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  targetYear: number;
}

export interface ZiweiModuleInput {
  calendarType: 'solar' | 'lunar';
  date: string;
  hour: number;
  gender: Gender;
  isLeapMonth?: boolean;
}

export interface DateHourModuleInput {
  solarDate: string;
  hour: number;
}

export interface GuseongModuleInput {
  birthYear: number;
  gender: Gender;
  targetYear: number;
  targetMonth: number;
  targetDay: number;
}

export interface PaljaModuleInput {
  palja: Palja;
}

export type MaehwaModuleInput =
  | { method: 'time'; year: number; month: number; day: number; hour: number }
  | { method: 'number'; first: number; second: number }
  | { method: 'name'; surnameStrokes: number; givenNameStrokes: number };

export interface HarakModuleInput {
  year: number;
  month: number;
  day: number;
}

export interface NamingModuleInput {
  surname: string;
  candidates: Array<{ givenName: string; hanjaChars?: string[] | null }>;
  school?: 'kangxi' | 'modern';
}

export type CalendarModuleInput =
  | { view: 'day'; year: number; month: number; day: number }
  | { view: 'month'; year: number; month: number };

export interface EngineModuleInputMap {
  saju: SajuModuleInput;
  compatibility: CompatibilityInput;
  tojeong: TojeongModuleInput;
  ziwei: ZiweiModuleInput;
  qimen: DateHourModuleInput;
  daeyukim: DateHourModuleInput;
  guseong: GuseongModuleInput;
  hongyeon: PaljaModuleInput;
  maehwa: MaehwaModuleInput;
  harak: HarakModuleInput;
  daejeong: PaljaModuleInput;
  naming: NamingModuleInput;
  calendar: CalendarModuleInput;
}

export interface EngineModuleResultMap {
  saju: SajuResult;
  compatibility: CompatibilityResult;
  tojeong: TojeongResult;
  ziwei: ZiweiResult;
  qimen: QimenResult;
  daeyukim: DaeyukimResult;
  guseong: GuseongResult;
  hongyeon: HongyeonResult;
  maehwa: MaehwaResult;
  harak: HarakResult;
  daejeong: DaejeongResult;
  naming: NamingResultExtended;
  calendar: CalendarDay | MonthlyCalendar;
}

export interface ExecuteEngineModuleOptions {
  runId?: string;
  calculatedAt?: Date;
}
