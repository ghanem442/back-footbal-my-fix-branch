import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnregisterDeviceDto {
  @ApiProperty({
    description: 'FCM device token to unregister',
    example: 'fGHj3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
