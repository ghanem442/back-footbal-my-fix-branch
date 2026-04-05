import { ApiProperty } from '@nestjs/swagger';

export class DashboardMetricsDto {
  @ApiProperty({
    description: 'Number of active bookings',
    example: 45,
  })
  activeBookings!: number;

  @ApiProperty({
    description: 'Number of pending payments',
    example: 12,
  })
  pendingPayments!: number;

  @ApiProperty({
    description: 'Total number of users',
    example: 1250,
  })
  totalUsers!: number;

  @ApiProperty({
    description: 'Total number of fields',
    example: 78,
  })
  totalFields!: number;

  @ApiProperty({
    description: 'Total number of bookings',
    example: 3456,
  })
  totalBookings!: number;

  @ApiProperty({
    description: 'Today\'s revenue',
    example: 5420.50,
  })
  todayRevenue!: number;

  @ApiProperty({
    description: 'Today\'s commission earned',
    example: 1355.12,
  })
  todayCommission!: number;
}
