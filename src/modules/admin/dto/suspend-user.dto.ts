import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SuspendUserDto {
  @ApiPropertyOptional({
    description: 'Date until user is suspended (ISO 8601). Set to null to unsuspend.',
    example: '2024-12-31',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  suspendedUntil?: string | null;
}
