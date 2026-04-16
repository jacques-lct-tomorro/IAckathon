import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  validateLogin(username: string, password: string): string {
    const rawUsers = this.configService.get<string>('AUTH_USERS') ?? '';
    const allowedUsers = rawUsers
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);

    const expectedPassword = this.configService.get<string>('AUTH_PASSWORD') ?? '';

    if (!allowedUsers.length || !expectedPassword) {
      throw new UnauthorizedException('Authentication is not configured.');
    }

    const normalizedUser = String(username ?? '').trim();
    const normalizedPassword = String(password ?? '');

    if (!normalizedUser || !normalizedPassword) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    const matchedUser = allowedUsers.find(
      (u) => u.toLowerCase() === normalizedUser.toLowerCase(),
    );

    if (!matchedUser || normalizedPassword !== expectedPassword) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    return matchedUser;
  }
}
