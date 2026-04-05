import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { OtpController } from './otp.controller';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { AppConfigModule } from '@config/config.module';
import { UsersModule } from '@modules/users/users.module';
import { SmsOtpChannel } from './channels/sms-otp-channel';
import { EmailOtpChannel } from './channels/email-otp-channel';

@Module({
  imports: [PrismaModule, AppConfigModule, UsersModule],
  controllers: [OtpController],
  providers: [OtpService, SmsOtpChannel, EmailOtpChannel],
  exports: [OtpService, SmsOtpChannel, EmailOtpChannel],
})
export class OtpModule {}
