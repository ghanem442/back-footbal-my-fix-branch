"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const qr_service_1 = require("./qr.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const validate_qr_dto_1 = require("./dto/validate-qr.dto");
const verify_booking_id_dto_1 = require("./dto/verify-booking-id.dto");
const prisma_service_1 = require("../prisma/prisma.service");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const client_2 = require("@prisma/client");
let QrController = class QrController {
    constructor(qrService, prisma) {
        this.qrService = qrService;
        this.prisma = prisma;
    }
    async validateQrCode(validateQrDto, user) {
        const { qrToken } = validateQrDto;
        const qrCode = await this.qrService.getQrCodeByToken(qrToken);
        if (!qrCode) {
            throw new common_1.NotFoundException('QR code not found');
        }
        if (qrCode.isUsed) {
            throw new common_1.BadRequestException('QR code has already been used');
        }
        const { booking } = qrCode;
        if (booking.status !== client_2.BookingStatus.CONFIRMED) {
            throw new common_1.BadRequestException(`Booking status is ${booking.status}, expected CONFIRMED`);
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduledDate = new Date(booking.scheduledDate);
        scheduledDate.setHours(0, 0, 0, 0);
        if (scheduledDate.getTime() !== today.getTime()) {
            throw new common_1.BadRequestException('Booking is not scheduled for today');
        }
        if (booking.field.ownerId !== user.userId) {
            throw new common_1.ForbiddenException('You do not have permission to validate this booking');
        }
        await this.prisma.booking.update({
            where: { id: booking.id },
            data: { status: client_2.BookingStatus.CHECKED_IN },
        });
        await this.prisma.bookingStatusHistory.create({
            data: {
                bookingId: booking.id,
                fromStatus: client_2.BookingStatus.CONFIRMED,
                toStatus: client_2.BookingStatus.CHECKED_IN,
                reason: 'QR code validated by field owner',
            },
        });
        await this.qrService.markQrCodeAsUsed(qrToken);
        return {
            success: true,
            message: 'Booking validated successfully',
            data: {
                bookingId: booking.id,
                status: client_2.BookingStatus.CHECKED_IN,
                playerName: booking.player.email,
                fieldName: booking.field.name,
                scheduledStartTime: booking.scheduledStartTime,
                scheduledEndTime: booking.scheduledEndTime,
            },
        };
    }
    async verifyBookingId(verifyBookingIdDto, user) {
        const { bookingId } = verifyBookingIdDto;
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                field: true,
                player: true,
            },
        });
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        if (booking.field.ownerId !== user.userId) {
            throw new common_1.ForbiddenException('You do not have permission to verify this booking');
        }
        if (booking.status !== client_2.BookingStatus.CONFIRMED) {
            throw new common_1.BadRequestException(`Booking status is ${booking.status}, expected CONFIRMED`);
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduledDate = new Date(booking.scheduledDate);
        scheduledDate.setHours(0, 0, 0, 0);
        if (scheduledDate.getTime() !== today.getTime()) {
            throw new common_1.BadRequestException('Booking is not scheduled for today');
        }
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: { status: client_2.BookingStatus.CHECKED_IN },
        });
        await this.prisma.bookingStatusHistory.create({
            data: {
                bookingId: booking.id,
                fromStatus: client_2.BookingStatus.CONFIRMED,
                toStatus: client_2.BookingStatus.CHECKED_IN,
                reason: 'Booking verified manually by field owner (booking ID)',
            },
        });
        return {
            success: true,
            message: 'Booking verified successfully',
            data: {
                bookingId: booking.id,
                status: client_2.BookingStatus.CHECKED_IN,
                playerName: booking.player.email,
                fieldName: booking.field.name,
                scheduledStartTime: booking.scheduledStartTime,
                scheduledEndTime: booking.scheduledEndTime,
            },
        };
    }
};
exports.QrController = QrController;
__decorate([
    (0, common_1.Post)('validate'),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, swagger_1.ApiOperation)({
        summary: 'Validate QR code',
        description: 'Field owners can scan and validate a booking QR code for check-in. Updates booking status to CHECKED_IN.',
    }),
    (0, swagger_1.ApiBody)({ type: validate_qr_dto_1.ValidateQrDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'QR code validated successfully',
        schema: {
            example: {
                success: true,
                message: 'Booking validated successfully',
                data: {
                    bookingId: 'bk_123abc',
                    status: 'CHECKED_IN',
                    playerName: 'player@example.com',
                    fieldName: 'Champions Field',
                    scheduledStartTime: '14:00:00',
                    scheduledEndTime: '16:00:00',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'QR code already used or booking not valid for today',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden - Can only validate bookings for own fields',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'QR code not found',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [validate_qr_dto_1.ValidateQrDto, Object]),
    __metadata("design:returntype", Promise)
], QrController.prototype, "validateQrCode", null);
__decorate([
    (0, common_1.Post)('verify-booking-id'),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, swagger_1.ApiOperation)({
        summary: 'Verify booking by ID',
        description: 'Field owners can manually verify a booking using booking ID when QR scanning is unavailable. Updates booking status to CHECKED_IN.',
    }),
    (0, swagger_1.ApiBody)({ type: verify_booking_id_dto_1.VerifyBookingIdDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Booking verified successfully',
        schema: {
            example: {
                success: true,
                message: 'Booking verified successfully',
                data: {
                    bookingId: 'bk_123abc',
                    status: 'CHECKED_IN',
                    playerName: 'player@example.com',
                    fieldName: 'Champions Field',
                    scheduledStartTime: '14:00:00',
                    scheduledEndTime: '16:00:00',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Booking not valid for today or status not CONFIRMED',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden - Can only verify bookings for own fields',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Booking not found',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_booking_id_dto_1.VerifyBookingIdDto, Object]),
    __metadata("design:returntype", Promise)
], QrController.prototype, "verifyBookingId", null);
exports.QrController = QrController = __decorate([
    (0, swagger_1.ApiTags)('QR Codes'),
    (0, common_1.Controller)('qr'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [qr_service_1.QrService,
        prisma_service_1.PrismaService])
], QrController);
//# sourceMappingURL=qr.controller.js.map