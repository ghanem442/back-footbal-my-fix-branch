"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const platform_express_1 = require("@nestjs/platform-express");
const payment_service_1 = require("./services/payment.service");
const payout_service_1 = require("./services/payout.service");
const manual_payment_service_1 = require("./services/manual-payment.service");
const payment_reference_service_1 = require("./services/payment-reference.service");
const fraud_detection_service_1 = require("./services/fraud-detection.service");
const payment_controller_1 = require("./controllers/payment.controller");
const paymob_gateway_1 = require("./gateways/paymob.gateway");
const stripe_gateway_1 = require("./gateways/stripe.gateway");
const fawry_gateway_1 = require("./gateways/fawry.gateway");
const vodafone_cash_gateway_1 = require("./gateways/vodafone-cash.gateway");
const instapay_gateway_1 = require("./gateways/instapay.gateway");
const wallet_gateway_1 = require("./gateways/wallet.gateway");
const stripe_payout_gateway_1 = require("./gateways/stripe-payout.gateway");
const fawry_payout_gateway_1 = require("./gateways/fawry-payout.gateway");
const prisma_module_1 = require("../prisma/prisma.module");
const bookings_module_1 = require("../bookings/bookings.module");
const wallet_module_1 = require("../wallet/wallet.module");
const logger_module_1 = require("../logger/logger.module");
const storage_module_1 = require("../storage/storage.module");
const notifications_module_1 = require("../notifications/notifications.module");
let PaymentModule = class PaymentModule {
};
exports.PaymentModule = PaymentModule;
exports.PaymentModule = PaymentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            prisma_module_1.PrismaModule,
            (0, common_1.forwardRef)(() => bookings_module_1.BookingsModule),
            (0, common_1.forwardRef)(() => wallet_module_1.WalletModule),
            logger_module_1.LoggerModule,
            storage_module_1.StorageModule,
            notifications_module_1.NotificationsModule,
            platform_express_1.MulterModule.register({
                limits: {
                    fileSize: 5 * 1024 * 1024,
                    files: 1,
                },
                fileFilter: (req, file, cb) => {
                    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
                    if (allowedMimeTypes.includes(file.mimetype)) {
                        cb(null, true);
                    }
                    else {
                        cb(new Error('Only JPG, PNG, and PDF files are allowed'), false);
                    }
                },
            }),
        ],
        controllers: [payment_controller_1.PaymentController],
        providers: [
            payment_service_1.PaymentService,
            payout_service_1.PayoutService,
            manual_payment_service_1.ManualPaymentService,
            payment_reference_service_1.PaymentReferenceService,
            fraud_detection_service_1.FraudDetectionService,
            stripe_gateway_1.StripeGateway,
            fawry_gateway_1.FawryGateway,
            vodafone_cash_gateway_1.VodafoneCashGateway,
            instapay_gateway_1.InstaPayGateway,
            wallet_gateway_1.WalletGateway,
            paymob_gateway_1.PaymobGateway,
            stripe_payout_gateway_1.StripePayoutGateway,
            fawry_payout_gateway_1.FawryPayoutGateway,
            {
                provide: 'PAYMENT_GATEWAY_REGISTRY',
                useFactory: (paymentService, stripeGateway, fawryGateway, vodafoneCashGateway, instaPayGateway, walletGateway, paymobGateway) => {
                    paymentService.registerGateway('stripe', stripeGateway);
                    paymentService.registerGateway('fawry', fawryGateway);
                    paymentService.registerGateway('vodafone_cash', vodafoneCashGateway);
                    paymentService.registerGateway('instapay', instaPayGateway);
                    paymentService.registerGateway('wallet', walletGateway);
                    paymentService.registerGateway('paymob', paymobGateway);
                    return paymentService;
                },
                inject: [payment_service_1.PaymentService, stripe_gateway_1.StripeGateway, fawry_gateway_1.FawryGateway, vodafone_cash_gateway_1.VodafoneCashGateway, instapay_gateway_1.InstaPayGateway, wallet_gateway_1.WalletGateway, paymob_gateway_1.PaymobGateway],
            },
            {
                provide: 'PAYOUT_GATEWAY_REGISTRY',
                useFactory: (payoutService, stripePayoutGateway, fawryPayoutGateway) => {
                    payoutService.registerGateway('stripe', stripePayoutGateway);
                    payoutService.registerGateway('fawry', fawryPayoutGateway);
                    return payoutService;
                },
                inject: [payout_service_1.PayoutService, stripe_payout_gateway_1.StripePayoutGateway, fawry_payout_gateway_1.FawryPayoutGateway],
            },
        ],
        exports: [
            payment_service_1.PaymentService,
            payout_service_1.PayoutService,
            manual_payment_service_1.ManualPaymentService,
            payment_reference_service_1.PaymentReferenceService,
            fraud_detection_service_1.FraudDetectionService,
        ],
    })
], PaymentModule);
//# sourceMappingURL=payment.module.js.map