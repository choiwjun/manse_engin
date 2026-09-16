// src/platform 공개 표면 — 상담사 워크스페이스 도메인 코어 (순수 TS·무의존).
// docs/product-plan-counselor-workspace-2026-09-16.md §5.2/§6/§7.4 구현.

export * from './types';
export * from './errors';
export {
  SESSION_TRANSITIONS,
  APPOINTMENT_TRANSITIONS,
  PAYMENT_TRANSITIONS,
  REPORT_TRANSITIONS,
  canTransition,
  assertTransition,
} from './transitions';
export { stableStringify, sha256Hex, newId, newToken, deepClone } from './util';
export { createInMemoryStore } from './store';
export type {
  PlatformStore,
  RootEntityStore,
  EntityStore,
  ImmutableEntityStore,
  ShareLinkStore,
  IntakeLinkStore,
  PortalLinkStore,
} from './store';
export {
  createPlatform,
  finalDraftText,
  FORBIDDEN_CUSTOMER_PHRASES,
} from './service';
export type { Platform, PlatformDeps, AppointmentWarning, TimelineEntry, ClientTimeline } from './service';
