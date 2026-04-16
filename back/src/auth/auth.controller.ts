import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';

type LoginBody = {
  username?: string;
  password?: string;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginBody, @Req() req: Request) {
    const username = this.authService.validateLogin(
      body.username ?? '',
      body.password ?? '',
    );
    req.session.user = username;
    return { username };
  }

  @Get('me')
  me(@Req() req: Request) {
    if (!req.session?.user) {
      throw new UnauthorizedException();
    }
    return { username: req.session.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
