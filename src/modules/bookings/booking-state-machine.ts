import { BadRequestException } from '@nestjs/common';

type AnyBookingStatus = string;

/**
 * Valid booking status transitions
 */
export const VALID_TRANSITIONS: Record<AnyBookingStatus, AnyBookingStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'PAYMENT_FAILED', 'CANCELLED', 'CANCELLED_REFUNDED', 'CANCELLED_NO_REFUND'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW', 'CANCELLED_REFUNDED', 'CANCELLED_NO_REFUND', 'PLAYED', 'EXPIRED_NO_SHOW'],
  CHECKED_IN: ['COMPLETED', 'PLAYED'],
  COMPLETED: [],
  CANCELLED: [],
  CANCELLED_REFUNDED: [],
  CANCELLED_NO_REFUND: [],
  PAYMENT_FAILED: [],
  NO_SHOW: [],
  PLAYED: [],
  EXPIRED_NO_SHOW: [],
};

/**
 * Validate if a status transition is allowed
 */
export function isValidTransition(
  fromStatus: string,
  toStatus: string,
): boolean {
  const allowedTransitions = VALID_TRANSITIONS[fromStatus] ?? [];
  return allowedTransitions.includes(toStatus);
}

/**
 * Validate and throw error if transition is invalid
 */
export function validateTransition(
  fromStatus: string,
  toStatus: string,
): void {
  if (!isValidTransition(fromStatus, toStatus)) {
    throw new BadRequestException(
      `Invalid status transition from ${fromStatus} to ${toStatus}`,
    );
  }
}

/**
 * Get all possible next statuses for a given status
 */
export function getNextStatuses(status: string): string[] {
  return VALID_TRANSITIONS[status] ?? [];
}

/**
 * Check if a status is terminal (no further transitions possible)
 */
export function isTerminalStatus(status: string): boolean {
  return (VALID_TRANSITIONS[status] ?? []).length === 0;
}
