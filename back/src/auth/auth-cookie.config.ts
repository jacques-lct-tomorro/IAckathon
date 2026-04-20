import type { CookieOptions } from 'express';

const DEFAULT_AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const AUTH_COOKIE_NAME = 'auth_token';

function parseSessionSameSite(): CookieOptions['sameSite'] {
  const raw = (process.env.SESSION_COOKIE_SAMESITE ?? 'lax').toLowerCase();
  if (raw === 'none') {
    return 'none';
  }
  if (raw === 'strict') {
    return 'strict';
  }
  return 'lax';
}

function parseSessionSecure(sameSite: CookieOptions['sameSite']): boolean {
  const fromEnv = process.env.SESSION_COOKIE_SECURE?.trim();
  if (fromEnv) {
    return fromEnv === 'true' || fromEnv === '1';
  }
  if (sameSite === 'none') {
    return true;
  }
  return process.env.NODE_ENV === 'production';
}

function parseAuthCookieMaxAgeMs(): number {
  const raw = process.env.AUTH_COOKIE_MAX_AGE_MS;
  if (!raw) {
    return DEFAULT_AUTH_COOKIE_MAX_AGE_MS;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_AUTH_COOKIE_MAX_AGE_MS;
}

export function getAuthCookieOptions(): CookieOptions {
  const sameSite = parseSessionSameSite();
  return {
    httpOnly: true,
    sameSite,
    secure: parseSessionSecure(sameSite),
    maxAge: parseAuthCookieMaxAgeMs(),
    path: '/',
  };
}
