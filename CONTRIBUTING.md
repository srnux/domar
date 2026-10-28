# Contributing to Domar

Thanks for your interest! Bug reports, ideas and pull requests are all welcome.

## Before you start

- **Bugs:** open an [issue](https://github.com/srnux/domar/issues/new/choose)
  with steps to reproduce.
- **Features or larger changes:** open an issue first to discuss the idea, so
  you don't spend time on something that won't fit.
- **Security problems:** please don't open a public issue; see
  [SECURITY.md](SECURITY.md).

## Setting up

Follow [docs/development.md](docs/development.md): Node.js 24+, pnpm, Docker,
then `pnpm install`, `pnpm db:up`, `pnpm db:migrate`, `pnpm seed`, `pnpm dev`.
[docs/architecture.md](docs/architecture.md) explains how the pieces fit
together.

## Making a change

1. Fork the repository and create a branch from `main`.
2. Keep the change focused: one fix or feature per pull request.
3. Add or update tests:
   - job lifecycle rules → `apps/api/src/jobs/job-status.machine.spec.ts`
   - API behaviour → an e2e suite in `apps/api/test/`
   - web helpers → Vitest tests next to the file in `apps/web/src/lib/`
4. Make sure everything passes:

   ```sh
   pnpm lint
   pnpm test
   pnpm --filter @domar/api test:e2e
   ```

5. Update the docs in `docs/` if users, self-hosters or developers would notice
   the change.
6. Open a pull request and fill in the template.

## Conventions

The ones that matter most (details in
[docs/development.md](docs/development.md#conventions)):

- The web app calls the API only through relative `/api/...` paths.
- No hardcoded UI text; use next-intl keys in `messages/en.json`.
- Job status changes go through `job-status.machine.ts`.
- Tenant-owned data carries a `companyId` and is scoped by the tenant extension.
- `packages/shared` contains types, enums and constants only.
- Worker UI changes usually need mirroring in `apps/worker-mobile`.
- Commit messages: imperative mood, e.g. "Add bid withdrawal to worker app".

## License

Domar is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE.md).
By contributing, you agree that your contribution is provided under the same
license.
