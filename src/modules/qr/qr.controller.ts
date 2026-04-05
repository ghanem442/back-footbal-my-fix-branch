import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { QrService } from './qr.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ValidateQrDto } from './dto/validate-qr.dto';
import { VerifyBookingIdDto } from './dto/verify-booking-id.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BookingStatus } from '@prisma/client';

@ApiTags('QR Codes')
@Controller('qr')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class QrController {
  constructor(
    private readonly qrService: QrService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('validate')
  @Roles(Role.FIELD_OWNER)
  @ApiOperation({
    summary: 'Validate QR code',
    description: 'Field owners can scan and validate a booking QR code for check-in. Updates booking status to CHECKED_IN.',
  })
  @ApiBody({ type: ValidateQrDto })
  @ApiResponse({
    status: 200,
    description: 'QR code validated successfully',
    schema: {
      example: {
        success: true,
        message: 'Booking validated successfully',
        data: {
          bookingId: 'bk_123abc',
          status: 'CHECKED_IN',
          playerName: 'player@example.com',
          fieldName: 'Champions Field',
          scheduledStartTime: '14:00:00',
          scheduledEndTime: '16:00:00',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'QR code already used or booking not valid for today',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only validate bookings for own fields',
  })
  @ApiResponse({
    status: 404,
    description: 'QR code not found',
  })
  async validateQrCode(
    @Body() validateQrDto: ValidateQrDto,
    @CurrentUser() user: any,
  ) {
    const { qrToken } = validateQrDto;

    // Retrieve QR code with booking details
    const qrCode = await this.qrService.getQrCodeByToken(qrToken);

    if (!qrCode) {
      throw new NotFoundException('QR code not found');
    }

    // Check if QR code is already used
    if (qrCode.isUsed) {
      throw new BadRequestException('QR code has already been used');
    }

    const { booking } = qrCode;

    // Validate booking status is CONFIRMED
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Booking status is ${booking.status}, expected CONFIRMED`,
      );
    }

    // Validate scheduled date matches current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduledDate = new Date(booking.scheduledDate);
    scheduledDate.setHours(0, 0, 0, 0);

    if (scheduledDate.getTime() !== today.getTime()) {
      throw new BadRequestException(
        'Booking is not scheduled for today',
      );
    }

    // Validate field belongs to authenticated owner
    if (booking.field.ownerId !== user.userId) {
      throw new ForbiddenException(
        'You do not have permission to validate this booking',
      );
    }

    // Update booking status to CHECKED_IN
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CHECKED_IN },
    });

    // Record status change in history
    await this.prisma.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: BookingStatus.CONFIRMED,
        toStatus: BookingStatus.CHECKED_IN,
        reason: 'QR code validated by field owner',
      },
    });

    // Mark QR code as used
    await this.qrService.markQrCodeAsUsed(qrToken);

    return {
      success: true,
      message: 'Booking validated successfully',
      data: {
        bookingId: booking.id,
        status: BookingStatus.CHECKED_IN,
        playerName: booking.player.email,
        fieldName: booking.field.name,
        scheduledStartTime: booking.scheduledStartTime,
        scheduledEndTime: booking.scheduledEndTime,
      },
    };
  }

  @Post('verify-booking-id')
  @Roles(Role.FIELD_OWNER)
  @ApiOperation({
    summary: 'Verify booking by ID',
    description: 'Field owners can manually verify a booking using booking ID when QR scanning is unavailable. Updates booking status to CHECKED_IN.',
  })
  @ApiBody({ type: VerifyBookingIdDto })
  @ApiResponse({
    status: 200,
    description: 'Booking verified successfully',
    schema: {
      example: {
        success: true,
        message: 'Booking verified successfully',
        data: {
          bookingId: 'bk_123abc',
          status: 'CHECKED_IN',
          playerName: 'player@example.com',
          fieldName: 'Champions Field',
          scheduledStartTime: '14:00:00',
          scheduledEndTime: '16:00:00',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Booking not valid for today or status not CONFIRMED',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only verify bookings for own fields',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found',
  })
  async verifyBookingId(
    @Body() verifyBookingIdDto: VerifyBookingIdDto,
    @CurrentUser() user: any,
  ) {
    const { bookingId } = verifyBookingIdDto;

    // Retrieve booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        field: true,
        player: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate field belongs to authenticated owner
    if (booking.field.ownerId !== user.userId) {
      throw new ForbiddenException(
        'You do not have permission to verify this booking',
      );
    }

    // Validate booking status is CONFIRMED
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Booking status is ${booking.status}, expected CONFIRMED`,
      );
    }

    // Validate scheduled date matches current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduledDate = new Date(booking.scheduledDate);
    scheduledDate.setHours(0, 0, 0, 0);

    if (scheduledDate.getTime() !== today.getTime()) {
      throw new BadRequestException(
        'Booking is not scheduled for today',
      );
    }

    // Update booking status to CHECKED_IN
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CHECKED_IN },
    });

    // Record status change in history
    await this.prisma.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: BookingStatus.CONFIRMED,
        toStatus: BookingStatus.CHECKED_IN,
        reason: 'Booking verified manually by field owner (booking ID)',
      },
    });

    return {
      success: true,
      message: 'Booking verified successfully',
      data: {
        bookingId: booking.id,
        status: BookingStatus.CHECKED_IN,
        playerName: booking.player.email,
        fieldName: booking.field.name,
        scheduledStartTime: booking.scheduledStartTime,
        scheduledEndTime: booking.scheduledEndTime,
      },
    };
  }
}
