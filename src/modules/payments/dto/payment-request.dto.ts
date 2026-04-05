import { IsString, IsNumber, IsOptional, IsObject, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Payment Request DTO
 * 
 * Data transfer object for initiating payment requests.
 */
export class PaymentRequestDto {
  @ApiProperty({
    description: 'Booking ID for the payment',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  bookingId!: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 200.00,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'EGP',
    default: 'EGP',
  })
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @ApiProperty({
    description: 'User ID making the payment',
    example: 'user-uuid-123',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the payment',
    example: { fieldName: 'Stadium A', timeSlot: '14:00-16:00' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
