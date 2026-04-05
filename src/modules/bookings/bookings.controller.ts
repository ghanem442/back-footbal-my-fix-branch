import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ParseEnumPipe,
  ParseIntPipe,
  NotFoundException,
  ForbiddenException,
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
import { BookingsService } from './bookings.service';
import { CreateBookingDto, CancelBookingDto, QueryOwnerBookingsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, BookingStatus } from '@prisma/client';
import { QrService } from '../qr/qr.service';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly qrService: QrService,
  ) {}

  @Post()
  @Roles(Role.PLAYER)
  @ApiOperation({
    summary: 'Create a booking',
    description: 'Players can create a booking for an available time slot. Booking will be in PENDING_PAYMENT status with 15-minute payment deadline.',
  })
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({
    status: 201,
    description: 'Booking created successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'bk_123abc',
          timeSlotId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'PENDING_PAYMENT',
          totalPrice: 200.00,
          depositAmount: 50.00,
          paymentDeadline: '2024-01-15T10:45:00Z',
        },
        message: {
          en: 'Booking created successfully',
          ar: 'تم إنشاء الحجز بنجاح',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Time slot not available or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only players can create bookings',
  })
  async createBooking(@Request() req: any, @Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(req.user.userId, dto);
  }

  @Get()
  async getUserBookings(
    @Request() req: any,
    @Query('status') status?: BookingStatus,
    @Query('fieldId') fieldId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.bookingsService.getUserBookings(req.user.userId, {
      status,
      fieldId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
    });
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my bookings grouped by category' })
  @ApiQuery({ name: 'category', required: false, enum: ['upcoming', 'cancelled', 'played', 'expired', 'all'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyBookings(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const statusMap: Record<string, BookingStatus[]> = {
      upcoming: [BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT],
      cancelled: [BookingStatus.CANCELLED, BookingStatus.CANCELLED_REFUNDED, BookingStatus.CANCELLED_NO_REFUND],
      played: [BookingStatus.PLAYED, BookingStatus.CHECKED_IN, BookingStatus.COMPLETED],
      expired: [BookingStatus.EXPIRED_NO_SHOW, BookingStatus.PAYMENT_FAILED, BookingStatus.NO_SHOW],
    };

    const statuses = category && statusMap[category] ? statusMap[category] : undefined;

    return this.bookingsService.getUserBookings(req.user.userId, {
      statuses,
      page,
      limit,
    });
  }

  @Get('owner')
  @Roles(Role.FIELD_OWNER)
  @ApiOperation({
    summary: 'Get bookings for field owner',
    description: 'Field owners can retrieve all bookings for their fields with player information, payment status, and QR code details.',
  })
  @ApiQuery({
    name: 'fieldId',
    required: false,
    description: 'Filter by specific field ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: BookingStatus,
    description: 'Filter by booking status',
    example: 'CONFIRMED',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter bookings from this date (ISO 8601)',
    example: '2024-01-15T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter bookings until this date (ISO 8601)',
    example: '2024-01-20T23:59:59Z',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Owner bookings retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          bookings: [
            {
              id: 'bk_123abc456def',
              fieldId: 'field_uuid_here',
              fieldName: 'Champions Field',
              fieldNameAr: 'ملعب الأبطال',
              playerId: 'player_uuid_here',
              playerName: 'John Doe',
              email: 'player@example.com',
              phone: '+201234567890',
              scheduledDate: '2024-01-20T00:00:00.000Z',
              scheduledStartTime: '1970-01-01T16:00:00.000Z',
              scheduledEndTime: '1970-01-01T17:30:00.000Z',
              status: 'CONFIRMED',
              paymentStatus: 'COMPLETED',
              depositAmount: 40.00,
              remainingAmount: 160.00,
              totalPrice: 200.00,
              isCheckedIn: false,
              checkedInAt: null,
              hasQr: true,
              qrToken: 'qr_abc123xyz',
              createdAt: '2024-01-15T10:30:00.000Z',
              updatedAt: '2024-01-15T10:35:00.000Z',
            },
          ],
          pagination: {
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
          },
        },
        message: {
          en: 'Owner bookings retrieved successfully',
          ar: 'تم جلب حجوزات المالك بنجاح',
        },
        timestamp: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only field owners can access this endpoint',
  })
  async getOwnerBookings(
    @Request() req: any,
    @Query() queryDto: QueryOwnerBookingsDto,
  ) {
    const result = await this.bookingsService.getOwnerBookings(
      req.user.userId,
      {
        fieldId: queryDto.fieldId,
        status: queryDto.status,
        startDate: queryDto.startDate ? new Date(queryDto.startDate) : undefined,
        endDate: queryDto.endDate ? new Date(queryDto.endDate) : undefined,
        page: queryDto.page,
        limit: queryDto.limit,
      },
    );

    return {
      success: true,
      data: result,
      message: {
        en: 'Owner bookings retrieved successfully',
        ar: 'تم جلب حجوزات المالك بنجاح',
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  async getBookingById(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bookingsService.getBookingById(id, req.user.userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel a booking',
    description: 'Cancel a booking and receive refund based on cancellation policy. Refund: 100% if >24h before, 50% if 12-24h before, 0% if <12h before.',
  })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiBody({ type: CancelBookingDto })
  @ApiResponse({
    status: 200,
    description: 'Booking cancelled successfully',
    schema: {
      example: {
        success: true,
        data: {
          booking: {
            id: 'bk_123abc',
            status: 'CANCELLED',
          },
          refund: {
            amount: 100.00,
            percentage: 50,
          },
        },
        message: {
          en: 'Booking cancelled successfully. Refund: 50%',
          ar: 'تم إلغاء الحجز بنجاح. المبلغ المسترد: 50%',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only cancel own bookings',
  })
  async cancelBooking(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
  ) {
    const result = await this.bookingsService.cancelBooking(
      id,
      req.user.userId,
      dto.reason,
    );

    return {
      success: true,
      data: {
        booking: result.booking,
        refund: {
          amount: result.refundAmount,
          percentage: result.refundPercentage,
        },
      },
      message: {
        en: `Booking cancelled successfully. Refund: ${result.refundPercentage}%`,
        ar: `تم إلغاء الحجز بنجاح. المبلغ المسترد: ${result.refundPercentage}%`,
      },
    };
  }

  @Patch(':id/no-show')
  @Roles(Role.FIELD_OWNER)
  @ApiOperation({
    summary: 'Mark booking as no-show',
    description: 'Field owners can mark a booking as no-show when player does not arrive. Player loses deposit and gets suspended after 3 no-shows.',
  })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Booking marked as no-show successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'bk_123abc',
          status: 'NO_SHOW',
          noShowCount: 1,
        },
        message: {
          en: 'Booking marked as no-show',
          ar: 'تم تحديد الحجز كعدم حضور',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only mark bookings for own fields',
  })
  async markNoShow(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const ownerId = req.user.sub;
    const booking = await this.bookingsService.markNoShow(id, ownerId);

    // Get player's updated info
    const player = await this.bookingsService['prisma'].user.findUnique({
      where: { id: booking.playerId },
      select: { 
        noShowCount: true,
        suspendedUntil: true,
      },
    });

    const isSuspended = player?.suspendedUntil ? player.suspendedUntil > new Date() : false;

    return {
      success: true,
      data: {
        booking: {
          id: booking.id,
          status: booking.status,
        },
        player: {
          noShowCount: player?.noShowCount || 0,
          isSuspended,
          suspendedUntil: player?.suspendedUntil || null,
        },
      },
      message: {
        en: isSuspended 
          ? 'Booking marked as no-show. Player has been suspended.'
          : 'Booking marked as no-show',
        ar: isSuspended
          ? 'تم تحديد الحجز كعدم حضور. تم إيقاف اللاعب.'
          : 'تم تحديد الحجز كعدم حضور',
      },
    };
  }

  @Get(':id/qr')
  @Roles(Role.PLAYER)
  @ApiOperation({
    summary: 'Get booking QR code',
    description: 'Retrieve the QR code for a confirmed booking. QR code can be scanned by field owner for check-in.',
  })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'QR code retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          qrToken: 'qr_abc123xyz',
          imageUrl: 'https://example.com/qr/booking-qr.png',
          isUsed: false,
          usedAt: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Booking or QR code not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Can only access own booking QR codes',
  })
  async getBookingQrCode(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    // Get booking to verify ownership
    const booking = await this.bookingsService.getBookingById(
      id,
      req.user.userId,
    );

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify booking belongs to authenticated player
    if (booking.playerId !== req.user.userId) {
      throw new ForbiddenException(
        'You do not have permission to access this QR code',
      );
    }

    // Get QR code
    const qrCode = await this.qrService.getQrCodeByBookingId(id);

    if (!qrCode) {
      throw new NotFoundException('QR code not found for this booking');
    }

    return {
      success: true,
      data: {
        qrToken: qrCode.qrToken,
        imageUrl: qrCode.imageUrl,
        isUsed: qrCode.isUsed,
        usedAt: qrCode.usedAt,
      },
    };
  }
}
