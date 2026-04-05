import { IsString, IsEnum, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Initiate Payment DTO
 * 
 * Data transfer object for initiating a payment for a booking.
 */
export class InitiatePaymentDto {
  @ApiProperty({
    description: 'Booking ID to pay for',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  bookingId!: string;

  @ApiProperty({
    description: 'Payment gateway to use',
    enum: ['stripe', 'fawry', 'vodafone_cash', 'instapay', 'wallet'],
    example: 'stripe',
  })
  @IsEnum(['stripe', 'fawry', 'vodafone_cash', 'instapay', 'wallet'])
  @IsNotEmpty()
  gateway!: 'stripe' | 'fawry' | 'vodafone_cash' | 'instapay' | 'wallet';

  @ApiPropertyOptional({
    description: 'Additional metadata for the payment',
    example: { phoneNumber: '+201234567890', email: 'user@example.com' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
