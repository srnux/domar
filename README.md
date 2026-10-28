# Domar

Property-care operations for holiday rentals — turnover cleanings, repairs,
and servicing, with a mobile-first app for workers, a dashboard for
supervisors, and a read-only portal for property owners.

See the [documentation](docs/README.md) for user guides, self-hosting and
architecture.

## Stack

- `apps/web` — Next.js 16 (App Router), Tailwind, TanStack Query, next-intl
- `apps/api` — NestJS 11, Prisma, PostgreSQL
- `packages/shared` — pure TS types/enums shared by both

## Development

Prereqs: Node ≥ 24, pnpm (`corepack enable`), Docker with Compose v2.

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:up        # postgres on :5432 via docker-compose.dev.yml
pnpm db:migrate   # apply migrations + generate the Prisma client
pnpm seed         # optional demo data
pnpm dev          # api on :3001, web on http://localhost:3002 (proxies /api/* to the api)
```

After pulling changes that touch the database schema, run `pnpm db:migrate`
again. See [docs/development.md](docs/development.md) for a busy port 5432,
your own Postgres, or Docker inside WSL.

The web app talks to the API only through the Next.js rewrite proxy
(same-origin), which the httpOnly cookie auth depends on — never call
`localhost:3001` from browser code.

## Production (Docker Compose)

```sh
cp .env.example .env       # set POSTGRES_PASSWORD and JWT_SECRET
docker compose build
docker compose up -d       # app on http://localhost:8080
docker compose exec api node dist/prisma/seed.js   # optional demo data
```

Photos persist in the `domar_uploads` volume, data in `domar_pgdata`.
The api container runs `prisma migrate deploy` on every start.

## Testing

```sh
pnpm test                       # all workspaces
pnpm --filter @domar/api test:e2e   # needs the dev database running
```

## License

Domar is source-available under the
[PolyForm Noncommercial License 1.0.0](LICENSE.md). You may use, modify and
share it for any noncommercial purpose. Commercial use requires a separate
license from the copyright holder.

