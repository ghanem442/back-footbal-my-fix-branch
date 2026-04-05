import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { AppConfigService } from '@config/config.service';

export interface FacebookProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
}

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: AppConfigService) {
    super({
      clientID: configService.get('oauth.facebook.appId'),
      clientSecret: configService.get('oauth.facebook.appSecret'),
      callbackURL: configService.get('oauth.facebook.callbackUrl'),
      scope: ['email'],
      profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
      enableProof: true, // Enable appsecret_proof for enhanced security
      state: true, // Enable state parameter for CSRF protection
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any, info?: any) => void,
  ): Promise<any> {
    const { id, emails, name, photos } = profile;

    // Extract user information from Facebook profile
    const user: FacebookProfile = {
      id,
      email: emails?.[0]?.value || '',
      firstName: name?.givenName || '',
      lastName: name?.familyName || '',
      picture: photos?.[0]?.value,
    };

    done(null, user);
  }
}
