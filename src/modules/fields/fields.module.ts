import { Module } from '@nestjs/common';
import { FieldsController } from './fields.controller';
import { FieldsService } from './fields.service';
import { PrismaModule } from '@modules/prisma/prisma.module';
import { I18nModule } from '@modules/i18n/i18n.module';
import { StorageModule } from '@modules/storage/storage.module';

@Module({
  imports: [PrismaModule, I18nModule, StorageModule],
  controllers: [FieldsController],
  providers: [FieldsService],
  exports: [FieldsService],
})
export class FieldsModule {}
