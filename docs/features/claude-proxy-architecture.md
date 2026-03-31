# Claude Proxy Architecture

## 1. System Overview

The Claude proxy is a local HTTP server that sits between Claude Code and the Anthropic API. It provides multi-account rotation, automatic token refresh, rate-limit handling with exponential backoff, and optional model translation to non-Anthropic providers.

### Two operational modes

| Mode            | When                                                       | What happens                                                                                                                                                                                                                          |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Passthrough** | Target provider is `anthropic` (or `null`)                 | The request body is forwarded byte-for-byte to `api.anthropic.com` via plain `fetch()` with client headers forwarded. No parsing, no tool injection, no SDK involvement.                                                              |
| **Translation** | Target provider is anything else (e.g. `vertex`, `openai`) | The Claude-format request is parsed by `parseClaudeRequest()`, routed through `ctx.neurolink.stream()` / `ctx.neurolink.generate()`, and the NeuroLink response is serialized back to Claude SSE format via `ClaudeStreamSerializer`. |

Passthrough exists because Claude Code sends complex bodies (multi-turn conversations, tool definitions, thinking blocks, context management betas) that would be lossy to parse and re-serialize. The proxy's job for Claude-to-Claude is purely auth and account management.

### How it fits into NeuroLink

The proxy is started via the CLI (`neurolink proxy start`) and creates a Hono HTTP server. It registers routes from `createClaudeProxyRoutes()` and injects a live `NeuroLink` SDK instance into the request context for translation-mode and fallback paths. MCP initialization is explicitly skipped (`NEUROLINK_SKIP_MCP=true`) because tools come from Claude Code, not from MCP servers.

---

## 2. Request Lifecycle

A complete request through the passthrough path:

```
Claude Code
  │
  │  HTTP POST /v1/messages
  │  (body: JSON with model, messages, stream, tools, thinking, etc.)
  │
  ▼
Hono app (proxy.ts)
  │  Logs: method, path, model, stream/non-stream, tool count
  │  Builds ServerContext with NeuroLink instance
  │
  ▼
claudeProxyRoutes.ts  POST /v1/messages handler
  │
  ├─ Validate: body must contain model + messages
  │
  ├─ ModelRouter.resolve(body.model)
  │    → { provider: "anthropic", model: "claude-sonnet-4-..." }
  │    (or null provider for unknown non-Claude models)
  │
  ├─ isClaudeTarget? YES → passthrough path
  │
  ├─ Load accounts (see §3 Account Management)
  │    TokenStore compound keys → legacy credentials file → env var
  │
  ├─ Order accounts by configured strategy (`fill-first` by default)
  │
  ├─ FOR EACH account (skip if cooling):
  │    │
  │    ├─ Token refresh check (1 hour buffer before expiry)
  │    │
  │    ├─ Build headers:
  │    │    - Start with all client headers (forwarded as-is)
  │    │    - Override: authorization: Bearer <token>  (OAuth)
  │    │      or x-api-key: <key>            (API key)
  │    │    - Fill defaults only when absent: user-agent, anthropic-version
  │    │    - Ensure oauth-2025-04-20 is in anthropic-beta
  │    │
  │    ├─ Plain fetch("https://api.anthropic.com/v1/messages?beta=true", { body: bodyStr })
  │    │
  │    ├─ Response handling:
  │    │    429 → exponential backoff (1s base, 10min cap), continue to next account
  │    │    401 → refresh token, retry up to 5 times, then cooldown 5min
  │    │    400/422 + invalid_request_error → return immediately (no retry)
  │    │    404 → return immediately (no cooldown)
  │    │    5xx/52x → no cooldown, rotate immediately to next account
  │    │    200 + stream → bootstrap retry (read first chunk), pipe back
  │    │    200 + JSON → return response.json()
  │    │
  │    └─ Reset backoffLevel on success
  │
  ├─ All accounts exhausted →
  │    ├─ Try fallback chain (modelRouter.getFallbackChain())
  │    ├─ Try auto-provider fallback (no explicit chain)
  │    └─ Return 429 with Retry-After header
  │
  ▼
Claude Code receives Response
```

---

## 3. Account Management

### Account loading priority

Accounts are loaded in the `POST /v1/messages` handler on every request (not cached across requests), in this order:

1. **TokenStore compound keys** (`anthropic:<label>`) — The primary source. `tokenStore.listProviders()` returns all stored keys; those starting with `anthropic:` are loaded via `tokenStore.loadTokens(key)`. Each yields `{ accessToken, refreshToken, expiresAt }`.

2. **Legacy credentials file** (`~/.neurolink/anthropic-credentials.json`) — Only checked when zero compound keys exist. Reads `creds.oauth.accessToken` directly from JSON.

3. **Environment variable** (`ANTHROPIC_API_KEY`) — Only used when no OAuth accounts were found at all. Creates a single `api_key`-type account.

### Account selection: strategy-driven with fill-first default

The request handler supports two real account-selection strategies:

- **`fill-first` (default)** — always begin with the current primary account and stay on it until it cools down or fails.
- **`round-robin`** — rotate the starting account on each request, then try the remaining accounts sequentially.

Expired accounts are pruned at startup via `tokenStore.pruneExpired()` (one-time). Accounts that are persisted as disabled (via `tokenStore.isDisabled()`) are skipped. Expired tokens with a refresh token get one refresh attempt at startup; on failure, the account is disabled until re-authentication.

The CLI `--strategy` flag and the proxy config `routing.strategy` field both map directly to this account ordering logic. There are only two supported values today: `fill-first` and `round-robin`.

### Per-status cooldowns

| HTTP Status                          | Cooldown                        | Behavior                                                                                                                                                |
| ------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **429** (rate limit)                 | Exponential backoff (see below) | Continue to next account                                                                                                                                |
| **401/402/403** (auth failure)       | 5 minutes (`AUTH_COOLDOWN_MS`)  | Attempt token refresh first (up to 5 retries); if all fail, cooldown and continue. After 15 consecutive refresh failures, account permanently disabled. |
| **404** (not found)                  | None                            | Return error immediately (no failover)                                                                                                                  |
| **5xx, 52x** (transient)             | None                            | Rotate immediately to next account                                                                                                                      |
| **Network error** (ECONNRESET, etc.) | None                            | Rotate immediately to next account                                                                                                                      |

### Exponential backoff formula (429s)

```
backoffMs = min(baseCooldown * 2^level, 10 minutes)
```

Where:

- `baseCooldown` = `Retry-After` header value (parsed as seconds or HTTP date), or 1 second if absent (`RATE_LIMIT_BACKOFF_BASE_MS`)
- `level` = number of consecutive 429s for that account (incremented per 429, reset to 0 on success)
- Cap = 10 minutes (`RATE_LIMIT_BACKOFF_CAP_MS = 10 * 60 * 1000 ms`)

The `Retry-After` header is parsed two ways: as an integer (seconds) or as an HTTP date string.

### Account runtime state

Each account has in-memory runtime state (`RuntimeAccountState`):

| Field                        | Type      | Purpose                                               |
| ---------------------------- | --------- | ----------------------------------------------------- |
| `coolingUntil`               | `number?` | Timestamp when cooldown expires                       |
| `backoffLevel`               | `number`  | Current exponential backoff level (resets on success) |
| `consecutiveRefreshFailures` | `number`  | Cumulative token refresh failures across requests     |
| `permanentlyDisabled`        | `boolean` | Account disabled until re-authentication              |
| `lastToken`                  | `string?` | Last known access token (for change detection)        |
| `lastRefreshToken`           | `string?` | Last known refresh token (for change detection)       |

When an account's token material changes (e.g., user re-authenticates), all runtime state is reset, and a permanently disabled account is re-enabled automatically.

### Token refresh: two triggers

1. **Per-request refresh** (claudeProxyRoutes.ts, before each `fetch()`) — Checks if `oauth.expiresAt <= now + 1 hour`. If expiring, refreshes inline before sending the request via `POST https://api.anthropic.com/v1/oauth/token` (with `https://console.anthropic.com/v1/oauth/token` as fallback). Persists to legacy credentials file.

2. **On-401 refresh** (claudeProxyRoutes.ts, after a 401 response) — Refreshes the token and retries the request up to `MAX_AUTH_RETRIES` (5) times per account. If all retries fail, the account gets a 5-minute cooldown. After `MAX_CONSECUTIVE_REFRESH_FAILURES` (15) cumulative failures, the account is permanently disabled via `disableAccountUntilReauth()` and persisted to disk via `tokenStore.markDisabled()`.

Both use the same OAuth endpoint (`https://api.anthropic.com/v1/oauth/token`, falling back to `https://console.anthropic.com/v1/oauth/token`) with `grant_type=refresh_token` and `client_id=9d1c250a-e61b-44d9-88ed-5944d1962f5e`. The refresh request uses `Content-Type: application/json` with a JSON body (not `application/x-www-form-urlencoded`).

---

## 4. Error Handling

### Error classification functions

Two exported helpers in `claudeProxyRoutes.ts` classify errors:

**`isInvalidRequestError(status, errBody)`** — Returns true for:

- HTTP 422 (always)
- Any response where `error.type === "invalid_request_error"` or body contains `"invalid_request_error"`

**`isTransientHttpFailure(status, errBody)`** — Returns true for:

- Status codes: 408, 500, 502, 503, 504, 520-526, 529
- Status 400 with `error.type === "overloaded_error"`
- Status 400 with `error.type === "api_error"` AND message containing HTML/Cloudflare indicators (`<!doctype html`, `error code 520`, `cloudflare`, etc.)

**`isRetryableNetworkError(error)`** — Returns true for error codes: `ECONNREFUSED`, `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `EHOSTUNREACH`, `UND_ERR_CONNECT_TIMEOUT`, `UND_ERR_CONNECT`, `UND_ERR_SOCKET`, `UND_ERR_HEADERS_TIMEOUT`, or message patterns like `fetch failed`, `socket hang up`.

### Error handling flow (passthrough)

```
Response received from api.anthropic.com
  │
  ├─ 429 → exponential backoff cooldown → continue to next account
  │
  ├─ 401 + OAuth + has refreshToken →
  │    ├─ Refresh token + retry (up to 5 attempts)
  │    │    ├─ 200 → return success
  │    │    ├─ 429 → rate limit cooldown → break retry loop
  │    │    ├─ transient → break retry loop, rotate
  │    │    ├─ 401/402/403 → continue retry loop (sleep 1s between)
  │    │    └─ other → return error as-is
  │    ├─ All retries failed → 5min cooldown → continue
  │    └─ 15 consecutive failures → permanently disable account
  │
  ├─ 401/402/403 + OAuth (no refresh token) → 5min cooldown → continue
  ├─ 401/402/403 + API key → 5min cooldown → continue
  │
  ├─ isInvalidRequestError (400/422) → return immediately (no retry)
  │
  ├─ 404 → return immediately (no cooldown, no failover)
  │
  ├─ isTransientHttpFailure (5xx, 52x, wrapped 400) → rotate immediately (no cooldown)
  │
  └─ Other non-ok → return error as-is
```

### Cloudflare 520 wrapped in 400/api_error

Anthropic sometimes wraps Cloudflare 520 errors inside a 400 status with `error.type: "api_error"` and the Cloudflare HTML page in `error.message`. The `isTransientHttpFailure` function detects this by checking for HTML doctype strings, "error code 520", and "cloudflare" in the message body. These are treated as transient and trigger account failover.

### All-accounts-exhausted fallback chain

When every account is cooling or has failed:

1. **Explicit fallback chain** — From `modelRouter.getFallbackChain()`. Each entry specifies a `provider` and `model`. The request is parsed via `parseClaudeRequest()` and sent through `ctx.neurolink.stream()` with `maxSteps: 1`. Tools, thinking configuration, and conversation history from the original request are passed through to the fallback provider.

2. **Auto-provider fallback** — When no explicit chain is configured, the proxy tries `ctx.neurolink.stream()` without specifying a provider (uses NeuroLink's default provider). Same options: tools, thinking, and conversation history are included.

3. **Final 429** — If all fallbacks fail and rate limiting was seen, returns HTTP 429 with a `Retry-After` header set to the earliest account recovery time (minimum 1 second, computed from the `coolingUntil` timestamps).

---

## 5. Streaming Architecture

### Passthrough streaming (Claude-to-Claude)

The upstream `fetch()` response body is a `ReadableStream` of SSE events from Anthropic. The proxy performs a **bootstrap retry**: it reads the first chunk from the stream to verify it is non-empty. If the first chunk is empty or the stream ends immediately, the proxy cancels the reader and moves to the next account.

On a valid first chunk:

1. A new `ReadableStream` is created that enqueues the first chunk in `start()`, then pulls remaining chunks from the original reader in `pull()`.
2. Rate-limit headers from Anthropic are forwarded: `retry-after`, `anthropic-ratelimit-requests-remaining`, `anthropic-ratelimit-requests-limit`, `anthropic-ratelimit-tokens-remaining`, `anthropic-ratelimit-tokens-limit`.
3. The combined stream is returned as a `Response` with `content-type: text/event-stream`.

The body bytes are never parsed or modified. Claude Code receives exactly what Anthropic sent.

### SSE Stream Interceptor (Telemetry)

In both passthrough and translation paths, the proxy optionally pipes the SSE stream through an `SSEInterceptor` (`sseInterceptor.ts`). This is a zero-overhead `TransformStream` that:

1. Forwards every byte to the client immediately (no buffering delay).
2. Parses SSE events in the background to extract: token usage (`input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`), model name, content block metadata (text, thinking, tool_use), and stop reason.
3. Resolves a telemetry promise when the stream ends, providing the extracted data to `ProxyRequestTracer` for OTel span attributes and metric recording.

### ProxyRequestTracer (OTel Spans)

`ProxyRequestTracer` (`proxyTracer.ts`) manages the OTel span lifecycle for each proxy request:

- **Request span**: Created at request receive, covers the full request lifecycle.
- **Upstream spans**: One per retry attempt, tracks fetch duration and response status.
- **Usage attributes**: Token counts, model, provider, cost estimate, rate-limit headers.
- **Correlation**: Writes `traceId` and `spanId` into the request log entry for cross-signal correlation.

The tracer emits metrics via `TelemetryService`: request counters, retry counters, latency histograms, request/response body sizes, estimated cost, cache token counters, and model-substitution counters when the translated response model differs from the requested one.

### Translation streaming (Claude-to-Other)

When the target is a non-Anthropic provider:

1. The Claude request is parsed into NeuroLink format via `parseClaudeRequest()`.
2. `ctx.neurolink.stream()` produces a NeuroLink stream result.
3. A `ClaudeStreamSerializer` (from `claudeFormat.ts`) converts NeuroLink stream chunks into Anthropic SSE frames.
4. An async generator yields SSE frames: `serializer.start()` → `serializer.pushDelta(text)` for each chunk → `serializer.finish()`.
5. SSE keep-alive comments (`: keep-alive\n\n`) are emitted every 15 seconds during idle periods.

### Response handling in proxy.ts

The Hono handler in `proxy.ts` handles three return types from route handlers:

- **`Response` object** — Returned directly (passthrough streaming).
- **`AsyncIterable<string>`** — Wrapped in a `ReadableStream` and returned with SSE headers (translation streaming).
- **Object with `httpStatus`** — Returned as JSON with that status code.
- **Object with `type: "error"`** — Status mapped via `mapClaudeErrorTypeToStatus()`.

---

## 6. OAuth Cloaking (oauthFetch.ts)

**Important:** The proxy passthrough path does NOT use `createOAuthFetch()`. It uses plain `fetch()` with manually constructed headers (client headers forwarded, auth overridden, oauth beta ensured). The `oauthFetch.ts` module is used only by the direct NeuroLink Anthropic provider for SDK usage.

`createOAuthFetch()` is a factory that returns a custom `fetch` function. It has two modes controlled by the `skipBodyTransform` parameter:

### Direct mode (`skipBodyTransform = false`)

Used by the NeuroLink Anthropic provider for direct SDK usage. Full cloaking:

- All passthrough modifications, plus:
- Sets `User-Agent` to `CLAUDE_CLI_USER_AGENT`
- Adds the full Claude-Code beta set, including `oauth-2025-04-20`, `claude-code-20250219`, `context-management-2025-06-27`, `prompt-caching-scope-2026-01-05`, `advanced-tool-use-2025-11-20`, and `effort-2025-11-24`
- Adds identity headers: `anthropic-dangerous-direct-browser-access`, `x-app: cli`
- Adds Stainless SDK headers (`x-stainless-runtime`, `x-stainless-lang`, `x-stainless-os`, `x-stainless-arch`, `x-stainless-package-version`, `x-stainless-retry-count`, `x-stainless-timeout`)
- **Body modifications:**
  - Injects a deterministic Claude-Code-shaped billing header block into the system prompt so prompt caching remains stable
  - Injects agent identity block: `"You are a Claude agent, built on Anthropic's Claude Agent SDK."`
  - Injects `metadata.user_id` as a JSON string with `device_id`, `account_uuid`, and `session_id`
  - Prefixes tool names with `mcp_` when `enableMcpPrefix` is true
  - Disables `thinking` when `tool_choice.type` is `"any"` or `"tool"`
  - Injects W3C trace headers and `x-claude-code-session-id` when the proxy owns the request shape

### MCP prefix handling

When `enableMcpPrefix` is true, the outbound request has all tool names prefixed with `mcp_`. The response stream is then post-processed: a `TransformStream` with a carry buffer (24 bytes) replaces `"name": "mcp_..."` patterns back to `"name": "..."` to strip the prefix from returned tool calls.

### Why cloaking exists

The Anthropic OAuth API requires specific headers and body structures (billing header, user ID, beta flags) that differ from the standard API-key flow. Cloaking makes NeuroLink requests indistinguishable from official Claude CLI requests, which is required for OAuth + tools to work correctly. Extracting this into `oauthFetch.ts` benefits both the proxy passthrough path and the direct SDK Anthropic provider.

---

## 7. Fail-Open Guard

The fail-open guard is a detached child process spawned by `proxy.ts` at startup via `spawnFailOpenGuard()`. It runs as a hidden CLI command (`neurolink proxy guard`).

### Behavior

1. Polls the proxy's `/health` endpoint every `pollIntervalMs` (default: 1 second) with a 1.5-second timeout.
2. Tracks consecutive unhealthy responses (counter resets on any healthy response).
3. Also checks if the parent process (proxy) is still running via `process.kill(pid, 0)`.

### Trigger conditions

The guard takes action when either:

- The parent process has exited AND the health endpoint is not responding (another proxy has not taken over).
- The health endpoint has been consecutively unhealthy for `failureThreshold` checks (default: 5) while the parent still exists.

### Action taken

1. Removes `ANTHROPIC_BASE_URL` and `ENABLE_TOOL_SEARCH` from `~/.claude/settings.json` (only if the URL matches the expected proxy URL — does not clobber a different proxy).
2. Clears the proxy state file if the recorded PID is no longer running.

### Why it exists

Without the guard, if the proxy crashes, Claude Code would keep trying to route requests to the dead proxy URL. The guard ensures Claude Code falls back to direct Anthropic API access automatically, preventing a stuck state.

---

## 8. Design Decisions

### WHY passthrough over NeuroLink for Claude targets

Claude Code sends complex request bodies: multi-turn conversations with interleaved tool use/result blocks, thinking blocks, context management betas, system prompts with cache control, image blocks, and tool definitions with complex JSON schemas. Parsing this into NeuroLink's internal format and re-serializing would be lossy (losing features like `prompt-caching-scope`, thinking configuration, exact tool schemas). Passthrough preserves byte-level fidelity.

### WHY strategy-driven account selection

Most Claude Code usage benefits from identity stability, so `fill-first` is the default. It keeps one account "hot" until rate limits or auth failures force rotation. `round-robin` is still available when a deployment wants to spread traffic more evenly across accounts.

### WHY cloaking is in oauthFetch.ts

The cloaking logic (billing headers, fake user IDs, Stainless headers) is needed both by the proxy passthrough path and by the direct NeuroLink Anthropic provider. Extracting it into a shared module avoids duplication. The `skipBodyTransform` flag allows the same factory to serve both use cases with different levels of body modification.

### WHY MCP is skipped for proxy

The proxy sets `NEUROLINK_SKIP_MCP=true` before creating the NeuroLink instance. Tools come from Claude Code (the client sends tool definitions in the request body). Initializing MCP servers would add startup latency, consume resources, and potentially conflict with tools the client already manages.

### WHY tools are passed through in translation/fallback mode

When falling back to non-Anthropic providers, the proxy passes tools, thinking configuration, and conversation history through to `ctx.neurolink.stream()` with `maxSteps: 1`. This enables fallback providers to see the full request context and produce tool_use blocks if supported. The `maxSteps: 1` limit prevents the proxy from running a multi-step agent loop (that is Claude Code's responsibility). Tool schemas are wrapped via `jsonSchema()` from the Vercel AI SDK to ensure compatibility across providers.

---

## 9. Component Diagram

```
proxy.ts (CLI command)
  │
  ├── Creates NeuroLink instance (NEUROLINK_SKIP_MCP=true)
  ├── Loads proxy config (~/.neurolink/proxy-config.yaml)
  ├── Creates ModelRouter (if routing configured)
  ├── Initializes requestLogger + usageStats + OpenTelemetry (OTLP traces/metrics/logs)
  ├── Builds Hono app
  │     │
  │     ├── /v1/messages      ─→ claudeProxyRoutes.ts (POST)
  │     ├── /v1/models        ─→ claudeProxyRoutes.ts (GET)
  │     ├── /v1/messages/count_tokens ─→ claudeProxyRoutes.ts (POST)
  │     ├── /health           ─→ inline handler
  │     └── /status           ─→ inline handler (imports usageStats)
  │
  ├── Starts @hono/node-server on host:port
  ├── Spawns fail-open guard (detached child process)
  ├── Auto-configures ~/.claude/settings.json (ANTHROPIC_BASE_URL + ENABLE_TOOL_SEARCH)
  ├── Reactive token refresh (per-request + on-401)
  ├── Log rotation (startup + hourly: 7 days, 500 MB cap)
  ├── Summary logs to ~/.neurolink/logs/proxy-*.jsonl
  ├── Attempt logs to ~/.neurolink/logs/proxy-attempts-*.jsonl
  ├── Debug index to ~/.neurolink/logs/proxy-debug-*.jsonl
  ├── Redacted body artifacts to ~/.neurolink/logs/bodies/YYYY-MM-DD/<request-id>/*.json.gz
  ├── OTel flush + shutdown on exit
  └── Graceful shutdown (SIGTERM/SIGINT → clear settings, close server)

proxyTracer.ts
  ├── Creates request-level OTel span (receive → end)
  ├── Creates per-retry upstream spans
  ├── Records token usage, cost, rate-limit attributes
  └── Writes traceId/spanId into request log entry

sseInterceptor.ts
  ├── Zero-overhead TransformStream (taps SSE without buffering)
  ├── Extracts token counts, model, content blocks, stop reason
  └── Resolves telemetry promise on stream end

claudeProxyRoutes.ts
  │
  ├── Passthrough path (isClaudeTarget):
  │     ├── tokenStore.ts          ─ load compound keys (anthropic:<label>)
  │     ├── anthropic-credentials.json ─ legacy fallback
  │     ├── ANTHROPIC_API_KEY env  ─ last resort
  │     ├── tokenRefresh.ts logic  ─ inline refresh (1 hour buffer + on-401 x5)
  │     ├── plain fetch()          ─ direct HTTP to api.anthropic.com (client headers forwarded)
  │     ├── accountQuota.ts        ─ parse unified-5h/7d quota headers
  │     └── Bootstrap retry        ─ verify first stream chunk
  │
  ├── Translation path (!isClaudeTarget):
  │     ├── claudeFormat.ts        ─ parseClaudeRequest() + ClaudeStreamSerializer
  │     ├── ctx.neurolink.stream() ─ NeuroLink SDK
  │     └── SSE keep-alives        ─ 15s interval
  │
  ├── Fallback path (all accounts exhausted):
  │     ├── modelRouter.ts         ─ getFallbackChain()
  │     ├── claudeFormat.ts        ─ parse + serialize
  │     └── ctx.neurolink.stream() ─ with tools, thinking, conversationMessages
  │
  └── Error helpers:
        ├── isInvalidRequestError()
        ├── isTransientHttpFailure()
        ├── isRetryableNetworkError()
        └── parseClaudeErrorBody()

oauthFetch.ts (shared module)
  │
  ├── createOAuthFetch() factory
  │     ├── skipBodyTransform=true  ─ proxy passthrough (headers only)
  │     └── skipBodyTransform=false ─ direct SDK (full cloaking)
  │
  ├── Billing header injection
  ├── Claude-Code-shaped metadata.user_id generation (cached and reused per seed)
  ├── Stainless SDK header spoofing
  └── MCP tool prefix/strip (carry-buffer stream transform)

Supporting modules:
  ├── modelRouter.ts       ─ resolve() model → { provider, model }
  ├── claudeFormat.ts      ─ Claude API ↔ NeuroLink format conversion
  ├── requestLogger.ts     ─ Request summaries, attempt logs, OTLP log export, debug body capture
  ├── usageStats.ts        ─ In-memory per-account stats (resets on restart)
  ├── tokenRefresh.ts      ─ Shared refresh logic (needsRefresh, refreshToken, persistTokens)
  ├── accountQuota.ts      ─ Parse unified-5h/7d quota headers, debounced persistence
  ├── proxyConfig.ts       ─ YAML/JSON config loader with env var interpolation
  └── tokenStore.ts        ─ Multi-provider token persistence (~/.neurolink/tokens.json)
```

---

## 10. File Reference

| File                                         | Lines   | Purpose                                                                                                                             |
| -------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/cli/commands/proxy.ts`                  | ~varies | CLI commands: `proxy start`, `proxy status`, `proxy telemetry`, `proxy guard`, `proxy setup`, `proxy install`, `proxy uninstall`    |
| `src/lib/server/routes/claudeProxyRoutes.ts` | ~1047   | Route handlers: `/v1/messages`, `/v1/models`, `/v1/messages/count_tokens`                                                           |
| `src/lib/proxy/oauthFetch.ts`                | ~383    | OAuth fetch wrapper with cloaking (passthrough + direct modes)                                                                      |
| `src/lib/proxy/modelRouter.ts`               | ~57     | Model name resolution and fallback chain                                                                                            |
| `src/lib/proxy/claudeFormat.ts`              | ~varies | Claude API format parser, response serializer, SSE state machine                                                                    |
| `src/lib/proxy/requestLogger.ts`             | ~varies | Request summaries, attempt logs, OTLP log export, debug logging, and log rotation                                                   |
| `src/lib/proxy/rawStreamCapture.ts`          | ~varies | Lossless raw stream capture for debugging streaming request/response IO                                                             |
| `src/lib/proxy/accountQuota.ts`              | ~110    | Quota header parsing (unified-5h, unified-7d) and persistence                                                                       |
| `src/lib/proxy/usageStats.ts`                | ~60+    | In-memory per-account usage statistics                                                                                              |
| `src/lib/proxy/tokenRefresh.ts`              | ~53     | Token refresh helpers (needsRefresh, refreshToken, persistTokens)                                                                   |
| `src/lib/proxy/proxyConfig.ts`               | ~varies | YAML/JSON config loader with `${VAR}` interpolation                                                                                 |
| `src/cli/commands/auth.ts`                   | ~1991   | CLI commands: `auth login`, `auth list`, `auth remove`, `auth logout`, `auth status`, `auth refresh`, `auth cleanup`, `auth enable` |
| `src/lib/auth/tokenStore.ts`                 | ~varies | Multi-provider token persistence with XOR obfuscation                                                                               |
| `src/lib/auth/anthropicOAuth.ts`             | ~varies | OAuth 2.0 PKCE flow, constants (USER_AGENT, MCP_TOOL_PREFIX)                                                                        |
