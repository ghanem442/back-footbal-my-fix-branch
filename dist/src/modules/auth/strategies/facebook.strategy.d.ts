import { Strategy, Profile } from 'passport-facebook';
import { AppConfigService } from '@config/config.service';
export interface FacebookProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    picture?: string;
}
declare const FacebookStrategy_base: new (...args: [options: import("passport-facebook").StrategyOptionsWithRequest] | [options: import("passport-facebook").StrategyOptions]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class FacebookStrategy extends FacebookStrategy_base {
    private configService;
    constructor(configService: AppConfigService);
    validate(accessToken: string, refreshToken: string, profile: Profile, done: (error: any, user?: any, info?: any) => void): Promise<any>;
}
export {};
