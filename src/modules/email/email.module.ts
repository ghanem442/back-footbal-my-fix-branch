import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { AppConfigModule } from '@config/config.module';

@Module({
  imports: [AppConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
