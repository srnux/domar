# Debian slim, not Alpine: Prisma's engines want glibc + OpenSSL 3.
FROM node:24-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

WORKDIR /repo

# layer-cache the install on lockfile + manifests
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @domar/api... --filter domar

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN pnpm --filter @domar/shared build
# generate runs at build (schema is known); migrate runs at start (DB is not)
RUN cd apps/api && pnpm exec prisma generate && pnpm run build

ENV NODE_ENV=production
WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/src/main"]
