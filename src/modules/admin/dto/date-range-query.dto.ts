import { IsDateString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GroupByPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class DateRangeQueryDto {
  @ApiProperty({
    description: 'Start date for the query (ISO 8601)',
    example: '2024-01-01',
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    description: 'End date for the query (ISO 8601)',
    example: '2024-12-31',
  })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({
    description: 'Group results by time period',
    enum: GroupByPeriod,
    example: GroupByPeriod.MONTH,
  })
  @IsOptional()
  @IsEnum(GroupByPeriod)
  groupBy?: GroupByPeriod;
}
