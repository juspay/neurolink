# syntax=docker/dockerfile:1
#
# NeuroLink HTTP server image: runs `neurolink serve` (Hono, port 3000).
#
#   docker build --target production -t neurolink .
#   docker run -p 3000:3000 -e OPENAI_API_KEY=... -e NEUROLINK_SERVER_API_KEY=... neurolink
#
# Configuration is environment only, so one image serves every environment:
#   PORT                      listen port (default 3000)
#   NEUROLINK_SERVER_API_KEY  comma-separated keys; required on every route
#                             except <base path>/health/*. Unset = no
#                             authentication.
#   NEUROLINK_SERVER_BASE_PATH  route base path (default /api). Move the routes
#                             with this variable, not with --basePath or a
#                             config file: the HEALTHCHECK below reads it too,
#                             and a base path it cannot see marks the
#                             container unhealthy.
#   <provider>_API_KEY ...    at least one provider (see .env.example)
#
# Probes: GET <base path>/health/live (liveness), <base path>/health/ready
# (readiness); /api/health/live and /api/health/ready by default.

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# corepack reads the pnpm version from package.json "packageManager".
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .pnpmfile.cjs ./
COPY patches ./patches

FROM base AS build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM base AS production
ENV NODE_ENV=production \
    PORT=3000
# Production dependencies only, pinned by the same lockfile as the build.
# The two required peerDependencies are devDependencies of this repo, so --prod
# leaves them out of node_modules/ (npm consumers get them auto-installed). The
# prod graph already holds both as peers of its own packages; hoisting links
# them where dist/ resolves them.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod \
      --config.public-hoist-pattern=@opentelemetry/api \
      --config.public-hoist-pattern=@opentelemetry/sdk-trace-node \
    && node -e "import('@opentelemetry/api').then(() => import('@opentelemetry/sdk-trace-node'))" \
    && rm -rf /root/.cache /root/.local/share/pnpm
# The same files the npm package ships (package.json "files").
COPY --from=build /app/dist ./dist
COPY docs/assets/dashboards ./docs/assets/dashboards
COPY docs-site/mcp-server/*.js docs-site/mcp-server/*.d.ts ./docs-site/mcp-server/
COPY docs-site/static/search-index.json ./docs-site/static/search-index.json
COPY scripts/observability ./scripts/observability
# Never runs as root. HOME holds the CLI's state file (~/.neurolink).
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + ((process.env.NEUROLINK_SERVER_BASE_PATH || '').trim() || '/api') + '/health/live').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
# exec form: node is PID 1 and receives SIGTERM directly; `serve` drains and exits.
ENTRYPOINT ["node", "/app/dist/cli/index.js"]
CMD ["serve", "--host", "0.0.0.0", "--quiet"]
