import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'FCM device token for push notifications',
    example: 'fGHj3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiPropertyOptional({
    description: 'Unique device identifier',
    example: 'device-12345',
  })
  @IsString()
  @IsOptional()
  deviceId?: string;
}
