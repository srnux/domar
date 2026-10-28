# @domar/web

Domar's web app for every role: Next.js 16 (App Router), Tailwind CSS 4,
TanStack Query and next-intl. Pages are client components that fetch through
TanStack Query hooks.

For setup, run the commands in the [root README](../../README.md#try-it-locally);
[docs/development.md](../../docs/development.md) has the details. `pnpm dev`
in the repository root serves this app on **http://localhost:3002**.

## Talking to the API

The browser only calls relative `/api/...` paths. `next.config.ts` rewrites
them to `API_URL` (default `http://localhost:3001`). That same-origin setup is
what lets the httpOnly auth cookies and `<img src="/api/photos/:id">` work, so
never call the API by its own address from browser code. `API_URL` is read at
build time, so the Docker image is built with it as a build arg.

## Layout

```
src/app/
  (auth)/        login, invite/[token]
  (supervisor)/  dashboard, jobs, verify, bookings, manage/properties, manage/bills, users
  (worker)/      my-day, my-week, my-jobs/[id], bids
  (owner)/       properties, bills
  (admin)/admin  platform admin
  profile/
src/components/  shared components (ui/ = primitives, agenda/ = dashboard timeline)
src/lib/         API client, TanStack Query hooks, date and money helpers
messages/en.json all UI text
```

Each route group's layout gates access by role on the client; the API enforces
the actual permissions.

## Commands

| Script | What it does |
|---|---|
| `dev` | Dev server on `:3002` |
| `build` / `start` | Production build (standalone output) / serve it |
| `test` | Vitest unit tests |
| `lint` | ESLint |

## Conventions

- All UI text goes through next-intl keys in `messages/en.json`.
- Design tokens live in `src/app/globals.css` (`@theme`); there's no `tailwind.config`.
- Worker screens are also used by `apps/worker-mobile`, which keeps copies of
  the worker components and `lib/`. Mirror relevant changes there.
- Read [AGENTS.md](AGENTS.md) before relying on Next.js knowledge from older versions.
