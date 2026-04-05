"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodes = void 0;
exports.ErrorCodes = {
    EMAIL_NOT_VERIFIED: {
        code: 'EMAIL_NOT_VERIFIED',
        httpStatus: 400,
        message: {
            en: 'Please verify your email to continue',
            ar: 'يرجى التحقق من بريدك الإلكتروني للمتابعة',
        },
        action: 'VERIFY_EMAIL',
        resendEndpoint: '/auth/resend-verification',
    },
    PAYMENT_ALREADY_COMPLETED: {
        code: 'PAYMENT_ALREADY_COMPLETED',
        httpStatus: 400,
        message: {
            en: 'Payment has already been completed',
            ar: 'تم إتمام الدفع بالفعل',
        },
    },
    INSUFFICIENT_BALANCE: {
        code: 'INSUFFICIENT_BALANCE',
        httpStatus: 400,
        message: {
            en: 'Insufficient wallet balance',
            ar: 'رصيد المحفظة غير كافٍ',
        },
    },
    PAYMENT_DEADLINE_EXPIRED: {
        code: 'PAYMENT_DEADLINE_EXPIRED',
        httpStatus: 400,
        message: {
            en: 'Payment deadline has expired',
            ar: 'انتهى الموعد النهائي للدفع',
        },
    },
    INVALID_BOOKING_STATUS: {
        code: 'INVALID_BOOKING_STATUS',
        httpStatus: 400,
        message: {
            en: 'Booking is not in a valid status for payment',
            ar: 'الحجز ليس في حالة صالحة للدفع',
        },
    },
    BOOKING_NOT_FOUND: {
        code: 'BOOKING_NOT_FOUND',
        httpStatus: 404,
        message: {
            en: 'Booking not found',
            ar: 'الحجز غير موجود',
        },
    },
    INVALID_CREDENTIALS: {
        code: 'INVALID_CREDENTIALS',
        httpStatus: 401,
        message: {
            en: 'Invalid email or password',
            ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        },
    },
    UNAUTHORIZED: {
        code: 'UNAUTHORIZED',
        httpStatus: 401,
        message: {
            en: 'Unauthorized access',
            ar: 'وصول غير مصرح به',
        },
    },
    FORBIDDEN: {
        code: 'FORBIDDEN',
        httpStatus: 403,
        message: {
            en: 'You do not have permission to perform this action',
            ar: 'ليس لديك صلاحية لتنفيذ هذا الإجراء',
        },
    },
    EMAIL_ALREADY_EXISTS: {
        code: 'EMAIL_ALREADY_EXISTS',
        httpStatus: 409,
        message: {
            en: 'An account with this email already exists',
            ar: 'يوجد حساب بهذا البريد الإلكتروني بالفعل',
        },
    },
};
//# sourceMappingURL=error-codes.js.map