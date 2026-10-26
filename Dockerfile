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
#                             except /api/health/*. REQUIRED for this image:
#                             the default CMD binds 0.0.0.0, and `serve`
#                             refuses a non-loopback bind without a key unless
#                             NEUROLINK_SERVER_ALLOW_UNAUTHENTICATED=1 is set
#                             explicitly (then every route, including tool and
#                             MCP execution, is open to whoever reaches the port).
#   <provider>_API_KEY ...    at least one provider (see .env.example)
#
# Probes: GET /api/health/live (liveness), /api/health/ready (readiness).
# Both stay unauthenticated, so the HEALTHCHECK below and any orchestrator
# probe work without the API key; point Kubernetes probes at the same paths.
#
# The base image is pinned by digest, not by tag: a tag such as 22-bookworm-slim
# moves with every Node patch and every Debian rebuild, so two builds of the same
# commit could run different runtimes and a stale local cache could keep serving
# a Node with known CVEs. Dependabot's docker ecosystem (.github/dependabot.yml)
# proposes the bump when 22.23.4 is superseded; re-verify a digest with
#   curl -s https://hub.docker.com/v2/repositories/library/node/tags/<tag>
# (the `digest` field is the multi-arch manifest list digest used here).

# Node 22.23.4 (Maintenance LTS, 2026-10-21 security release) on bookworm-slim.
ARG NODE_VERSION=22.23.4
ARG NODE_DIGEST=sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d

FROM node:${NODE_VERSION}-bookworm-slim@${NODE_DIGEST} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# corepack reads the pnpm version from package.json "packageManager", so the
# installer here is the one the lockfile and CI were produced with.
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .pnpmfile.cjs ./
COPY patches ./patches

FROM base AS build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
# Only what `pnpm run build` reads (vite build, then prepack: svelte-kit sync,
# svelte-package, build:react-hooks, build:cli, build:browser, publint). Listing
# the inputs instead of `COPY . .` keeps tests, fixtures, docs, the Yama memory
# database and anything a developer left in the checkout out of the image
# layers, and makes a cache miss mean a real input changed.
COPY svelte.config.js vite.config.ts tsconfig.json tsconfig.cli.json ./
COPY scripts/build-browser.mjs scripts/collapse-cli-lib-duplicate.mjs ./scripts/
COPY README.md LICENSE ./
COPY src ./src
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
# Whistle (local STT) and Silero (the streaming speech detector) load from here;
# without them a pod downloads both at first use, or falls back to the energy gate.
COPY models/whistle ./models/whistle
COPY models/silero-vad ./models/silero-vad
COPY scripts/observability ./scripts/observability
# Never runs as root. HOME holds the CLI's state file (~/.neurolink).
USER node
EXPOSE 3000
# /api/health/live is exempt from authentication, so this works without the
# API key; the same holds for an orchestrator's liveness/readiness probes.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health/live').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
# exec form: node is PID 1 and receives SIGTERM directly; `serve` drains and exits.
# --debug logs each request's warnings and errors; NEUROLINK_DEBUG alone does
# not, because the CLI resets it unless the flag is passed.
#
# Binding 0.0.0.0 is what makes the port reachable from outside the container,
# and it is exactly why NEUROLINK_SERVER_API_KEY is required (see the header):
# `serve` exits non-zero at startup when the key is missing and the bind is not
# loopback, rather than serving tool execution to the network unauthenticated.
ENTRYPOINT ["node", "/app/dist/cli/index.js"]
CMD ["serve", "--host", "0.0.0.0", "--debug"]
