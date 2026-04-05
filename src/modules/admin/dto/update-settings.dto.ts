import { IsOptional, IsNumber, Min, Max } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  globalCommissionPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  depositPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cancellationRefundWindowHours?: number;
}
