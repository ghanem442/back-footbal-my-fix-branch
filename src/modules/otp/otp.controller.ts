import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { OtpService } from './otp.service';
import { UsersService } from '@modules/users/users.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('OTP')
@Controller('otp')
export class OtpController {
  constructor(
    private otpService: OtpService,
    private usersService: UsersService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send OTP',
    description: 'Generate and send a 6-digit OTP via SMS or Email. OTP expires in 10 minutes. Rate limited to prevent abuse.',
  })
  @ApiBody({ type: SendOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    schema: {
      example: {
        success: true,
        message: 'OTP sent successfully via SMS',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'User already verified or missing contact information',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async sendOtp(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    sendOtpDto: SendOtpDto,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // Validate user exists
    const user = await this.usersService.findById(sendOtpDto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate user is not already verified
    if (user.isVerified) {
      throw new BadRequestException('User is already verified');
    }

    // Determine recipient based on channel
    let recipient: string;
    if (sendOtpDto.channel === 'SMS') {
      if (!user.phoneNumber) {
        throw new BadRequestException('User does not have a phone number');
      }
      recipient = user.phoneNumber;
    } else if (sendOtpDto.channel === 'EMAIL') {
      if (!user.email) {
        throw new BadRequestException('User does not have an email address');
      }
      recipient = user.email;
    } else {
      throw new BadRequestException('Invalid OTP channel');
    }

    // Create and send OTP
    await this.otpService.createAndSendOtp(
      sendOtpDto.userId,
      sendOtpDto.channel,
      recipient,
      sendOtpDto.purpose,
    );

    return {
      success: true,
      message: `OTP sent successfully via ${sendOtpDto.channel}`,
    };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP',
    description: 'Verify OTP code and mark user as verified. OTP is single-use and expires after 10 minutes. Locked after 5 failed attempts.',
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully',
    schema: {
      example: {
        success: true,
        message: 'OTP verified successfully. User is now verified.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid OTP, expired OTP, or OTP locked due to too many attempts',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async verifyOtp(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    verifyOtpDto: VerifyOtpDto,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // Validate user exists
    const user = await this.usersService.findById(verifyOtpDto.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify the OTP code
    await this.otpService.verifyOtp(
      verifyOtpDto.userId,
      verifyOtpDto.code,
      verifyOtpDto.purpose,
    );

    // Mark user as verified
    await this.usersService.markAsVerified(verifyOtpDto.userId);

    return {
      success: true,
      message: 'OTP verified successfully. User is now verified.',
    };
  }
}
