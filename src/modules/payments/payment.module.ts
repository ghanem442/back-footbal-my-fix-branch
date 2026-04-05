import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { PaymentService } from './services/payment.service';
import { PayoutService } from './services/payout.service';
import { ManualPaymentService } from './services/manual-payment.service';
import { PaymentReferenceService } from './services/payment-reference.service';
import { FraudDetectionService } from './services/fraud-detection.service';
import { PaymentController } from './controllers/payment.controller';
import { PaymobGateway } from './gateways/paymob.gateway';
import { StripeGateway } from './gateways/stripe.gateway';
import { FawryGateway } from './gateways/fawry.gateway';
import { VodafoneCashGateway } from './gateways/vodafone-cash.gateway';
import { InstaPayGateway } from './gateways/instapay.gateway';
import { WalletGateway } from './gateways/wallet.gateway';
import { StripePayoutGateway } from './gateways/stripe-payout.gateway';
import { FawryPayoutGateway } from './gateways/fawry-payout.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { BookingsModule } from '@modules/bookings/bookings.module';
import { WalletModule } from '@modules/wallet/wallet.module';
import { LoggerModule } from '@modules/logger/logger.module';
import { StorageModule } from '@modules/storage/storage.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';

/**
 * Payment Module
 * 
 * Provides payment gateway abstraction and management.
 * Supports multiple payment providers through the adapter pattern.
 * 
 * Supported Payment Gateways:
 * - Stripe
 * - Fawry
 * - Vodafone Cash
 * - InstaPay
 * - Wallet
 * 
 * Supported Payout Gateways:
 * - Stripe (Connect & Direct)
 * - Fawry
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => BookingsModule),
    forwardRef(() => WalletModule),
    LoggerModule,
    StorageModule,
    NotificationsModule,
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1,
      },
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Only JPG, PNG, and PDF files are allowed'), false);
        }
      },
    }),
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PayoutService,
    ManualPaymentService,
    PaymentReferenceService,
    FraudDetectionService,
    StripeGateway,
    FawryGateway,
    VodafoneCashGateway,
    InstaPayGateway,
    WalletGateway,
    PaymobGateway,
    StripePayoutGateway,
    FawryPayoutGateway,
    {
      provide: 'PAYMENT_GATEWAY_REGISTRY',
      useFactory: (
        paymentService: PaymentService,
        stripeGateway: StripeGateway,
        fawryGateway: FawryGateway,
        vodafoneCashGateway: VodafoneCashGateway,
        instaPayGateway: InstaPayGateway,
        walletGateway: WalletGateway,
        paymobGateway: PaymobGateway,
      ) => {
        paymentService.registerGateway('stripe', stripeGateway);
        paymentService.registerGateway('fawry', fawryGateway);
        paymentService.registerGateway('vodafone_cash', vodafoneCashGateway);
        paymentService.registerGateway('instapay', instaPayGateway);
        paymentService.registerGateway('wallet', walletGateway);
        paymentService.registerGateway('paymob', paymobGateway);
        return paymentService;
      },
      inject: [PaymentService, StripeGateway, FawryGateway, VodafoneCashGateway, InstaPayGateway, WalletGateway, PaymobGateway],
    },
    {
      provide: 'PAYOUT_GATEWAY_REGISTRY',
      useFactory: (
        payoutService: PayoutService,
        stripePayoutGateway: StripePayoutGateway,
        fawryPayoutGateway: FawryPayoutGateway,
      ) => {
        // Register all payout gateways
        payoutService.registerGateway('stripe', stripePayoutGateway);
        payoutService.registerGateway('fawry', fawryPayoutGateway);
        return payoutService;
      },
      inject: [PayoutService, StripePayoutGateway, FawryPayoutGateway],
    },
  ],
  exports: [
    PaymentService,
    PayoutService,
    ManualPaymentService,
    PaymentReferenceService,
    FraudDetectionService,
  ],
})
export class PaymentModule {}
