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
exports.BookingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const bookings_service_1 = require("./bookings.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const qr_service_1 = require("../qr/qr.service");
let BookingsController = class BookingsController {
    constructor(bookingsService, qrService) {
        this.bookingsService = bookingsService;
        this.qrService = qrService;
    }
    async createBooking(req, dto) {
        return this.bookingsService.createBooking(req.user.userId, dto);
    }
    async getUserBookings(req, status, fieldId, startDate, endDate, page, limit) {
        return this.bookingsService.getUserBookings(req.user.userId, {
            status,
            fieldId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page,
            limit,
        });
    }
    async getMyBookings(req, category, page, limit) {
        const statusMap = {
            upcoming: [client_1.BookingStatus.CONFIRMED, client_1.BookingStatus.PENDING_PAYMENT],
            cancelled: [client_1.BookingStatus.CANCELLED, client_1.BookingStatus.CANCELLED_REFUNDED, client_1.BookingStatus.CANCELLED_NO_REFUND],
            played: [client_1.BookingStatus.PLAYED, client_1.BookingStatus.CHECKED_IN, client_1.BookingStatus.COMPLETED],
            expired: [client_1.BookingStatus.EXPIRED_NO_SHOW, client_1.BookingStatus.PAYMENT_FAILED, client_1.BookingStatus.NO_SHOW],
        };
        const statuses = category && statusMap[category] ? statusMap[category] : undefined;
        return this.bookingsService.getUserBookings(req.user.userId, {
            statuses,
            page,
            limit,
        });
    }
    async getOwnerBookings(req, queryDto) {
        const result = await this.bookingsService.getOwnerBookings(req.user.userId, {
            fieldId: queryDto.fieldId,
            status: queryDto.status,
            startDate: queryDto.startDate ? new Date(queryDto.startDate) : undefined,
            endDate: queryDto.endDate ? new Date(queryDto.endDate) : undefined,
            page: queryDto.page,
            limit: queryDto.limit,
        });
        return {
            success: true,
            data: result,
            message: {
                en: 'Owner bookings retrieved successfully',
                ar: 'تم جلب حجوزات المالك بنجاح',
            },
            timestamp: new Date().toISOString(),
        };
    }
    async getBookingById(req, id) {
        return this.bookingsService.getBookingById(id, req.user.userId);
    }
    async cancelBooking(req, id, dto) {
        const result = await this.bookingsService.cancelBooking(id, req.user.userId, dto.reason);
        return {
            success: true,
            data: {
                booking: result.booking,
                refund: {
                    amount: result.refundAmount,
                    percentage: result.refundPercentage,
                },
            },
            message: {
                en: `Booking cancelled successfully. Refund: ${result.refundPercentage}%`,
                ar: `تم إلغاء الحجز بنجاح. المبلغ المسترد: ${result.refundPercentage}%`,
            },
        };
    }
    async markNoShow(req, id) {
        const ownerId = req.user.sub;
        const booking = await this.bookingsService.markNoShow(id, ownerId);
        const player = await this.bookingsService['prisma'].user.findUnique({
            where: { id: booking.playerId },
            select: {
                noShowCount: true,
                suspendedUntil: true,
            },
        });
        const isSuspended = player?.suspendedUntil ? player.suspendedUntil > new Date() : false;
        return {
            success: true,
            data: {
                booking: {
                    id: booking.id,
                    status: booking.status,
                },
                player: {
                    noShowCount: player?.noShowCount || 0,
                    isSuspended,
                    suspendedUntil: player?.suspendedUntil || null,
                },
            },
            message: {
                en: isSuspended
                    ? 'Booking marked as no-show. Player has been suspended.'
                    : 'Booking marked as no-show',
                ar: isSuspended
                    ? 'تم تحديد الحجز كعدم حضور. تم إيقاف اللاعب.'
                    : 'تم تحديد الحجز كعدم حضور',
            },
        };
    }
    async getBookingQrCode(req, id) {
        const booking = await this.bookingsService.getBookingById(id, req.user.userId);
        if (!booking) {
            throw new common_1.NotFoundException('Booking not found');
        }
        if (booking.playerId !== req.user.userId) {
            throw new common_1.ForbiddenException('You do not have permission to access this QR code');
        }
        const qrCode = await this.qrService.getQrCodeByBookingId(id);
        if (!qrCode) {
            throw new common_1.NotFoundException('QR code not found for this booking');
        }
        return {
            success: true,
            data: {
                qrToken: qrCode.qrToken,
                imageUrl: qrCode.imageUrl,
                isUsed: qrCode.isUsed,
                usedAt: qrCode.usedAt,
            },
        };
    }
};
exports.BookingsController = BookingsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.PLAYER),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a booking',
        description: 'Players can create a booking for an available time slot. Booking will be in PENDING_PAYMENT status with 15-minute payment deadline.',
    }),
    (0, swagger_1.ApiBody)({ type: dto_1.CreateBookingDto }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Booking created successfully',
        schema: {
            example: {
                success: true,
                data: {
                    id: 'bk_123abc',
                    timeSlotId: '123e4567-e89b-12d3-a456-426614174000',
                    status: 'PENDING_PAYMENT',
                    totalPrice: 200.00,
                    depositAmount: 50.00,
                    paymentDeadline: '2024-01-15T10:45:00Z',
                },
                message: {
                    en: 'Booking created successfully',
                    ar: 'تم إنشاء الحجز بنجاح',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Time slot not available or invalid',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden - Only players can create bookings',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateBookingDto]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "createBooking", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('fieldId')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('page', new common_1.ParseIntPipe({ optional: true }))),
    __param(6, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getUserBookings", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, swagger_1.ApiOperation)({ summary: 'Get my bookings grouped by category' }),
    (0, swagger_1.ApiQuery)({ name: 'category', required: false, enum: ['upcoming', 'cancelled', 'played', 'expired', 'all'] }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('category')),
    __param(2, (0, common_1.Query)('page', new common_1.ParseIntPipe({ optional: true }))),
    __param(3, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getMyBookings", null);
__decorate([
    (0, common_1.Get)('owner'),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, swagger_1.ApiOperation)({
        summary: 'Get bookings for field owner',
        description: 'Field owners can retrieve all bookings for their fields with player information, payment status, and QR code details.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'fieldId',
        required: false,
        description: 'Filter by specific field ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'status',
        required: false,
        enum: client_1.BookingStatus,
        description: 'Filter by booking status',
        example: 'CONFIRMED',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'startDate',
        required: false,
        description: 'Filter bookings from this date (ISO 8601)',
        example: '2024-01-15T00:00:00Z',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'endDate',
        required: false,
        description: 'Filter bookings until this date (ISO 8601)',
        example: '2024-01-20T23:59:59Z',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'page',
        required: false,
        description: 'Page number (default: 1)',
        example: 1,
    }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        description: 'Items per page (default: 10, max: 100)',
        example: 20,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Owner bookings retrieved successfully',
        schema: {
            example: {
                success: true,
                data: {
                    bookings: [
                        {
                            id: 'bk_123abc456def',
                            fieldId: 'field_uuid_here',
                            fieldName: 'Champions Field',
                            fieldNameAr: 'ملعب الأبطال',
                            playerId: 'player_uuid_here',
                            playerName: 'John Doe',
                            email: 'player@example.com',
                            phone: '+201234567890',
                            scheduledDate: '2024-01-20T00:00:00.000Z',
                            scheduledStartTime: '1970-01-01T16:00:00.000Z',
                            scheduledEndTime: '1970-01-01T17:30:00.000Z',
                            status: 'CONFIRMED',
                            paymentStatus: 'COMPLETED',
                            depositAmount: 40.00,
                            remainingAmount: 160.00,
                            totalPrice: 200.00,
                            isCheckedIn: false,
                            checkedInAt: null,
                            hasQr: true,
                            qrToken: 'qr_abc123xyz',
                            createdAt: '2024-01-15T10:30:00.000Z',
                            updatedAt: '2024-01-15T10:35:00.000Z',
                        },
                    ],
                    pagination: {
                        total: 1,
                        page: 1,
                        limit: 10,
                        totalPages: 1,
                    },
                },
                message: {
                    en: 'Owner bookings retrieved successfully',
                    ar: 'تم جلب حجوزات المالك بنجاح',
                },
                timestamp: '2024-01-15T10:30:00.000Z',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden - Only field owners can access this endpoint',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.QueryOwnerBookingsDto]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getOwnerBookings", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getBookingById", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    (0, swagger_1.ApiOperation)({
        summary: 'Cancel a booking',
        description: 'Cancel a booking and receive refund based on cancellation policy. Refund: 100% if >24h before, 50% if 12-24h before, 0% if <12h before.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Booking ID' }),
    (0, swagger_1.ApiBody)({ type: dto_1.CancelBookingDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Booking cancelled successfully',
        schema: {
            example: {
                success: true,
                data: {
                    booking: {
                        id: 'bk_123abc',
                        status: 'CANCELLED',
                    },
                    refund: {
                        amount: 100.00,
                        percentage: 50,
                    },
                },
                message: {
                    en: 'Booking cancelled successfully. Refund: 50%',
                    ar: 'تم إلغاء الحجز بنجاح. المبلغ المسترد: 50%',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Booking not found',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden - Can only cancel own bookings',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.CancelBookingDto]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "cancelBooking", null);
__decorate([
    (0, common_1.Patch)(':id/no-show'),
    (0, roles_decorator_1.Roles)(client_1.Role.FIELD_OWNER),
    (0, swagger_1.ApiOperation)({
        summary: 'Mark booking as no-show',
        description: 'Field owners can mark a booking as no-show when player does not arrive. Player loses deposit and gets suspended after 3 no-shows.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Booking ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Booking marked as no-show successfully',
        schema: {
            example: {
                success: true,
                data: {
                    id: 'bk_123abc',
                    status: 'NO_SHOW',
                    noShowCount: 1,
                },
                message: {
                    en: 'Booking marked as no-show',
                    ar: 'تم تحديد الحجز كعدم حضور',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Booking not found',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden - Can only mark bookings for own fields',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "markNoShow", null);
__decorate([
    (0, common_1.Get)(':id/qr'),
    (0, roles_decorator_1.Roles)(client_1.Role.PLAYER),
    (0, swagger_1.ApiOperation)({
        summary: 'Get booking QR code',
        description: 'Retrieve the QR code for a confirmed booking. QR code can be scanned by field owner for check-in.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Booking ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'QR code retrieved successfully',
        schema: {
            example: {
                success: true,
                data: {
                    qrToken: 'qr_abc123xyz',
                    imageUrl: 'https://example.com/qr/booking-qr.png',
                    isUsed: false,
                    usedAt: null,
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Booking or QR code not found',
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Forbidden - Can only access own booking QR codes',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "getBookingQrCode", null);
exports.BookingsController = BookingsController = __decorate([
    (0, swagger_1.ApiTags)('Bookings'),
    (0, common_1.Controller)('bookings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [bookings_service_1.BookingsService,
        qr_service_1.QrService])
], BookingsController);
//# sourceMappingURL=bookings.controller.js.map