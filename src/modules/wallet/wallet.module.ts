import { Module, forwardRef } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { PaymentModule } from '@modules/payments/payment.module';

@Module({
  imports: [PrismaModule, forwardRef(() => PaymentModule)],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
