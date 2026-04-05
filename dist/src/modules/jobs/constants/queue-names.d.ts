export declare const QUEUE_NAMES: {
    readonly BOOKINGS: "bookings";
    readonly NOTIFICATIONS: "notifications";
    readonly SLOTS: "slots";
};
export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
