import { Controller, Post, Body, Param, UseGuards, Request, Get, HttpCode, HttpStatus, Headers, RawBodyRequest, Req, BadRequestException, NotFoundException, ForbiddenException, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PaymentService } from '../services/payment.service';
import { ManualPaymentService } from '../services/manual-payment.service';
import { InitiatePaymentDto } from '../dto/initiate-payment.dto';
import { UploadScreenshotDto } from '../dto/upload-screenshot.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingConfirmationService } from '../../bookings/booking-confirmation.service';
import { Throttle } from '@nestjs/throttler';
import { PaymentStatus } from '@prisma/client';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { Public } from '@modules/auth/decorators/public.decorator';
import { JwtPayload } from '@modules/auth/interfaces/jwt-payload.interface';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ErrorCodes } from '@common/constants/error-codes';

/**
 * Payment Controller
 * 
 * Handles payment-related HTTP endpoints including payment initiation,
 * webhook handling, and payment status queries.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.6, 10.7
 */
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly manualPaymentService: ManualPaymentService,
    private readonly prisma: PrismaService,
    private readonly bookingConfirmationService: BookingConfirmationService,
  ) {}

  /**
   * Paymob redirect callback (GET) - user is redirected here after payment
   * GET /payments/callback/paymob
   */
  @Public()
  @Get('callback/paymob')
  async paymobCallback(@Req() req: any, @Res() res: any) {
    console.log('=== PAYMOB CALLBACK RECEIVED ===');
    console.log('Query params:', JSON.stringify(req.query, null, 2));
    console.log('================================');

    const { success, pending, txn_response_code, merchant_order_id, id: transactionId } = req.query;

    const isSuccess = success === 'true' 
      && pending !== 'true'
      && (txn_response_code === 'APPROVED' || txn_response_code === '00' || !txn_response_code);

    console.log('isSuccess:', isSuccess, '| success:', success, '| pending:', pending, '| txn_response_code:', txn_response_code);

    if (isSuccess) {
      // Payment succeeded - process confirmation in background
      try {
        // Update payment to COMPLETED regardless of current status
        const payment = await this.prisma.payment.findFirst({
          where: { bookingId: merchant_order_id as string },
        });
        if (payment) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'COMPLETED', transactionId: String(transactionId) },
          });
        }
        // Confirm booking if still PENDING_PAYMENT
        const booking = await this.prisma.booking.findUnique({
          where: { id: merchant_order_id as string },
        });
        if (booking && booking.status === 'PENDING_PAYMENT') {
          await this.bookingConfirmationService.confirmBooking(merchant_order_id as string, 'PAYMOB' as any);
        }
      } catch (e: any) {
        console.error('Callback confirmation error:', e.message);
      }
      return res.send(`<html><body><h2>✅ Payment Successful!</h2><p>Your booking is confirmed. You can close this window.</p><script>setTimeout(()=>window.close(),3000)</script></body></html>`);
    } else {
      return res.send(`<html><body><h2>❌ Payment Failed</h2><p>Please try again.</p><script>setTimeout(()=>window.close(),3000)</script></body></html>`);
    }
  }

  /**
   * DEV ONLY: Manually confirm a booking (bypass Paymob webhook)
   * POST /payments/dev/confirm-booking
   */
  @Public()
  @Post('dev/confirm-booking')
  @HttpCode(HttpStatus.OK)
  async devConfirmBooking(@Body() body: { bookingId: string }) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Not available in production');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: body.bookingId },
      include: { payment: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    // Create payment record if not exists
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
    } else {
      await this.prisma.payment.update({
        where: { id: booking.payment.id },
        data: { status: 'COMPLETED' },
      });
    }

    const confirmed = await this.bookingConfirmationService.confirmBooking(
      booking.id,
      'PAYMOB' as any,
    );

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

  /**
   * Initiate deposit payment for a booking
   * POST /payments/deposit/init
   */
  @Post('deposit/init')
  @HttpCode(HttpStatus.OK)
  async initiateDeposit(
    @Body() body: { bookingId: string; gateway?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    const gateway = body.gateway || 'paymob';

    const booking = await this.prisma.booking.findUnique({
      where: { id: body.bookingId },
      include: { player: true, field: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.playerId !== user.userId) throw new ForbiddenException('Not your booking');
    if (booking.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException(`Booking status is ${booking.status}, expected PENDING_PAYMENT`);
    }
    if (booking.paymentDeadline && new Date() > booking.paymentDeadline) {
      throw new BadRequestException('Payment deadline has expired');
    }

    // Idempotency: return existing pending payment if exists
    const existing = await this.prisma.payment.findUnique({ where: { bookingId: booking.id } });
    if (existing && existing.status === 'PENDING') {
      const gr = existing.gatewayResponse as any;
      // Only return cached if we have a valid redirectUrl (previous attempt succeeded)
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
      // redirectUrl missing → previous attempt failed, retry gateway call below
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

    // Upsert payment record
    let payment: any;
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
    } catch (dbError: any) {
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
        paymentToken: (response.gatewayResponse as any)?.paymentToken,
        iframeId: (response.gatewayResponse as any)?.iframeId,
        reference: response.transactionId,
      },
    };
  }

  /**
   * Handle Paymob webhook
   * POST /payments/webhook/paymob
   */
  @Public()
  @Post('webhook/paymob')
  @HttpCode(HttpStatus.OK)
  async handlePaymobWebhook(
    @Body() payload: any,
    @Headers('hmac') hmac?: string,
  ) {
    const result = await this.paymentService.handleWebhook('paymob', payload, hmac);
    await this.processWebhookResult(result, 'PAYMOB');
    return { received: true };
  }

  /**
   * Initiate a payment for a booking
   * POST /payments/initiate
   * 
   * Requirements: 10.1, 10.2, 10.3, 10.4, 20.3, 20.4
   */
  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 per hour per user
  async initiatePayment(
    @Body() dto: InitiatePaymentDto,
    @CurrentUser() user: JwtPayload,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    // 🔍 DEBUG LOG: Request received
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

    // Check email verification
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
      throw new BadRequestException({
        ...ErrorCodes.EMAIL_NOT_VERIFIED,
        email: userRecord?.email,
      });
    }

    // Check if payment already exists (idempotency)
    const existingPayment = await this.prisma.payment.findUnique({
      where: { bookingId: dto.bookingId },
      include: { booking: true },
    });

    if (existingPayment) {
      // Validate ownership
      if (existingPayment.booking.playerId !== user.userId) {
        throw new ForbiddenException('Cannot access another user\'s payment');
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
        const gatewayResponse = existingPayment.gatewayResponse as any;
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

    // Get booking details
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
      throw new NotFoundException(ErrorCodes.BOOKING_NOT_FOUND);
    }

    console.log('✅ Booking found:', {
      bookingId: booking.id,
      status: booking.status,
      playerId: booking.playerId,
      depositAmount: booking.depositAmount,
      paymentDeadline: booking.paymentDeadline,
    });

    // Validate booking belongs to authenticated user
    if (booking.playerId !== user.userId) {
      console.log('❌ Booking ownership mismatch:', {
        bookingPlayerId: booking.playerId,
        requestUserId: user.userId,
      });
      throw new ForbiddenException('Cannot pay for another user\'s booking');
    }

    // Validate booking status
    if (booking.status !== 'PENDING_PAYMENT') {
      console.log('❌ Invalid booking status:', {
        currentStatus: booking.status,
        requiredStatus: 'PENDING_PAYMENT',
      });
      throw new BadRequestException({
        ...ErrorCodes.INVALID_BOOKING_STATUS,
        currentStatus: booking.status,
        requiredStatus: 'PENDING_PAYMENT',
      });
    }

    // Check payment deadline
    if (booking.paymentDeadline && new Date() > booking.paymentDeadline) {
      console.log('❌ Payment deadline expired:', {
        deadline: booking.paymentDeadline,
        now: new Date(),
      });
      throw new BadRequestException({
        ...ErrorCodes.PAYMENT_DEADLINE_EXPIRED,
        deadline: booking.paymentDeadline,
        now: new Date(),
      });
    }

    console.log('✅ All validations passed - proceeding with payment');
    console.log('💰 Payment Amount:', booking.depositAmount, 'EGP');

    // Check if this is a manual payment method (Vodafone Cash or InstaPay)
    const isManualPayment = ['vodafone_cash', 'instapay'].includes(dto.gateway.toLowerCase());

    if (isManualPayment) {
      console.log('🔍 Manual payment method detected:', dto.gateway);
      
      // Create manual payment with reference code and expiry
      const manualPaymentResult = await this.manualPaymentService.createManualPayment(
        booking.id,
        this.mapGatewayToEnum(dto.gateway),
        Number(booking.depositAmount),
      );

      // Get payment instructions
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

    // Continue with automated payment flow for other gateways
    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        gateway: this.mapGatewayToEnum(dto.gateway),
        amount: booking.depositAmount,
        currency: 'EGP',
        status: 'PENDING',
      },
    });

    // Process payment through gateway
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

    // Update payment with transaction ID
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        transactionId: response.transactionId,
        gatewayResponse: response.gatewayResponse,
        status: response.status === 'SUCCESS' ? 'COMPLETED' : response.status === 'FAILED' ? 'FAILED' : 'PENDING',
      },
    });

    // Check if payment failed
    if (response.status === 'FAILED') {
      const errorMessage = response.gatewayResponse?.error || 'Payment failed';
      console.log('❌ Payment failed:', errorMessage);
      console.log('❌ Gateway response details:', response.gatewayResponse);
      
      // Check if it's insufficient balance error
      if (errorMessage.includes('Insufficient wallet balance')) {
        throw new BadRequestException({
          ...ErrorCodes.INSUFFICIENT_BALANCE,
          currentBalance: response.gatewayResponse?.currentBalance,
          requiredAmount: response.gatewayResponse?.requiredAmount,
          shortage: response.gatewayResponse?.shortage,
        });
      }
      
      throw new BadRequestException(errorMessage);
    }

    console.log('✅ Payment successful:', response.transactionId);

    // For wallet payments, process confirmation immediately since there's no webhook
    if (dto.gateway === 'wallet' && response.status === 'SUCCESS') {
      await this.bookingConfirmationService.confirmBooking(
        booking.id,
        this.mapGatewayToEnum(dto.gateway),
      );
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

  /**
   * Handle Stripe webhook
   * POST /payments/webhook/stripe
   * 
   * Requirements: 10.1, 10.6, 10.7
   */
  @Public()
  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const payload = req.rawBody || req.body;
    const result = await this.paymentService.handleWebhook('stripe', payload, signature);
    await this.processWebhookResult(result, 'STRIPE');
    
    return { received: true };
  }

  /**
   * Handle Fawry webhook
   * POST /payments/webhook/fawry
   * 
   * Requirements: 10.2, 10.6, 10.7
   */
  @Public()
  @Post('webhook/fawry')
  @HttpCode(HttpStatus.OK)
  async handleFawryWebhook(@Body() payload: any) {
    const result = await this.paymentService.handleWebhook('fawry', payload);
    await this.processWebhookResult(result, 'FAWRY');
    
    return { received: true };
  }

  /**
   * Handle Vodafone Cash webhook
   * POST /payments/webhook/vodafone
   * 
   * Requirements: 10.3, 10.6, 10.7
   */
  @Public()
  @Post('webhook/vodafone')
  @HttpCode(HttpStatus.OK)
  async handleVodafoneWebhook(@Body() payload: any) {
    const result = await this.paymentService.handleWebhook('vodafone_cash', payload);
    await this.processWebhookResult(result, 'VODAFONE_CASH');
    
    return { received: true };
  }

  /**
   * Handle InstaPay webhook
   * POST /payments/webhook/instapay
   * 
   * Requirements: 10.4, 10.6, 10.7
   */
  @Public()
  @Post('webhook/instapay')
  @HttpCode(HttpStatus.OK)
  async handleInstaPayWebhook(@Body() payload: any) {
    const result = await this.paymentService.handleWebhook('instapay', payload);
    await this.processWebhookResult(result, 'INSTAPAY');
    
    return { received: true };
  }

  /**
   * Get payment details
   * GET /payments/:id
   */
  @Get(':id')
  async getPayment(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
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
      throw new NotFoundException('Payment not found');
    }

    // Validate ownership (allow player or admin)
    if (payment.booking.playerId !== user.userId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Cannot access another user\'s payment');
    }

    return {
      success: true,
      data: payment,
    };
  }

  /**
   * Process webhook result and update booking status
   * Implements idempotency to prevent duplicate processing
   * 
   * Requirements: 10.5, 10.6, 10.7, 12.3, 12.4, 12.5
   */
  private async processWebhookResult(result: any, gateway: string) {
    // Use transaction for idempotency
    await this.prisma.$transaction(async (tx) => {
      // Find payment by transaction ID
      const payment = await tx.payment.findFirst({
        where: {
          transactionId: result.transactionId,
          gateway: gateway as any,
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

      // Check if already processed (idempotency)
      if (payment.status !== 'PENDING') {
        console.log(`Payment ${payment.id} already processed with status ${payment.status}`);
        return;
      }

      const booking = payment.booking;

      if (result.status === 'SUCCESS') {
        // Update payment status
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.COMPLETED,
            gatewayResponse: result.metadata,
            updatedAt: new Date(),
          },
        });

        // Use booking confirmation service to handle all confirmation logic
        await this.bookingConfirmationService.confirmBooking(
          booking.id,
          gateway as any,
        );

      } else if (result.status === 'FAILED') {
        // Update payment status
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            gatewayResponse: result.metadata,
            updatedAt: new Date(),
          },
        });

        // Use booking confirmation service to handle payment failure
        const failureReason = result.metadata?.error || result.metadata?.message || 'Payment failed';
        await this.bookingConfirmationService.handlePaymentFailure(
          booking.id,
          failureReason,
        );
      }
    });
  }

  /**
   * Map gateway string to Prisma enum
   */
  private mapGatewayToEnum(gateway: string): any {
    const mapping: Record<string, string> = {
      'stripe': 'STRIPE',
      'fawry': 'FAWRY',
      'vodafone_cash': 'VODAFONE_CASH',
      'instapay': 'INSTAPAY',
      'wallet': 'WALLET',
      'paymob': 'PAYMOB',
    };
    return mapping[gateway] || 'PAYMOB';
  }

  /**
   * Get manual payment instructions
   * GET /payments/manual-payment-info/:gateway
   */
  @Get('manual-payment-info/:gateway')
  @HttpCode(HttpStatus.OK)
  async getManualPaymentInfo(@Param('gateway') gateway: string) {
    const info = await this.manualPaymentService.getPaymentInstructions(gateway);
    return {
      success: true,
      data: info,
    };
  }

  /**
   * Upload payment screenshot
   * POST /payments/:paymentId/upload-screenshot
   */
  @Post(':paymentId/upload-screenshot')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('screenshot'))
  async uploadScreenshot(
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadScreenshotDto,
  ) {
    const result = await this.manualPaymentService.uploadScreenshot(
      paymentId,
      user.userId,
      file,
      dto.notes,
      dto.transactionId,
      dto.senderNumber,
    );

    return {
      success: true,
      data: result,
      message: result.message,
    };
  }

  /**
   * Get payment verification status
   * GET /payments/:paymentId/verification-status
   */
  @Get(':paymentId/verification-status')
  async getVerificationStatus(
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const status = await this.manualPaymentService.getVerificationStatus(paymentId, user.userId);
    return {
      success: true,
      data: status,
    };
  }
}
