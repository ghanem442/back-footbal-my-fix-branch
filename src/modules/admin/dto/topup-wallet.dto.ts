import { IsUUID, IsNumber, Min, Max, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TopupWalletDto {
  @ApiProperty({
    description: 'User ID to topup wallet for',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  userId!: string;

  @ApiProperty({
    description: 'Amount to add to wallet (in EGP)',
    example: 1000,
    minimum: 1,
    maximum: 100000,
  })
  @IsNumber()
  @Min(1)
  @Max(100000)
  amount!: number;

  @ApiPropertyOptional({
    description: 'Description/reason for topup',
    example: 'Manual topup for testing',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
