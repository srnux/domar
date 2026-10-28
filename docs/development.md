# Development

## Prerequisites

- Node.js 24 or newer
- pnpm (`corepack enable` sets up the version pinned in `package.json`)
- Docker with Compose v2, for the development database (or your own
  PostgreSQL, see below)

Works on macOS, Linux and Windows.

## First-time setup

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:up        # PostgreSQL on :5432, waits until it's healthy
pnpm db:migrate   # apply migrations + generate the Prisma client
pnpm seed         # demo data
pnpm dev
```

`pnpm dev` starts the shared package watcher, the API on `:3001` and the web
app on **http://localhost:3002**. On Windows, use PowerShell, or replace `cp`
with `copy`.

| Command | What it does |
|---|---|
| `pnpm db:up` / `pnpm db:down` | Start / stop the dev PostgreSQL container (data is kept in a volume) |
| `pnpm db:migrate` | Apply pending migrations and regenerate the Prisma client. Run it after pulling schema changes. |
| `pnpm seed` | Load the demo data (idempotent) |

### Port 5432 already in use

Start the database on another port, and use the same port in
`apps/api/.env`:

```sh
DOMAR_DB_PORT=5433 pnpm db:up                  # macOS / Linux
$env:DOMAR_DB_PORT=5433; pnpm db:up            # Windows PowerShell
```

```
DATABASE_URL="postgresql://domar:domar@127.0.0.1:5433/domar?schema=public"
```

### Using your own PostgreSQL

Skip `pnpm db:up` and point `DATABASE_URL` in `apps/api/.env` at your server.
The user needs permission to create databases (the e2e tests create
`domar_test`).

### Docker inside WSL (without Docker Desktop)

`pnpm db:up:wsl` / `pnpm db:down:wsl` run Compose in the `Ubuntu` WSL
distribution and keep WSL running in the background, so the database doesn't
stop when the terminal closes.

## Demo accounts

After seeding, every account uses the password `Domar123!`:

| Email | Company | Role |
|---|---|---|
| `admin@domar.test` | none | Platform admin (`/admin`) |
| `ana@domar.test` | Domar Zadar | Supervisor |
| `marko@domar.test`, `ivan@domar.test`, `petra@domar.test` | Domar Zadar | Workers |
| `zoran@domar.test` | Domar Zadar | Deactivated worker |
| `klaus@domar.test`, `lena@domar.test` | Domar Zadar | Owners |
| `bruno@adriatic.test` | Adriatic Care | Supervisor |
| `boris@adriatic.test` | Adriatic Care | Worker |
| `barbara@adriatic.test` | Adriatic Care | Owner |

The seed covers every job status, open-for-bids jobs with bids, bookings with
tight gaps, checklists with photo-required items and ratings, so every screen
has something to show. The second company makes it easy to check tenant
isolation. It's idempotent; re-run `pnpm seed` at any time.

**Seed fails with a unique-constraint error on `ownerUserId`?** Your dev
database predates multi-company support, and its migration moved the old data
into a *Default Company*. Start from an empty database:
`docker compose -f docker-compose.dev.yml down -v`, then `pnpm db:up`,
`pnpm db:migrate` and `pnpm seed`. This deletes all local dev data.

## Tests

```sh
pnpm test                          # unit tests, all workspaces
pnpm --filter @domar/api test:e2e  # API end-to-end tests against PostgreSQL
pnpm lint
```

The e2e suite runs against a separate `domar_test` database on the same server
as `DATABASE_URL` in `apps/api/.env`. It creates the database and applies
migrations on its own. To use a different server, set `TEST_DATABASE_URL`.

## Conventions

- **Never call the API from web browser code by its own address.** Always use
  relative `/api/...` paths; see [Architecture](architecture.md#request-flow).
  (The worker app is the exception: it uses `VITE_API_BASE` and Bearer tokens.)
- **No hardcoded UI text.** Add a key to `apps/web/messages/en.json` (and
  `apps/worker-mobile/src/messages/en.json` for worker screens).
- **Tenant-owned data needs `companyId`.** New models that belong to a company
  get a `companyId` column and an entry in the tenant extension's model list
  (`apps/api/src/prisma/tenant.extension.ts`); see
  [Architecture](architecture.md#multi-tenancy).
- **Worker UI changes usually belong in both apps.** `apps/worker-mobile` keeps
  copies of the web app's worker components and `lib/`.
- **Job status changes go through the state machine** (`PATCH /api/jobs/:id/transition`),
  not dedicated endpoints. Extend `job-status.machine.ts` and its tests first.
- **`packages/shared` stays pure:** types, enums and constants only.
- Database changes: edit `apps/api/prisma/schema.prisma`, then
  `pnpm --filter @domar/api exec prisma migrate dev --name <change>`.

## Testing on a phone

Camera capture needs HTTPS (or `localhost`). To test on a real device over
your LAN, run the web app with `next dev --experimental-https`, or use the
production stack behind a TLS proxy.

## The worker app

`pnpm dev` doesn't start the worker app. To run it in a browser, use these
instead of `pnpm dev`, each in its own terminal (the API needs the app's
origin allowed):

```sh
cp apps/worker-mobile/.env.example apps/worker-mobile/.env
pnpm --filter @domar/shared build
CORS_ORIGINS=http://localhost:5173 pnpm --filter @domar/api start:dev
pnpm --filter @domar/worker-mobile dev        # http://localhost:5173
```

On Windows PowerShell, set the variable first: `$env:CORS_ORIGINS="http://localhost:5173"`.

Sign in as a worker, e.g. `marko@domar.test`. Building and running the Android
app, and enabling push, are covered in the
[worker app README](../apps/worker-mobile/README.md).
