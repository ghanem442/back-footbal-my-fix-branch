import { IsString, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { OtpChannel } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({
    description: 'User ID to send OTP to',
    example: 'clh1234567890',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    description: 'Channel to send OTP through',
    enum: OtpChannel,
    example: OtpChannel.SMS,
  })
  @IsEnum(OtpChannel)
  @IsNotEmpty()
  channel!: OtpChannel;

  @ApiProperty({
    description: 'Purpose of the OTP (e.g., verification, password_reset)',
    example: 'verification',
  })
  @IsString()
  @IsNotEmpty()
  purpose!: string;
}
