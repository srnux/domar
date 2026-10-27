# Development

## Prerequisites

- Node.js 24 or newer
- pnpm (`corepack enable` sets up the version pinned in `package.json`)
- Docker, for the development database

## First-time setup

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL on :5432
pnpm --filter @domar/api exec prisma migrate dev
pnpm seed                                       # demo data
pnpm dev
```

`pnpm dev` starts the shared package watcher, the API on `:3001` and the web
app on **http://localhost:3002**.

> `pnpm db:up` / `pnpm db:down` are shortcuts for Windows with Docker inside
> WSL. On macOS, Linux or Docker Desktop, use the `docker compose` command
> above.

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

The e2e suite needs the development database running.

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
