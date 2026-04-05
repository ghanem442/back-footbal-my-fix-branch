import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PaymentAccountSettingsService } from './payment-account-settings.service';
import { PaymentVerificationService } from './payment-verification.service';
import { PaymentAuditLogService } from './payment-audit-log.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformWalletModule } from '@modules/platform-wallet/platform-wallet.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { BookingsModule } from '@modules/bookings/bookings.module';

@Module({
  imports: [
    PrismaModule,
    PlatformWalletModule,
    NotificationsModule,
    BookingsModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    PaymentAccountSettingsService,
    PaymentVerificationService,
    PaymentAuditLogService,
  ],
  exports: [
    AdminService,
    PaymentAccountSettingsService,
    PaymentVerificationService,
    PaymentAuditLogService,
  ],
})
export class AdminModule {}
