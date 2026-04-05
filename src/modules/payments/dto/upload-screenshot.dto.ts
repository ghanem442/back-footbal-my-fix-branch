import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UploadScreenshotDto {
  @ApiPropertyOptional({
    description: 'Optional notes from the player about the payment',
    example: 'Paid at 3:00 PM via Vodafone Cash',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Transaction ID from the payment gateway',
    example: 'TXN123456789',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Sender phone number used for the transfer',
    example: '01098765432',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  senderNumber?: string;
}
