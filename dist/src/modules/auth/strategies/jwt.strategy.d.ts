import { Strategy } from 'passport-jwt';
import { AppConfigService } from '@config/config.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthService } from '../auth.service';
import { Request } from 'express';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    private authService;
    constructor(configService: AppConfigService, authService: AuthService);
    validate(request: Request, payload: JwtPayload): Promise<JwtPayload>;
}
export {};
