import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceDto, UnregisterDeviceDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { I18nService } from '../i18n/i18n.service';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly i18n: I18nService,
  ) {}

  @Post('register-device')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register device for push notifications',
    description: 'Register a device FCM token to receive push notifications. Supports multiple devices per user.',
  })
  @ApiBody({ type: RegisterDeviceDto })
  @ApiResponse({
    status: 200,
    description: 'Device registered successfully',
    schema: {
      example: {
        success: true,
        message: {
          en: 'Device registered successfully',
          ar: 'تم تسجيل الجهاز بنجاح',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  async registerDevice(
    @CurrentUser('userId') userId: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    await this.notificationsService.registerDevice(
      userId,
      dto.token,
      dto.deviceId,
    );

    const message = await this.i18n.getBilingualMessage(
      'notification.deviceRegistered',
    );

    return {
      success: true,
      message,
    };
  }

  @Delete('unregister-device')
  @HttpCode(HttpStatus.OK)
  async unregisterDevice(@Body() dto: UnregisterDeviceDto) {
    await this.notificationsService.unregisterDevice(dto.token);

    const message = await this.i18n.getBilingualMessage(
      'notification.deviceUnregistered',
    );

    return {
      success: true,
      message,
    };
  }
}
