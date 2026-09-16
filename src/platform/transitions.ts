import { PlatformError } from './errors';
import type { AppointmentStatus, PaymentStatus, ReportStatus, SessionStatus } from './types';

// §5.2 상태기계 — 선언된 전이 외에는 INVALID_TRANSITION.

export const SESSION_TRANSITIONS: Record<SessionStatus, readonly SessionStatus[]> = {
  planned: ['prepared', 'archived'],
  prepared: ['in_progress', 'archived'],
  in_progress: ['review'],
  review: ['delivered', 'in_progress'],
  delivered: ['archived'],
  archived: [],
};

export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  unpaid: ['recorded'],
  recorded: ['refunded'],
  refunded: [],
};

export const REPORT_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  draft: ['published'],
  published: ['revoked'],
  revoked: [],
};

type StatusOf = {
  session: SessionStatus;
  appointment: AppointmentStatus;
  payment: PaymentStatus;
  report: ReportStatus;
};

const MACHINES: { [K in keyof StatusOf]: Record<StatusOf[K], readonly StatusOf[K][]> } = {
  session: SESSION_TRANSITIONS,
  appointment: APPOINTMENT_TRANSITIONS,
  payment: PAYMENT_TRANSITIONS,
  report: REPORT_TRANSITIONS,
};

export function canTransition<K extends keyof StatusOf>(
  kind: K,
  from: StatusOf[K],
  to: StatusOf[K],
): boolean {
  return MACHINES[kind][from].includes(to);
}

export function assertTransition<K extends keyof StatusOf>(
  kind: K,
  from: StatusOf[K],
  to: StatusOf[K],
): void {
  if (!canTransition(kind, from, to)) {
    throw new PlatformError({
      code: 'INVALID_TRANSITION',
      message: `${kind} 상태를 ${from}에서 ${to}(으)로 바꿀 수 없습니다.`,
      details: { kind, from, to },
    });
  }
}
