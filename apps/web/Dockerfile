FROM node:24-slim AS build

RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @domar/web... --filter domar

COPY packages/shared packages/shared
COPY apps/web apps/web

# rewrites are serialized into the standalone server at build time,
# so the API origin must be known here (compose passes the service name)
ARG API_URL=http://api:3001
ENV API_URL=$API_URL

RUN pnpm --filter @domar/shared build && pnpm --filter @domar/web build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# standalone output mirrors the monorepo layout (outputFileTracingRoot)
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

EXPOSE 3000
ENV HOSTNAME=0.0.0.0 PORT=3000
CMD ["node", "apps/web/server.js"]
