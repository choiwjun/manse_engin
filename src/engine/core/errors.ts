export type ManseryeokErrorCode =
  | 'MANSERYEOK_RANGE_ERROR'
  | 'MANSERYEOK_DATA_ERROR'
  | 'AMBIGUOUS_CIVIL_TIME'
  | 'NONEXISTENT_CIVIL_TIME'
  | 'MANSERYEOK_POLICY_ERROR';

export type ManseryeokErrorDetails = Record<string, unknown>;

export class ManseryeokError extends Error {
  readonly code: ManseryeokErrorCode;
  readonly details?: ManseryeokErrorDetails;

  constructor(message: string, code: ManseryeokErrorCode, details?: ManseryeokErrorDetails) {
    super(message);
    this.name = 'ManseryeokError';
    this.code = code;
    this.details = details;
  }
}

export class ManseryeokRangeError extends ManseryeokError {
  constructor(message: string, details?: ManseryeokErrorDetails) {
    super(message, 'MANSERYEOK_RANGE_ERROR', details);
    this.name = 'ManseryeokRangeError';
  }
}

export class ManseryeokDataError extends ManseryeokError {
  constructor(message: string, details?: ManseryeokErrorDetails) {
    super(message, 'MANSERYEOK_DATA_ERROR', details);
    this.name = 'ManseryeokDataError';
  }
}

export class AmbiguousCivilTimeError extends ManseryeokError {
  constructor(message: string, details?: ManseryeokErrorDetails) {
    super(message, 'AMBIGUOUS_CIVIL_TIME', details);
    this.name = 'AmbiguousCivilTimeError';
  }
}

export class NonexistentCivilTimeError extends ManseryeokError {
  constructor(message: string, details?: ManseryeokErrorDetails) {
    super(message, 'NONEXISTENT_CIVIL_TIME', details);
    this.name = 'NonexistentCivilTimeError';
  }
}

export class ManseryeokPolicyError extends ManseryeokError {
  constructor(message: string, details?: ManseryeokErrorDetails) {
    super(message, 'MANSERYEOK_POLICY_ERROR', details);
    this.name = 'ManseryeokPolicyError';
  }
}
