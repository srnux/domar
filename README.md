# Domar

[![License: PolyForm Noncommercial](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-blue)](LICENSE.md)
![Node ≥ 24](https://img.shields.io/badge/node-%E2%89%A5%2024-339933)
![Status: early](https://img.shields.io/badge/status-early%20development-orange)

**Property-care operations for holiday rentals.** Domar runs the work between
guests (turnover cleanings, repairs, gardening, inspections) for a
property-care company and its clients:

- **Supervisors** plan, assign and review jobs, manage properties and bookings, and bill owners.
- **Workers** get their day on their phone (web, or the Android app, which also works offline) and work through checklists with photos.
- **Property owners** follow the work on their properties, rate it, and download their bills.

One installation can host several companies, each fully isolated from the others.

<p align="center">
  <img src="docs/images/supervisor-dashboard.png" alt="Supervisor dashboard with jobs needing attention and today's agenda per worker" width="100%">
</p>

<p align="center">
  <img src="docs/images/worker-my-day.png" alt="Worker's My Day screen on a phone" width="32%">
  &nbsp;
  <img src="docs/images/worker-job.png" alt="Worker's job screen with access notes and actions" width="32%">
</p>

## Features

- **Job lifecycle**: draft → assigned → accepted → in progress → done → verified. A server-side state machine decides who can do what, and supervisors can decline, reopen or cancel with a reason.
- **Turnover planning**: enter guest checkouts and Domar suggests a cleaning window, flagging back-to-back stays.
- **Assignment help**: workers are filtered by skill, and you're warned when a worker is already booked at that time.
- **Pricing and bids**: fixed or hourly prices per job, or open a job for bids and accept the best offer.
- **Checklists and photos**: per-property cleaning checklists, required photos, before/after/issue photos, and a job can't be finished until its checklist is complete.
- **Verification queue**: supervisors review finished work, then verify it or send it back.
- **Comments**: internal comments for the team, or shared ones the owner can read.
- **Billing**: build a bill from verified jobs plus extra costs, with optional VAT. Owners can download it as a PDF.
- **Owner portal**: work history, photos, comments, ratings and bills.
- **Worker app**: an Android app (Capacitor) with offline mode and optional push notifications.
- **Multi-company**: a platform admin creates companies and sets seat limits.

## Try it locally

You need Node.js 24 or newer, pnpm (`corepack enable`) and Docker.

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:up        # PostgreSQL in Docker
pnpm db:migrate   # apply migrations, generate the Prisma client
pnpm seed         # demo data
pnpm dev          # http://localhost:3002
```

Sign in with any demo account. They all use the password `Domar123!`:

| Account | Role |
|---|---|
| `ana@domar.test` | Supervisor |
| `marko@domar.test` | Worker |
| `klaus@domar.test` | Property owner |
| `admin@domar.test` | Platform admin |

[docs/development.md](docs/development.md) lists all accounts and covers tests,
the mobile app and troubleshooting.

## Documentation

- **[User guides](docs/README.md#using-domar)** for supervisors, workers and owners
- **[Self-hosting](docs/self-hosting.md)**: run Domar on your own server with Docker Compose
- **[Architecture](docs/architecture.md)** and **[development](docs/development.md)**
- **[Contributing](CONTRIBUTING.md)** and **[security policy](SECURITY.md)**

## Stack

| Path | What |
|---|---|
| [`apps/web`](apps/web) | Next.js 16 (App Router), Tailwind CSS 4, TanStack Query, next-intl |
| [`apps/api`](apps/api) | NestJS 11, Prisma 6, PostgreSQL 17 |
| [`apps/worker-mobile`](apps/worker-mobile) | Worker app: Vite, React 19, Capacitor 7 (Android) |
| [`packages/shared`](packages/shared) | TypeScript types and enums shared by all three |

## License

Domar is source-available under the
[PolyForm Noncommercial License 1.0.0](LICENSE.md). You may use, modify and
share it for any noncommercial purpose. Commercial use requires a separate
license from the copyright holder.
