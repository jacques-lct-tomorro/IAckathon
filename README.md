# OroScope

Monorepo for OroScope — an org-chart and team-health dashboard. The web app ingests CSV org data, renders an interactive organisation chart, and surfaces AI-generated team flags fetched from the API.

## Stack

- [Turborepo](https://turborepo.dev/) + [pnpm](https://pnpm.io/) workspaces
- `apps/web` — React 19 + Vite + TypeScript
- `apps/api` — NestJS 11 (Google OAuth, team-flags endpoints)
- `packages/typescript-config` — shared `tsconfig` presets
- `packages/eslint-config` — shared ESLint configs

## Layout

```
apps/
  api/      NestJS backend (auth, team-flags)
  web/      React + Vite frontend (org chart, team health)
packages/
  eslint-config/
  typescript-config/
```

## Getting started

Requirements: Node `>=18`, pnpm `9`.

```sh
pnpm install
pnpm dev
```

`pnpm dev` runs every app's `dev` script in parallel via Turborepo. To run just one:

```sh
pnpm dev --filter=web
pnpm dev --filter=api
```

## Scripts

Run from the repo root (all delegate to Turborepo):

| Script               | Description                          |
| -------------------- | ------------------------------------ |
| `pnpm dev`           | Start all apps in watch mode         |
| `pnpm build`         | Build all apps and packages          |
| `pnpm lint`          | Lint everything                      |
| `pnpm check-types`   | Type-check everything                |
| `pnpm format`        | Prettier-format `**/*.{ts,tsx,md}`   |

## Configuration

The API expects Google OAuth credentials and a JWT secret (see `apps/api/src/auth`). The web app reads its API base URL from `apps/web/src/constants.ts`.
