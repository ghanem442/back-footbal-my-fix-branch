import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FieldsModule } from '../fields/fields.module';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [PrismaModule, FieldsModule, BookingsModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
