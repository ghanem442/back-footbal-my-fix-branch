import { Queue } from 'bullmq';
import { BookingTimeoutJobData, NoShowDetectionJobData } from './processors/bookings.processor';
import { ReminderNotificationJobData, BookingConfirmationJobData, CancellationNotificationJobData } from './processors/notifications.processor';
import { SlotGenerationJobData } from './processors/slots.processor';
export declare class JobsService {
    private readonly bookingsQueue;
    private readonly notificationsQueue;
    private readonly slotsQueue;
    private readonly logger;
    constructor(bookingsQueue: Queue, notificationsQueue: Queue, slotsQueue: Queue);
    scheduleBookingTimeout(data: BookingTimeoutJobData, delayMs?: number): Promise<void>;
    scheduleNoShowDetection(data: NoShowDetectionJobData, delayMs: number): Promise<void>;
    scheduleReminderNotification(data: ReminderNotificationJobData, delayMs: number): Promise<void>;
    sendBookingConfirmation(data: BookingConfirmationJobData): Promise<void>;
    sendCancellationNotification(data: CancellationNotificationJobData): Promise<void>;
    scheduleSlotGeneration(data: SlotGenerationJobData): Promise<void>;
    scheduleBulkSlotGeneration(data: SlotGenerationJobData): Promise<void>;
    removeJob(queueName: 'bookings' | 'notifications' | 'slots', jobId: string): Promise<void>;
}
