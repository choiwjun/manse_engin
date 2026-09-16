export type PlatformErrorCode =
  | 'NOT_FOUND'
  | 'TENANT_MISMATCH'
  | 'INVALID_INPUT'
  | 'INVALID_TRANSITION'
  | 'MISSING_REASON'
  | 'CONFLICT'
  | 'IMMUTABLE'
  | 'BLOCKED_PHRASE'
  | 'UNREVIEWED_CONTENT'
  | 'STALE_SECTION'
  | 'NOT_PUBLISHED'
  | 'LINK_EXPIRED'
  | 'LINK_REVOKED';

export interface PlatformErrorPayload {
  code: PlatformErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export class PlatformError extends Error implements PlatformErrorPayload {
  readonly code: PlatformErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(payload: PlatformErrorPayload) {
    super(payload.message);
    this.name = 'PlatformError';
    this.code = payload.code;
    this.details = payload.details;
  }
}
