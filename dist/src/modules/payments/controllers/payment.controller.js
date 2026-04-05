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
exports.PaymentController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const payment_service_1 = require("../services/payment.service");
const manual_payment_service_1 = require("../services/manual-payment.service");
const initiate_payment_dto_1 = require("../dto/initiate-payment.dto");
const upload_screenshot_dto_1 = require("../dto/upload-screenshot.dto");
const prisma_service_1 = require("../../prisma/prisma.service");
const booking_confirmation_service_1 = require("../../bookings/booking-confirmation.service");
const throttler_1 = require("@nestjs/throttler");
const client_1 = require("@prisma/client");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
const public_decorator_1 = require("../../auth/decorators/public.decorator");
const swagger_1 = require("@nestjs/swagger");
const error_codes_1 = require("../../../common/constants/error-codes");
let PaymentController = class PaymentController {
    constructor(paymentService, manualPaymentService, prisma, bookingConfirmationService) {
        this.paymentService = paymentService;
        this.manualPaymentService = manualPaymentService;
        this.prisma = prisma;
        this.bookingConfirmationService = bookingConfirmationService;
    }
    async paymobCallback(req, res) {
        console.log('=== PAYMOB CALLBACK RECEIVED ===');
        console.log('Query params:', JSON.stringify(req.query, null, 2));
        console.log('================================');
        const { success, pending, txn_response_code, merchant_order_id, id: transactionId } = req.query;
        const isSuccess = success === 'true'
            && pending !== 'true'
            && (txn_response_code === 'APPROVED' || txn_response_code === '00' || !txn_response_code);
        console.log('isSuccess:', isSuccess, '| success:', success, '| pending:', pending, '| txn_response_code:', txn_response_code);
        if (isSuccess) {
            try {
                const payment = await this.prisma.payment.findFirst({
                    where: { bookingId: merchant_order_id },
                });
                if (payment) {
                    await this.prisma.payment.update({
                        where: { id: payment.id },
                        data: { status: 'COMPLETED', transactionId: String(transactionId) },
                    });
                }
                const booking = await this.prisma.booking.findUnique({
                    where: { id: merchant_order_id },
                });
                if (booking && booking.status === 'PENDING_PAYMENT') {
                    await this.bookingConfirmationService.confirmBooking(merchant_order_id, 'PAYMOB');
                }
            }
            catch (e) {
                console.error('Callback confirmation error:', e.message);
            }
            return res.send(`<html><body><h2>✅ Payment Successful!</h2><p>Your booking is confirmed. You can close this window.</p><script>setTimeout(()=>window.close(),3000)</script></body></html>`);
        }
        else {
            return res.send(`<html><body><h2>❌ Payment Failed</h2><p>Please try again.</p><script>setTimeout(()=>window.close(),3000)</script></body></html>`);
        }
    }
    async devConfirmBooking(body) {
        if (process.env.NODE_ENV === 'production') {
            throw new common_1.ForbiddenException('Not available in production');
        }
        const booking = await this.prisma.booking.findUnique({
            where: { id: body.bookingId },
            include: { payment: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (!booking.payment) {
            await this.prisma.payment.create({
                data: {
                    bookingId: booking.id,
                    gateway: 'PAYMOB',
                    amount: booking.depositAmount,
                    currency: 'EGP',
                    status: 'COMPLETED',
                    transactionId: 'dev-test-' + Date.now(),
                },
            });
        }
        else {
            await this.prisma.payment.update({
                where: { id: booking.payment.id },
                data: { status: 'COMPLETED' },
            });
        }
        const confirmed = await this.bookingConfirmationService.confirmBooking(booking.id, 'PAYMOB');
        return {
            success: true,
            data: {
                bookingId: confirmed.id,
                bookingNumber: confirmed.bookingNumber,
                status: confirmed.status,
            },
            message: '[DEV] Booking confirmed successfully',
        };
    }
    async initiateDeposit(body, user) {
        const gateway = body.gateway || 'paymob';
        const booking = await this.prisma.booking.findUnique({
            where: { id: body.bookingId },
            include: { player: true, field: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.playerId !== user.userId)
            throw new common_1.ForbiddenException('Not your booking');
        if (booking.status !== 'PENDING_PAYMENT') {
            throw new common_1.BadRequestException(`Booking status is ${booking.status}, expected PENDING_PAYMENT`);
        }
        if (booking.paymentDeadline && new Date() > booking.paymentDeadline) {
            throw new common_1.BadRequestException('Payment deadline has expired');
        }
        const existing = await this.prisma.payment.findUnique({ where: { bookingId: booking.id } });
        if (existing && existing.status === 'PENDING') {
            const gr = existing.gatewayResponse;
            if (gr?.redirectUrl) {
                return {
                    success: true,
                    data: {
                        paymentId: existing.id,
                        bookingId: booking.id,
                        amount: Number(booking.depositAmount),
                        currency: 'EGP',
                        gateway,
                        redirectUrl: gr?.redirectUrl,
                        paymentToken: gr?.paymentToken,
                        iframeId: gr?.iframeId,
                        reference: existing.transactionId,
                    },
                };
            }
        }
        const paymentRequest = {
            bookingId: booking.id,
            amount: Number(booking.depositAmount),
            currency: 'EGP',
            userId: booking.playerId,
            metadata: {
                playerEmail: booking.player.email,
                fieldName: booking.field.name,
            },
        };
        const response = await this.paymentService.initiatePayment(gateway, paymentRequest);
        console.log('=== PAYMOB GATEWAY RAW RESPONSE ===');
        console.log(JSON.stringify(response, null, 2));
        console.log('redirectUrl:', response.redirectUrl);
        console.log('gatewayResponse:', JSON.stringify(response.gatewayResponse, null, 2));
        console.log('===================================');
        let payment;
        try {
            payment = existing
                ? await this.prisma.payment.update({
                    where: { id: existing.id },
                    data: {
                        gateway: this.mapGatewayToEnum(gateway),
                        transactionId: response.transactionId,
                        gatewayResponse: { ...response.gatewayResponse, redirectUrl: response.redirectUrl },
                        status: 'PENDING',
                    },
                })
                : await this.prisma.payment.create({
                    data: {
                        bookingId: booking.id,
                        gateway: this.mapGatewayToEnum(gateway),
                        amount: booking.depositAmount,
                        currency: 'EGP',
                        status: 'PENDING',
                        transactionId: response.transactionId,
                        gatewayResponse: { ...response.gatewayResponse, redirectUrl: response.redirectUrl },
                    },
                });
        }
        catch (dbError) {
            console.error('=== PAYMENT DB ERROR ===');
            console.error(dbError.message);
            console.error(dbError.code);
            console.error('=======================');
            throw dbError;
        }
        return {
            success: true,
            data: {
                paymentId: payment.id,
                bookingId: booking.id,
                amount: Number(booking.depositAmount),
                currency: 'EGP',
                gateway,
                redirectUrl: response.redirectUrl,
                paymentToken: response.gatewayResponse?.paymentToken,
                iframeId: response.gatewayResponse?.iframeId,
                reference: response.transactionId,
            },
        };
    }
    async handlePaymobWebhook(payload, hmac) {
        const result = await this.paymentService.handleWebhook('paymob', payload, hmac);
        await this.processWebhookResult(result, 'PAYMOB');
        return { received: true };
    }
    async initiatePayment(dto, user, idempotencyKey) {
        console.log('=== PAYMENT INITIATE REQUEST ===');
        console.log('User ID:', user.userId);
        console.log('User Email:', user.email);
        console.log('Request Body:', JSON.stringify(dto, null, 2));
        console.log('Body Fields:', {
            bookingId: dto.bookingId,
            gateway: dto.gateway,
            metadata: dto.metadata,
        });
        console.log('Gateway Type:', typeof dto.gateway);
        console.log('Gateway Value:', dto.gateway);
        console.log('Idempotency Key:', idempotencyKey);
        console.log('================================');
        const userRecord = await this.prisma.user.findUnique({
            where: { id: user.userId },
            select: { isVerified: true, email: true },
        });
        console.log('🔍 User Verification Status:', {
            userId: user.userId,
            email: userRecord?.email,
            isVerified: userRecord?.isVerified,
        });
        if (!userRecord?.isVerified) {
            console.log('❌ Email not verified - throwing error');
            throw new common_1.BadRequestException({
                ...error_codes_1.ErrorCodes.EMAIL_NOT_VERIFIED,
                email: userRecord?.email,
            });
        }
        const existingPayment = await this.prisma.payment.findUnique({
            where: { bookingId: dto.bookingId },
            include: { booking: true },
        });
        if (existingPayment) {
            if (existingPayment.booking.playerId !== user.userId) {
                throw new common_1.ForbiddenException('Cannot access another user\'s payment');
            }
            if (existingPayment.status === 'COMPLETED') {
                return {
                    success: true,
                    data: {
                        paymentId: existingPayment.id,
                        transactionId: existingPayment.transactionId,
                        status: 'COMPLETED',
                        amount: existingPayment.amount,
                        currency: 'EGP',
                    },
                    message: 'Payment already completed',
                };
            }
            if (existingPayment.status === 'PENDING') {
                const gatewayResponse = existingPayment.gatewayResponse;
                return {
                    success: true,
                    data: {
                        paymentId: existingPayment.id,
                        transactionId: existingPayment.transactionId,
                        status: 'PENDING',
                        amount: existingPayment.amount,
                        currency: 'EGP',
                        redirectUrl: gatewayResponse?.redirectUrl,
                    },
                    message: 'Payment already in progress',
                };
            }
        }
        console.log('🔍 Fetching booking:', dto.bookingId);
        const booking = await this.prisma.booking.findUnique({
            where: { id: dto.bookingId },
            include: {
                player: true,
                field: true,
            },
        });
        if (!booking) {
            console.log('❌ Booking not found:', dto.bookingId);
            throw new common_1.NotFoundException(error_codes_1.ErrorCodes.BOOKING_NOT_FOUND);
        }
        console.log('✅ Booking found:', {
            bookingId: booking.id,
            status: booking.status,
            playerId: booking.playerId,
            depositAmount: booking.depositAmount,
            paymentDeadline: booking.paymentDeadline,
        });
        if (booking.playerId !== user.userId) {
            console.log('❌ Booking ownership mismatch:', {
                bookingPlayerId: booking.playerId,
                requestUserId: user.userId,
            });
            throw new common_1.ForbiddenException('Cannot pay for another user\'s booking');
        }
        if (booking.status !== 'PENDING_PAYMENT') {
            console.log('❌ Invalid booking status:', {
                currentStatus: booking.status,
                requiredStatus: 'PENDING_PAYMENT',
            });
            throw new common_1.BadRequestException({
                ...error_codes_1.ErrorCodes.INVALID_BOOKING_STATUS,
                currentStatus: booking.status,
                requiredStatus: 'PENDING_PAYMENT',
            });
        }
        if (booking.paymentDeadline && new Date() > booking.paymentDeadline) {
            console.log('❌ Payment deadline expired:', {
                deadline: booking.paymentDeadline,
                now: new Date(),
            });
            throw new common_1.BadRequestException({
                ...error_codes_1.ErrorCodes.PAYMENT_DEADLINE_EXPIRED,
                deadline: booking.paymentDeadline,
                now: new Date(),
            });
        }
        console.log('✅ All validations passed - proceeding with payment');
        console.log('💰 Payment Amount:', booking.depositAmount, 'EGP');
        const isManualPayment = ['vodafone_cash', 'instapay'].includes(dto.gateway.toLowerCase());
        if (isManualPayment) {
            console.log('🔍 Manual payment method detected:', dto.gateway);
            const manualPaymentResult = await this.manualPaymentService.createManualPayment(booking.id, this.mapGatewayToEnum(dto.gateway), Number(booking.depositAmount));
            const instructions = await this.manualPaymentService.getPaymentInstructions(dto.gateway);
            return {
                success: true,
                data: {
                    paymentId: manualPaymentResult.paymentId,
                    bookingId: booking.id,
                    amount: Number(booking.depositAmount),
                    currency: 'EGP',
                    gateway: dto.gateway,
                    paymentType: 'MANUAL',
                    referenceCode: manualPaymentResult.referenceCode,
                    paymentExpiresAt: manualPaymentResult.paymentExpiresAt,
                    expiryMinutes: manualPaymentResult.expiryMinutes,
                    instructions: instructions.instructions,
                    accountDetails: instructions.accountDetails,
                    nextStep: {
                        en: 'Transfer the amount and upload a screenshot of the transaction',
                        ar: 'قم بتحويل المبلغ ورفع لقطة شاشة للمعاملة',
                    },
                },
                message: {
                    en: 'Manual payment initiated. Please complete the transfer and upload screenshot.',
                    ar: 'تم بدء الدفع اليدوي. يرجى إكمال التحويل ورفع لقطة الشاشة.',
                },
            };
        }
        const payment = await this.prisma.payment.create({
            data: {
                bookingId: booking.id,
                gateway: this.mapGatewayToEnum(dto.gateway),
                amount: booking.depositAmount,
                currency: 'EGP',
                status: 'PENDING',
            },
        });
        const paymentRequest = {
            bookingId: booking.id,
            amount: Number(booking.depositAmount),
            currency: 'EGP',
            userId: booking.playerId,
            metadata: {
                ...dto.metadata,
                fieldName: booking.field.name,
                playerEmail: booking.player.email,
                callbackUrl: `${process.env.APP_URL}/api/v1/payments/webhook/${dto.gateway}`,
            },
        };
        console.log('🔍 Processing payment through gateway:', dto.gateway);
        const response = await this.paymentService.initiatePayment(dto.gateway, paymentRequest);
        console.log('🔍 Gateway response:', {
            transactionId: response.transactionId,
            status: response.status,
            error: response.gatewayResponse?.error,
        });
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                transactionId: response.transactionId,
                gatewayResponse: response.gatewayResponse,
                status: response.status === 'SUCCESS' ? 'COMPLETED' : response.status === 'FAILED' ? 'FAILED' : 'PENDING',
            },
        });
        if (response.status === 'FAILED') {
            const errorMessage = response.gatewayResponse?.error || 'Payment failed';
            console.log('❌ Payment failed:', errorMessage);
            console.log('❌ Gateway response details:', response.gatewayResponse);
            if (errorMessage.includes('Insufficient wallet balance')) {
                throw new common_1.BadRequestException({
                    ...error_codes_1.ErrorCodes.INSUFFICIENT_BALANCE,
                    currentBalance: response.gatewayResponse?.currentBalance,
                    requiredAmount: response.gatewayResponse?.requiredAmount,
                    shortage: response.gatewayResponse?.shortage,
                });
            }
            throw new common_1.BadRequestException(errorMessage);
        }
        console.log('✅ Payment successful:', response.transactionId);
        if (dto.gateway === 'wallet' && response.status === 'SUCCESS') {
            await this.bookingConfirmationService.confirmBooking(booking.id, this.mapGatewayToEnum(dto.gateway));
        }
        return {
            success: true,
            data: {
                paymentId: payment.id,
                transactionId: response.transactionId,
                status: response.status,
                redirectUrl: response.redirectUrl,
                amount: booking.depositAmount,
                currency: 'EGP',
            },
        };
    }
    async handleStripeWebhook(req, signature) {
        const payload = req.rawBody || req.body;
        const result = await this.paymentService.handleWebhook('stripe', payload, signature);
        await this.processWebhookResult(result, 'STRIPE');
        return { received: true };
    }
    async handleFawryWebhook(payload) {
        const result = await this.paymentService.handleWebhook('fawry', payload);
        await this.processWebhookResult(result, 'FAWRY');
        return { received: true };
    }
    async handleVodafoneWebhook(payload) {
        const result = await this.paymentService.handleWebhook('vodafone_cash', payload);
        await this.processWebhookResult(result, 'VODAFONE_CASH');
        return { received: true };
    }
    async handleInstaPayWebhook(payload) {
        const result = await this.paymentService.handleWebhook('instapay', payload);
        await this.processWebhookResult(result, 'INSTAPAY');
        return { received: true };
    }
    async getPayment(id, user) {
        const payment = await this.prisma.payment.findUnique({
            where: { id },
            include: {
                booking: {
                    include: {
                        field: true,
                        player: true,
                    },
                },
            },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        if (payment.booking.playerId !== user.userId && user.role !== 'ADMIN') {
            throw new common_1.ForbiddenException('Cannot access another user\'s payment');
        }
        return {
            success: true,
            data: payment,
        };
    }
    async processWebhookResult(result, gateway) {
        await this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findFirst({
                where: {
                    transactionId: result.transactionId,
                    gateway: gateway,
                },
                include: {
                    booking: {
                        include: {
                            field: {
                                include: {
                                    owner: true,
                                },
                            },
                            player: true,
                        },
                    },
                },
            });
            if (!payment) {
                throw new Error(`Payment not found for transaction ${result.transactionId}`);
            }
            if (payment.status !== 'PENDING') {
                console.log(`Payment ${payment.id} already processed with status ${payment.status}`);
                return;
            }
            const booking = payment.booking;
            if (result.status === 'SUCCESS') {
                await tx.payment.update({
                    where: { id: payment.id },
                    data: {
                        status: client_1.PaymentStatus.COMPLETED,
                        gatewayResponse: result.metadata,
                        updatedAt: new Date(),
                    },
                });
                await this.bookingConfirmationService.confirmBooking(booking.id, gateway);
            }
            else if (result.status === 'FAILED') {
                await tx.payment.update({
                    where: { id: payment.id },
                    data: {
                        status: 'FAILED',
                        gatewayResponse: result.metadata,
                        updatedAt: new Date(),
                    },
                });
                const failureReason = result.metadata?.error || result.metadata?.message || 'Payment failed';
                await this.bookingConfirmationService.handlePaymentFailure(booking.id, failureReason);
            }
        });
    }
    mapGatewayToEnum(gateway) {
        const mapping = {
            'stripe': 'STRIPE',
            'fawry': 'FAWRY',
            'vodafone_cash': 'VODAFONE_CASH',
            'instapay': 'INSTAPAY',
            'wallet': 'WALLET',
            'paymob': 'PAYMOB',
        };
        return mapping[gateway] || 'PAYMOB';
    }
    async getManualPaymentInfo(gateway) {
        const info = await this.manualPaymentService.getPaymentInstructions(gateway);
        return {
            success: true,
            data: info,
        };
    }
    async uploadScreenshot(paymentId, user, file, dto) {
        const result = await this.manualPaymentService.uploadScreenshot(paymentId, user.userId, file, dto.notes, dto.transactionId, dto.senderNumber);
        return {
            success: true,
            data: result,
            message: result.message,
        };
    }
    async getVerificationStatus(paymentId, user) {
        const status = await this.manualPaymentService.getVerificationStatus(paymentId, user.userId);
        return {
            success: true,
            data: status,
        };
    }
};
exports.PaymentController = PaymentController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('callback/paymob'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "paymobCallback", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('dev/confirm-booking'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "devConfirmBooking", null);
__decorate([
    (0, common_1.Post)('deposit/init'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "initiateDeposit", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhook/paymob'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('hmac')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "handlePaymobWebhook", null);
__decorate([
    (0, common_1.Post)('initiate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 3600000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Headers)('idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [initiate_payment_dto_1.InitiatePaymentDto, Object, String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "initiatePayment", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhook/stripe'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('stripe-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "handleStripeWebhook", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhook/fawry'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "handleFawryWebhook", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhook/vodafone'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "handleVodafoneWebhook", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhook/instapay'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "handleInstaPayWebhook", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getPayment", null);
__decorate([
    (0, common_1.Get)('manual-payment-info/:gateway'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('gateway')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getManualPaymentInfo", null);
__decorate([
    (0, common_1.Post)(':paymentId/upload-screenshot'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('screenshot')),
    __param(0, (0, common_1.Param)('paymentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, upload_screenshot_dto_1.UploadScreenshotDto]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "uploadScreenshot", null);
__decorate([
    (0, common_1.Get)(':paymentId/verification-status'),
    __param(0, (0, common_1.Param)('paymentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getVerificationStatus", null);
exports.PaymentController = PaymentController = __decorate([
    (0, common_1.Controller)('payments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    __metadata("design:paramtypes", [payment_service_1.PaymentService,
        manual_payment_service_1.ManualPaymentService,
        prisma_service_1.PrismaService,
        booking_confirmation_service_1.BookingConfirmationService])
], PaymentController);
//# sourceMappingURL=payment.controller.js.map