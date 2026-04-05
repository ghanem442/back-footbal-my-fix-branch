import { Module } from '@nestjs/common';
import { TimeSlotsController } from './time-slots.controller';
import { TimeSlotsService } from './time-slots.service';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { I18nModule } from '@modules/i18n/i18n.module';

@Module({
  imports: [PrismaModule, I18nModule],
  controllers: [TimeSlotsController],
  providers: [TimeSlotsService],
  exports: [TimeSlotsService],
})
export class TimeSlotsModule {}
