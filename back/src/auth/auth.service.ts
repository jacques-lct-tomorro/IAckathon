import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';

export type AuthUser = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
};

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  private readonly googleClientId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.googleClientId =
      this.configService.get<string>('GOOGLE_CLIENT_ID') ?? '';
    this.googleClient = new OAuth2Client(this.googleClientId);
  }

  async verifyGoogleIdToken(idToken: string): Promise<AuthUser> {
    const normalizedToken = String(idToken ?? '').trim();
    if (!normalizedToken) {
      throw new UnauthorizedException('Google credential is missing.');
    }

    if (!this.googleClientId) {
      throw new UnauthorizedException(
        'Google authentication is not configured.',
      );
    }

    let payload:
      | {
          sub?: string;
          email?: string;
          name?: string;
          picture?: string;
          email_verified?: boolean;
        }
      | undefined;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: normalizedToken,
        audience: this.googleClientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Google credential is invalid.');
    }

    if (!payload?.sub || !payload.email || !payload.name) {
      throw new UnauthorizedException('Google account payload is invalid.');
    }

    if (payload.email_verified === false) {
      throw new UnauthorizedException('Google email is not verified.');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture ?? undefined,
    };
  }

  signSessionToken(user: AuthUser): string {
    return this.jwtService.sign(user);
  }

  verifySessionToken(token: string): AuthUser {
    try {
      return this.jwtService.verify<AuthUser>(token);
    } catch {
      throw new UnauthorizedException('Session is invalid or expired.');
    }
  }
}
