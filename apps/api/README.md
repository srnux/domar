# @domar/api

Domar's REST API: NestJS 11, Prisma 6 and PostgreSQL. Every route is served
under `/api`.

For setup, run the commands in the [root README](../../README.md#try-it-locally);
[docs/development.md](../../docs/development.md) has the details. How the
pieces fit together is in [docs/architecture.md](../../docs/architecture.md).

## Commands

Run from the repository root with `pnpm --filter @domar/api <script>`, or from
this folder with `pnpm <script>`:

| Script | What it does |
|---|---|
| `start:dev` | Start with watch mode on `:3001` |
| `build` / `start:prod` | Compile to `dist/` / run the compiled app |
| `test` | Unit tests (`src/**/*.spec.ts`) |
| `test:e2e` | End-to-end tests (`test/*.e2e-spec.ts`) against a `domar_test` database |
| `lint` | ESLint, **with `--fix`** |
| `seed` | Load demo data (`prisma/seed.ts`); never in production |

## Layout

```
prisma/          schema.prisma, migrations/, seed.ts
src/
  auth/          login, refresh, JWT guard, roles guard
  admin/         platform-admin endpoints (/api/admin/companies)
  prisma/        Prisma service + tenant-scoping extension
  license/       seat limits per company
  jobs/          job CRUD and job-status.machine.ts (the lifecycle rules)
  bids/  ratings/  checklists/  photos/  comments/  activity/
  bookings/      bookings + turnover-suggestion.ts
  bills/         billing + PDF rendering
  properties/  users/  invites/  devices/  notifications/  health/
test/            e2e suites + test database setup
```

## Environment

Read from `.env` in this folder (copy [.env.example](.env.example)):

| Variable | Default | |
|---|---|---|
| `DATABASE_URL` | none | Required |
| `JWT_SECRET` | none | Required; the API won't start without it |
| `PORT` | `3001` | |
| `UPLOADS_DIR` | `./uploads` | Photos and avatars |
| `WEB_URL` | `http://localhost:3002` | Base of invite links |
| `COOKIE_SECURE` | `true` | Only applies when `NODE_ENV=production` |
| `CORS_ORIGINS` | empty | Extra cross-origin callers, comma-separated |
| `FIREBASE_SERVICE_ACCOUNT` | empty | Service-account JSON; enables push |
| `TEST_DATABASE_URL` | derived | e2e tests only |
