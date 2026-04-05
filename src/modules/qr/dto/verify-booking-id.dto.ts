import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyBookingIdDto {
  @ApiProperty({
    description: 'Booking ID to verify',
    example: 'clh1234567890',
  })
  @IsNotEmpty()
  @IsString()
  bookingId!: string;
}
