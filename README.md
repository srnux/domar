# Domar

Property-care operations for holiday rentals — turnover cleanings, repairs,
and servicing, with a mobile-first app for workers, a dashboard for
supervisors, and a read-only portal for property owners.

See [docs/design.md](docs/design.md) for the full design and milestone plan.

## Stack

- `apps/web` — Next.js 16 (App Router), Tailwind, TanStack Query, next-intl
- `apps/api` — NestJS 11, Prisma, PostgreSQL
- `packages/shared` — pure TS types/enums shared by both

## Development

Prereqs: Node ≥ 24, pnpm, Docker (works via WSL: `wsl docker ...`).

```sh
pnpm install
pnpm db:up        # postgres via docker-compose.dev.yml (WSL docker)
pnpm dev          # api on :3001, web on :3002 (3000 is often taken by WSL dev servers) (proxies /api/* to the api)
```

The web app talks to the API only through the Next.js rewrite proxy
(same-origin), which the httpOnly cookie auth depends on — never call
`localhost:3001` from browser code.

## Testing

```sh
pnpm test                       # all workspaces
pnpm --filter @domar/api test:e2e
```

