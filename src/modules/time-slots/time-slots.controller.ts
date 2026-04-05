import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TimeSlotsService } from './time-slots.service';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { QueryTimeSlotsDto } from './dto/query-time-slots.dto';
import { BulkCreateTimeSlotsDto } from './dto/bulk-create-time-slots.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { I18nService } from '@modules/i18n/i18n.service';

@ApiTags('Time Slots')
@Controller('time-slots')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class TimeSlotsController {
  constructor(
    private readonly timeSlotsService: TimeSlotsService,
    private readonly i18n: I18nService,
  ) {}

  @Post()
  @Roles(Role.FIELD_OWNER)
  @HttpCode(HttpStatus.CREATED)
  async createTimeSlot(
    @CurrentUser('userId') userId: string,
    @Body() createTimeSlotDto: CreateTimeSlotDto,
  ) {
    const timeSlot = await this.timeSlotsService.createTimeSlot(
      userId,
      createTimeSlotDto,
    );

    const message = await this.i18n.getBilingualMessage('timeSlot.created');

    return {
      success: true,
      data: timeSlot,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('bulk')
  @Roles(Role.FIELD_OWNER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Bulk create time slots',
    description: 'Field owners can create multiple time slots at once for recurring schedules. Validates no overlapping slots exist.',
  })
  @ApiBody({ type: BulkCreateTimeSlotsDto })
  @ApiResponse({
    status: 201,
    description: 'Time slots created successfully',
    schema: {
      example: {
        success: true,
        data: {
          created: 10,
          timeSlots: [],
        },
        message: {
          en: 'Time slots created successfully',
          ar: 'تم إنشاء الفترات الزمنية بنجاح',
        },
        timestamp: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid time range or overlapping slots',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only create slots for own fields',
  })
  async bulkCreateTimeSlots(
    @CurrentUser('userId') userId: string,
    @Body() bulkCreateDto: BulkCreateTimeSlotsDto,
  ) {
    const result = await this.timeSlotsService.bulkCreateTimeSlots(
      userId,
      bulkCreateDto,
    );

    const message = await this.i18n.getBilingualMessage('timeSlot.bulkCreated');

    return {
      success: true,
      data: result,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async queryTimeSlots(@Query() queryDto: QueryTimeSlotsDto) {
    const result = await this.timeSlotsService.queryTimeSlots(queryDto);

    const message = await this.i18n.getBilingualMessage(
      'timeSlot.listRetrieved',
    );

    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id')
  @Roles(Role.FIELD_OWNER)
  @HttpCode(HttpStatus.OK)
  async updateTimeSlot(
    @CurrentUser('userId') userId: string,
    @Param('id') timeSlotId: string,
    @Body() updateTimeSlotDto: UpdateTimeSlotDto,
  ) {
    const timeSlot = await this.timeSlotsService.updateTimeSlot(
      timeSlotId,
      userId,
      updateTimeSlotDto,
    );

    const message = await this.i18n.getBilingualMessage('timeSlot.updated');

    return {
      success: true,
      data: timeSlot,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @Roles(Role.FIELD_OWNER)
  @HttpCode(HttpStatus.OK)
  async deleteTimeSlot(
    @CurrentUser('userId') userId: string,
    @Param('id') timeSlotId: string,
  ) {
    await this.timeSlotsService.deleteTimeSlot(timeSlotId, userId);

    const message = await this.i18n.getBilingualMessage('timeSlot.deleted');

    return {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };
  }
}
