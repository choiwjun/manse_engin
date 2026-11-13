import { ManseryeokError } from '@/engine/core/errors';
import type { EngineContractErrorCode, EngineErrorPayload } from './types';

const CORE_CODE_MAP: Record<string, EngineContractErrorCode> = {
  MANSERYEOK_RANGE_ERROR: 'OUT_OF_RANGE',
  AMBIGUOUS_CIVIL_TIME: 'AMBIGUOUS_CIVIL_TIME',
  NONEXISTENT_CIVIL_TIME: 'NONEXISTENT_CIVIL_TIME',
  MANSERYEOK_POLICY_ERROR: 'POLICY_ERROR',
  MANSERYEOK_DATA_ERROR: 'DATA_MISSING',
};

export class EngineContractError extends Error {
  readonly code: EngineContractErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(payload: EngineErrorPayload, options?: { cause?: unknown }) {
    super(payload.message, options);
    this.name = 'EngineContractError';
    this.code = payload.code;
    this.details = payload.details;
  }

  toPayload(): EngineErrorPayload {
    return { code: this.code, message: this.message, details: this.details };
  }
}

export function normalizeEngineError(error: unknown): EngineContractError {
  if (error instanceof EngineContractError) return error;
  if (error instanceof ManseryeokError) {
    return new EngineContractError(
      {
        code: CORE_CODE_MAP[error.code] ?? 'ENGINE_EXECUTION_ERROR',
        message: error.message,
        details: error.details,
      },
      { cause: error },
    );
  }
  if (error instanceof Error) {
    return new EngineContractError(
      { code: 'ENGINE_EXECUTION_ERROR', message: error.message },
      { cause: error },
    );
  }
  return new EngineContractError({
    code: 'ENGINE_EXECUTION_ERROR',
    message: '알 수 없는 엔진 오류가 발생했습니다.',
  });
}
