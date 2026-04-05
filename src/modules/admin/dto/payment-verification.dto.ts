import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RejectPaymentDto {
  @ApiPropertyOptional({
    description: 'Reason for rejecting the payment',
    example: 'Screenshot is not clear',
  })
  @IsString()
  reason!: string;
}

export class ListPendingPaymentsDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by payment method',
    enum: ['VODAFONE_CASH', 'INSTAPAY'],
    example: 'VODAFONE_CASH',
  })
  @IsOptional()
  @IsEnum(['VODAFONE_CASH', 'INSTAPAY'])
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Start date for filtering (ISO 8601)',
    example: '2026-04-01T00:00:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date for filtering (ISO 8601)',
    example: '2026-04-30T23:59:59Z',
  })
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;
}
