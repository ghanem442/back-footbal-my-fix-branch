"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_TRANSITIONS = void 0;
exports.isValidTransition = isValidTransition;
exports.validateTransition = validateTransition;
exports.getNextStatuses = getNextStatuses;
exports.isTerminalStatus = isTerminalStatus;
const common_1 = require("@nestjs/common");
exports.VALID_TRANSITIONS = {
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
function isValidTransition(fromStatus, toStatus) {
    const allowedTransitions = exports.VALID_TRANSITIONS[fromStatus] ?? [];
    return allowedTransitions.includes(toStatus);
}
function validateTransition(fromStatus, toStatus) {
    if (!isValidTransition(fromStatus, toStatus)) {
        throw new common_1.BadRequestException(`Invalid status transition from ${fromStatus} to ${toStatus}`);
    }
}
function getNextStatuses(status) {
    return exports.VALID_TRANSITIONS[status] ?? [];
}
function isTerminalStatus(status) {
    return (exports.VALID_TRANSITIONS[status] ?? []).length === 0;
}
//# sourceMappingURL=booking-state-machine.js.map