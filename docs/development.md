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

| Email | Role |
|---|---|
| `ana@domar.test` | Supervisor |
| `marko@domar.test`, `ivan@domar.test`, `petra@domar.test` | Workers |
| `klaus@domar.test`, `lena@domar.test` | Owners |

The seed covers every job status, bookings with tight gaps and checklists with
photo-required items, so every screen has something to show. It's idempotent;
re-run `pnpm seed` at any time.

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

- **Never call the API from browser code by its own address.** Always use
  relative `/api/...` paths; see [Architecture](architecture.md#request-flow).
- **No hardcoded UI text.** Add a key to `apps/web/messages/en.json`.
- **Job status changes go through the state machine** (`PATCH /api/jobs/:id/transition`),
  not dedicated endpoints. Extend `job-status.machine.ts` and its tests first.
- **`packages/shared` stays pure:** types, enums and constants only.
- Database changes: edit `apps/api/prisma/schema.prisma`, then
  `pnpm --filter @domar/api exec prisma migrate dev --name <change>`.

## Testing on a phone

Camera capture needs HTTPS (or `localhost`). To test on a real device over
your LAN, run the web app with `next dev --experimental-https`, or use the
production stack behind a TLS proxy.
