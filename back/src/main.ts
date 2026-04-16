import { NestFactory } from '@nestjs/core';
import session from 'express-session';
import type { Application } from 'express';
import { AppModule } from './app.module';

const DEFAULT_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function parseSessionSameSite(): 'lax' | 'strict' | 'none' {
  const raw = (process.env.SESSION_COOKIE_SAMESITE ?? 'lax').toLowerCase();
  if (raw === 'none') {
    return 'none';
  }
  if (raw === 'strict') {
    return 'strict';
  }
  return 'lax';
}

function parseSessionSecure(sameSite: 'lax' | 'strict' | 'none'): boolean {
  const fromEnv = process.env.SESSION_COOKIE_SECURE?.trim();
  if (fromEnv) {
    return fromEnv === 'true' || fromEnv === '1';
  }
  if (sameSite === 'none') {
    return true;
  }
  return process.env.NODE_ENV === 'production';
}

function parseSessionMaxAgeMs(): number {
  const raw = process.env.SESSION_MAX_AGE_MS;
  if (!raw) {
    return DEFAULT_SESSION_MAX_AGE_MS;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SESSION_MAX_AGE_MS;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance() as Application;
  expressApp.set('trust proxy', 1);

  const sameSite = parseSessionSameSite();
  const secure = parseSessionSecure(sameSite);

  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? 'dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite,
        secure,
        maxAge: parseSessionMaxAgeMs(),
      },
    }),
  );
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
