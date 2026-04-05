import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingConfirmationService } from './booking-confirmation.service';
import { CancellationPolicyService } from './cancellation-policy.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { QrModule } from '../qr/qr.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlatformWalletModule } from '@modules/platform-wallet/platform-wallet.module';

import { BookingsCronService } from './bookings-cron.service';

@Module({
  imports: [PrismaModule, WalletModule, QrModule, NotificationsModule, PlatformWalletModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingConfirmationService, CancellationPolicyService, BookingsCronService],
  exports: [BookingsService, BookingConfirmationService, CancellationPolicyService],
})
export class BookingsModule {}
