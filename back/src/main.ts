import * as fs from 'node:fs';
import * as path from 'node:path';
import { NestFactory } from '@nestjs/core';
import connectSqlite3 from 'connect-sqlite3';
import session from 'express-session';
import type { Application } from 'express';
import { AppModule } from './app.module';

const SqliteStore = connectSqlite3(session);

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

function resolveSessionSqlitePath(): string {
  const raw = process.env.SESSION_SQLITE_PATH?.trim();
  if (raw) {
    return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  }
  return path.resolve(process.cwd(), 'data', 'sessions.sqlite');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance() as Application;
  expressApp.set('trust proxy', 1);

  const sameSite = parseSessionSameSite();
  const secure = parseSessionSecure(sameSite);
  const maxAge = parseSessionMaxAgeMs();

  const sqliteFile = resolveSessionSqlitePath();
  const sqliteDir = path.dirname(sqliteFile);
  const sqliteDbName = path.basename(sqliteFile);
  fs.mkdirSync(sqliteDir, { recursive: true });

  app.use(
    session({
      store: new SqliteStore({
        db: sqliteDbName,
        dir: sqliteDir,
        createDirIfNotExists: true,
        concurrentDb: true,
      }),
      secret: process.env.SESSION_SECRET ?? 'dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite,
        secure,
        maxAge,
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
