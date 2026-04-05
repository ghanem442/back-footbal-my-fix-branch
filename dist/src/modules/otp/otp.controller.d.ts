import { OtpService } from './otp.service';
import { UsersService } from '@modules/users/users.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
export declare class OtpController {
    private otpService;
    private usersService;
    constructor(otpService: OtpService, usersService: UsersService);
    sendOtp(sendOtpDto: SendOtpDto): Promise<{
        success: boolean;
        message: string;
    }>;
    verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{
        success: boolean;
        message: string;
    }>;
}
