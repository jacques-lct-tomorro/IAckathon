import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from './auth-cookie.config';
import { AuthService } from './auth.service';

type GoogleLoginBody = {
  credential?: string;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  async loginWithGoogle(
    @Body() body: GoogleLoginBody,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.verifyGoogleIdToken(
      body.credential ?? '',
    );
    const token = this.authService.signSessionToken(user);
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    return { user };
  }

  @Get('me')
  me(@Req() req: Request) {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token) {
      throw new UnauthorizedException();
    }
    const user = this.authService.verifySessionToken(token);
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(AUTH_COOKIE_NAME, {
      ...getAuthCookieOptions(),
      maxAge: undefined,
      expires: new Date(0),
    });
  }
}
