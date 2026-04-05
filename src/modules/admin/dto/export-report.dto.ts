import { IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ReportType {
  REVENUE = 'revenue',
  BOOKINGS = 'bookings',
  USERS = 'users',
  FIELDS = 'fields',
}

export class ExportReportDto {
  @ApiProperty({
    description: 'Type of report to export',
    enum: ReportType,
    example: ReportType.REVENUE,
  })
  @IsEnum(ReportType)
  reportType!: ReportType;

  @ApiProperty({
    description: 'Start date for report data (ISO 8601)',
    example: '2024-01-01',
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    description: 'End date for report data (ISO 8601)',
    example: '2024-12-31',
  })
  @IsDateString()
  endDate!: string;
}
