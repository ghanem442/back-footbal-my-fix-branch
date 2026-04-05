/**
 * Queue names for BullMQ job processing
 */
export const QUEUE_NAMES = {
  BOOKINGS: 'bookings',
  NOTIFICATIONS: 'notifications',
  SLOTS: 'slots',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
