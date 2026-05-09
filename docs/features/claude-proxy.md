---
title: Claude Proxy
description: Multi-account Claude proxy with automatic token management, rate-limit failover, and multi-provider fallback for Claude Code
keywords: claude, proxy, multi-account, oauth, rate-limit, failover, fallback, claude-code, anthropic, pool
---

# Claude Proxy

NeuroLink includes a Claude-API-compatible proxy server that sits between Claude Code and Anthropic. It pools multiple Claude accounts, handles rate-limit failover automatically, refreshes OAuth tokens on demand before they expire, and falls back to other providers when all Claude accounts are exhausted.

## Overview

### Why use the proxy?

Claude Code supports only one Anthropic account at a time. If you hit a rate limit, you wait. If your token expires mid-session, you re-authenticate manually. The NeuroLink proxy solves these problems:

- **Multi-account pooling** -- Combine multiple Claude Pro/Max subscriptions for higher aggregate throughput.
- **Automatic token refresh** -- OAuth tokens are refreshed before they expire (pre-request check + 401 retry).
- **Rate-limit failover** -- When one account hits a 429, the proxy immediately tries the next account with exponential backoff.
- **Multi-provider fallback** -- When all Claude accounts are exhausted, requests are routed to alternative providers (Gemini, OpenAI, etc.) through NeuroLink's provider layer.
- **Transparent to Claude Code** -- Set `ANTHROPIC_BASE_URL` and Claude Code works normally. The proxy auto-configures this on start.

### How it works at a glance

```
Claude Code
    |
    |  POST /v1/messages
    v
NeuroLink Proxy (localhost:55669)
    |
    |-- Passthrough mode (Claude -> Claude): raw body forwarding
    |-- Translation mode (Claude -> Other): through neurolink.generate()/stream()
    v
Anthropic API  /  Google AI  /  OpenAI  /  ...
```

## Quick Start

If you do not already have the CLI installed, install it first:

```bash
pnpm add -g @juspay/neurolink
# or
npm install -g @juspay/neurolink
```

Then continue with the proxy setup steps below.

### One-command setup

```bash
neurolink proxy setup
```

This command:

1. Checks for existing authenticated accounts
2. Runs OAuth login if no valid accounts exist
3. Installs the proxy as a **launchd service** (macOS) that auto-restarts on crash or reboot
4. Auto-configures Claude Code to use the proxy

Use `--no-service` to skip service installation and start the proxy in the foreground instead:

```bash
neurolink proxy setup --no-service
```

### Manual setup

```bash
# Step 1: Authenticate with Anthropic via OAuth
neurolink auth login anthropic --method oauth

# Step 2: (Optional) Add more accounts for pooling
neurolink auth login anthropic --method oauth --add --label work
neurolink auth login anthropic --method oauth --add --label personal

# Step 3: (Optional) Start the local OpenObserve stack and import the dashboard
# (auto-writes OTEL_EXPORTER_OTLP_ENDPOINT to ~/.neurolink/.env)
neurolink proxy telemetry setup

# Step 4: Start the proxy
neurolink proxy start

# Step 5: Restart Claude Code to pick up the new ANTHROPIC_BASE_URL
```

## How It Works

### Request Flow

Every request from Claude Code flows through the proxy in one of two modes:

**Passthrough mode** (Claude to Claude): The request body is forwarded directly to `api.anthropic.com` with only the authentication headers modified. This preserves multi-turn conversation history, thinking content, cache control, and tool definitions exactly as Claude Code sent them. No lossy conversion through an intermediate format.

**Translation mode** (Claude to other provider): When model routing directs a request to a non-Anthropic provider, the proxy parses the Claude Messages API request into NeuroLink's internal format, calls `neurolink.generate()` or `neurolink.stream()`, and serializes the result back into Claude Messages API format (including SSE streaming events). For streaming, the proxy emits SSE keep-alive comments (`: keep-alive`) every 15 seconds during idle periods to prevent connection timeouts.

### Trace And Session Context

If the caller sends W3C trace headers (`traceparent`, `tracestate`) or NeuroLink session headers (`x-neurolink-session-id`, `x-neurolink-user-id`, `x-neurolink-conversation-id`), the proxy links its spans to the caller trace and preserves that session/user/conversation context in proxy traces and logs.

### Token Management

The proxy uses a reactive two-layer token refresh strategy to ensure requests never fail due to expired tokens:

1. **Pre-request check** -- Before each request, the proxy checks if the OAuth token expires within the next 1 hour. If so, it refreshes the token before sending the request.
2. **401 retry** -- If Anthropic returns a 401 despite the above check, the proxy refreshes the token and retries the request up to 5 times per account. If all retries fail, the account enters a 5-minute cooldown and the proxy tries the next account. After 15 consecutive refresh failures across requests, the account is permanently disabled until re-authentication.

Refreshed tokens are persisted to `~/.neurolink/anthropic-credentials.json` using atomic writes (write to `.tmp`, then rename) with `0o600` permissions.

### Multi-Account Routing

When multiple accounts are available, the proxy uses **fill-first** routing:

1. Use the first non-cooling account for every request.
2. On a 429, apply exponential backoff to that account and try the next one.
3. Continue until a request succeeds or all accounts are exhausted.
4. If all accounts are exhausted, walk the fallback chain (alternative providers).
5. If all fallbacks fail, return a 429 with a `Retry-After` header indicating the earliest account recovery time.

Account sources are checked in priority order:

1. **TokenStore** compound keys (e.g., `anthropic:work`, `anthropic:personal`) -- from `neurolink auth login --label`
2. **Legacy credentials file** (`~/.neurolink/anthropic-credentials.json`) -- only if no TokenStore accounts exist
3. **Environment variable** (`ANTHROPIC_API_KEY`) -- only if no other accounts exist

#### Designating a primary (home) account

By default the "first" account is the first key in token-store insertion order. To override this without re-OAuthing or editing the encrypted token store, set `routing.primary-account` in the proxy config. The proxy resolves the email to a stable token-store key per request, so the choice survives account additions/removals and only takes effect when that account is currently authenticated:

```bash
neurolink auth set-primary alice@example.com
neurolink proxy stop && neurolink proxy start
curl http://127.0.0.1:55669/status   # stats.primaryAccount.label = alice@example.com
```

After a 429 cools off, traffic returns to the configured primary (not literal index 0). When the configured account is missing or disabled, the proxy logs a warning at startup and falls back to insertion-order index 0. See the [config reference](./claude-proxy-config-reference.md#neurolink-auth-set-primary) for the full CLI surface (`set-primary` / `get-primary` / `clear-primary`).

### Fallback Chain

When all Claude accounts are rate-limited, the proxy walks the fallback chain defined in the config file. Each fallback entry specifies a provider and model:

```yaml
routing:
  fallback-chain:
    - provider: google-ai
      model: gemini-3-flash-preview
    - provider: openai
      model: gpt-4o
```

Fallback requests go through NeuroLink's `stream()` pipeline (translation mode), which handles the format conversion to and from the target provider's API. Tools, thinking configuration, and conversation history from the original request are passed through to the fallback provider.

## Configuration

### Proxy config file

The proxy loads configuration from `~/.neurolink/proxy-config.yaml` by default (override with `--config`). The file supports YAML or JSON format with environment variable interpolation.

```yaml
# ~/.neurolink/proxy-config.yaml
version: 1

# Account definitions (alternative to neurolink auth login)
accounts:
  anthropic:
    - name: primary
      apiKey: ${ANTHROPIC_API_KEY_PRIMARY}
    - name: secondary
      apiKey: ${ANTHROPIC_API_KEY_SECONDARY}
      weight: 2
      rateLimit: 100

# Routing configuration
routing:
  strategy: fill-first # or round-robin

  # Model mappings: remap incoming model names to different providers
  model-mappings:
    - from: claude-sonnet-4-20250514
      to: gemini-3-pro-preview
      provider: google-ai

  # Fallback chain: try these when all Claude accounts are exhausted
  fallback-chain:
    - provider: google-ai
      model: gemini-3-flash-preview
    - provider: openai
      model: gpt-4o

  # Models that always go to Anthropic (skip routing logic)
  passthrough-models:
    - claude-opus-4-20250514
    - claude-sonnet-4-5-20250929

# Cloaking configuration (request transformation for OAuth)
cloaking:
  mode: auto # "auto" | "always" | "never"
  plugins: {}
```

When routing is enabled, any requested model that starts with `gemini-` is treated as a Vertex target by default unless an explicit `model-mappings` rule overrides it.

### Environment variable interpolation

String values in the config file support `${VAR_NAME}` and `${VAR_NAME:-default}` syntax:

```yaml
accounts:
  anthropic:
    - name: primary
      apiKey: ${ANTHROPIC_KEY_1}
    - name: fallback
      apiKey: ${ANTHROPIC_KEY_2:-sk-ant-fallback-key}
```

### Account configuration options

| Field       | Type    | Default | Description                                |
| ----------- | ------- | ------- | ------------------------------------------ |
| `name`      | string  | unnamed | Human-readable label for the account       |
| `apiKey`    | string  | --      | API key or token (supports `${ENV_VAR}`)   |
| `baseUrl`   | string  | --      | Override the provider endpoint URL         |
| `orgId`     | string  | --      | Organization ID (e.g., for OpenAI orgs)    |
| `weight`    | number  | 1       | Weight for weighted round-robin selection  |
| `enabled`   | boolean | true    | Whether this account is active             |
| `rateLimit` | number  | --      | Max requests per minute for this account   |
| `metadata`  | object  | --      | Arbitrary metadata attached to the account |

### Server options

| Option   | Default                          | Description         |
| -------- | -------------------------------- | ------------------- |
| `port`   | 55669                            | Port to listen on   |
| `host`   | 127.0.0.1                        | Host to bind to     |
| `config` | `~/.neurolink/proxy-config.yaml` | Path to config file |

## CLI Commands

### `neurolink proxy setup`

One-command onboarding: checks for existing accounts, runs OAuth login if needed, installs the proxy as a persistent service, and configures Claude Code.

```bash
neurolink proxy setup              # Full setup: login + install as launchd service (macOS)
neurolink proxy setup --no-service # Login + start foreground (no auto-restart)
neurolink proxy setup -p 9000      # Setup on custom port
```

### `neurolink proxy install`

Install the proxy as a persistent macOS launchd service. The service auto-restarts on crash (5-second throttle interval) and starts on login.

```bash
neurolink proxy install              # Install with defaults (port 55669)
neurolink proxy install --port 9000  # Install on custom port
neurolink proxy install --host 0.0.0.0  # Bind to all interfaces
```

**Options:**

| Flag     | Alias | Default   | Description       |
| -------- | ----- | --------- | ----------------- |
| `--port` | `-p`  | 55669     | Port to listen on |
| `--host` | `-H`  | 127.0.0.1 | Host to bind to   |

### `neurolink proxy uninstall`

Remove the launchd service. Stops the proxy if it is running and deletes the launchd plist.

```bash
neurolink proxy uninstall
```

### `neurolink proxy start`

Start the proxy server.

```bash
neurolink proxy start                           # Default: port 55669, fill-first
neurolink proxy start -p 8080 -s fill-first     # Custom port and strategy
neurolink proxy start --config ./my-proxy.yaml  # Custom config file
neurolink proxy start --debug                   # Enable debug logging
neurolink proxy start --quiet                   # Suppress non-essential output
neurolink proxy start --passthrough             # Transparent forwarding (no retry/rotation)
neurolink proxy start --env-file ./proxy.env    # Load provider keys from dedicated file
```

**Options:**

| Flag                | Alias | Default                          | Description                                                |
| ------------------- | ----- | -------------------------------- | ---------------------------------------------------------- |
| `--port`            | `-p`  | 55669                            | Port to listen on                                          |
| `--host`            | `-H`  | 127.0.0.1                        | Host to bind to                                            |
| `--strategy`        | `-s`  | fill-first                       | Account selection strategy (`fill-first` or `round-robin`) |
| `--health-interval` |       | 30                               | Health check interval (seconds)                            |
| `--config`          | `-c`  | `~/.neurolink/proxy-config.yaml` | Config file path                                           |
| `--quiet`           | `-q`  | false                            | Suppress output                                            |
| `--debug`           | `-d`  | false                            | Enable debug output                                        |
| `--passthrough`     |       | false                            | Transparent forwarding (no retry, rotation, or polyfill)   |
| `--env-file`        |       |                                  | Path to .env file for provider API keys                    |

**Strategy choices:** `round-robin`, `fill-first`

### `neurolink proxy status`

Show proxy status, including PID, uptime, strategy, fallback chain, and per-account usage statistics fetched from the live `/status` endpoint. Status output now distinguishes total upstream attempts from completed requests, so retry-heavy incidents are easier to spot.

```bash
neurolink proxy status               # Human-readable text output
neurolink proxy status --format json # Machine-readable JSON
```

### `neurolink proxy telemetry <action>`

Manage the local OpenObserve stack and the maintained proxy dashboard from the CLI.

```bash
neurolink proxy telemetry setup            # Start OpenObserve + OTEL collector and import dashboard
neurolink proxy telemetry start            # Start the local telemetry stack only
neurolink proxy telemetry stop             # Stop the local telemetry stack
neurolink proxy telemetry status           # Show local stack health
neurolink proxy telemetry logs             # Follow OpenObserve + collector logs
neurolink proxy telemetry import-dashboard # Re-import the dashboard without restarting containers
```

These commands use the repo-owned assets under `scripts/observability/` and the dashboard JSON at `docs/assets/dashboards/neurolink-proxy-observability-dashboard.json`.

### `neurolink auth login anthropic`

Authenticate with Anthropic. Supports multi-account pooling via `--add --label`.

```bash
# Interactive (prompts for method)
neurolink auth login anthropic

# OAuth (for Claude Pro/Max subscription)
neurolink auth login anthropic --method oauth

# API key
neurolink auth login anthropic --method api-key

# Create API key via OAuth (Claude Pro/Max)
neurolink auth login anthropic --method create-api-key

# Add a second account with a label
neurolink auth login anthropic --method oauth --add --label work
neurolink auth login anthropic --method oauth --add --label personal

# Non-interactive mode (requires environment variables)
neurolink auth login anthropic --method api-key --non-interactive
```

**Options:**

| Flag                | Alias | Default | Description                                                  |
| ------------------- | ----- | ------- | ------------------------------------------------------------ |
| `--method`          | `-m`  | --      | Auth method: `api-key`, `oauth`, `create-api-key`            |
| `--add`             |       | false   | Add as additional account to the pool (instead of replacing) |
| `--label`           |       | --      | Human-readable label for this account (used with `--add`)    |
| `--non-interactive` |       | false   | Skip interactive prompts (requires environment variables)    |
| `--format`          |       | text    | Output format: `text` or `json`                              |
| `--debug`           |       | false   | Enable debug output                                          |

### `neurolink auth list`

List all authenticated accounts with status, including the account email address (resolved via OAuth token exchange), token expiry, and per-account quota utilization (5-hour and 7-day windows).

```bash
neurolink auth list               # Text output
neurolink auth list --format json # JSON output
neurolink auth list --debug       # Include debug details
```

### `neurolink auth status`

Show authentication status for a specific provider (or all providers if omitted).

```bash
neurolink auth status              # Show all providers
neurolink auth status anthropic    # Show Anthropic only
neurolink auth status --format json # JSON output
```

### `neurolink auth refresh`

Manually refresh OAuth tokens.

```bash
neurolink auth refresh anthropic
```

### `neurolink auth cleanup`

Remove expired and disabled accounts from the token store.

```bash
neurolink auth cleanup           # Interactive: prompts before removing
neurolink auth cleanup --force   # Remove without prompting
```

### `neurolink auth enable`

Re-enable a previously disabled account (e.g., one disabled after repeated refresh failures).

```bash
neurolink auth enable work       # Re-enable the account labeled "work"
```

## Multi-Account Setup

### Adding multiple accounts

Each `neurolink auth login --add --label <name>` creates a separate account entry in the TokenStore (`~/.neurolink/tokens.json`):

```bash
# Account 1: personal Claude Max
neurolink auth login anthropic --method oauth --add --label personal

# Account 2: work Claude Max
neurolink auth login anthropic --method oauth --add --label work

# Account 3: API key for fallback
neurolink auth login anthropic --method api-key --add --label api
```

### How accounts are selected

The proxy discovers accounts in this order:

1. Compound keys from TokenStore (e.g., `anthropic:personal`, `anthropic:work`)
2. Legacy credentials file (if no compound keys exist)
3. `ANTHROPIC_API_KEY` environment variable (if no other accounts exist)

Within the account pool, the proxy uses **fill-first** routing: it always tries the first non-cooling account and only switches on failure. This avoids unnecessary identity switches that could confuse Claude Code's session state.

### Cooldown and backoff

When an account encounters an error, it enters a cooldown period based on the error type:

| Status Code   | Cooldown Duration                  | Behavior                 |
| ------------- | ---------------------------------- | ------------------------ |
| 429           | Exponential backoff (1s to 10 min) | Try next account         |
| 401/402/403   | 5 minutes                          | Try next account         |
| 404           | No cooldown                        | Return error immediately |
| 5xx/transient | No cooldown                        | Rotate immediately       |
| Network error | No cooldown                        | Rotate immediately       |

**Exponential backoff on 429:**

The proxy respects the `Retry-After` header from Anthropic when present. For repeated 429s on the same account, the cooldown is calculated as `baseCooldown * 2^level` where `baseCooldown` is the `Retry-After` value (or 1 second if absent) and `level` increments on each consecutive 429. This produces a sequence like 1s, 2s, 4s, 8s, 16s, ... up to a 10-minute cap. The backoff level resets to zero on a successful request.

## Error Handling

The proxy classifies upstream errors and applies different strategies:

### 429 Rate Limit

- Parse `Retry-After` header (seconds or HTTP date format)
- Apply exponential backoff with level tracking
- Put the account into cooling state
- Immediately try the next account
- Log: `[proxy] <- 429 account=work backoff-level=2 cooldown=4s`

### 401/402/403 Authentication Errors

- **OAuth accounts with refresh token:** Refresh the token and retry the request up to 5 times per account. If all retries fail, apply a 5-minute cooldown and try the next account. After 15 consecutive refresh failures across requests, the account is permanently disabled until re-authentication via `neurolink auth login`.
- **OAuth accounts without refresh token:** Apply a 5-minute cooldown, try the next account.
- **API key accounts:** Apply a 5-minute cooldown, try the next account.

### 400/422 Request Shape Error

- Detected via HTTP 422 status or `invalid_request_error` error type in the response body.
- No retry or failover. These are client-side errors (malformed request, invalid parameters).
- Return the error body directly to Claude Code.

### 404 Not Found

- Typically means the model is not available for this account.
- No cooldown applied.
- Return the error body immediately to the client (no failover to next account).

### 5xx / Transient Server Error

- Transient errors (408, 500, 502, 503, 504, and Cloudflare 520-526/529).
- Also matches `400` responses with `api_error` or `overloaded_error` types that wrap transient HTML content (e.g., Cloudflare error pages).
- No cooldown applied -- immediate rotation to the next account.

### All Accounts Exhausted

When every account is in a cooling state:

1. Walk the fallback chain (if configured).
2. Each fallback uses NeuroLink's `stream()` pipeline with the specified provider/model.
3. If all fallbacks also fail, return a 429 with `Retry-After` set to the earliest account recovery time.

### Bootstrap Retry (Streaming)

For streaming requests, the proxy reads the first chunk from the upstream response before forwarding it to the client. If the first chunk is empty (indicating a failed stream), the proxy retries with the next account. This prevents Claude Code from receiving an empty SSE stream.

## Auto-Configuration

### Claude Code integration

When the proxy starts, it automatically updates `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:55669",
    "ENABLE_TOOL_SEARCH": "true"
  }
}
```

When the proxy stops (Ctrl+C or SIGTERM), it removes these entries from the settings file. This means Claude Code automatically routes through the proxy when it is running and goes direct when it is not.

**Note:** You must restart Claude Code after starting or stopping the proxy for the settings change to take effect.

### Proxy state file

The proxy persists its running state to `~/.neurolink/proxy-state.json` so that `neurolink proxy status` can report on it and `neurolink proxy start` can detect an already-running instance. The state includes PID, port, host, strategy, start time, fallback chain, and the optional fail-open guard PID.

### Fail-open guard

On startup, the proxy spawns a detached background process (`neurolink proxy guard`) that monitors the proxy's health endpoint. If the proxy process exits unexpectedly without cleaning up `~/.claude/settings.json`, the guard removes the stale `ANTHROPIC_BASE_URL` entry so that Claude Code falls back to direct Anthropic access rather than failing against a dead proxy.

## Architecture

### Endpoints

| Method | Path                        | Description                             |
| ------ | --------------------------- | --------------------------------------- |
| POST   | `/v1/messages`              | Claude Messages API (main endpoint)     |
| GET    | `/v1/models`                | List available Claude models            |
| POST   | `/v1/messages/count_tokens` | Token counting                          |
| GET    | `/health`                   | Health check (status, strategy, uptime) |
| GET    | `/status`                   | Detailed proxy status                   |

### Passthrough mode (Claude to Claude)

When the target provider is `anthropic` (the default for any `claude-*` model), the proxy operates in passthrough mode:

1. Load all available accounts (TokenStore, legacy file, env var). Expired accounts are given one refresh attempt at startup; if that fails, they are disabled.
2. Select the first non-cooling account according to the active routing strategy. With the default `fill-first` strategy, this is always the current primary account until it cools down.
3. Auto-refresh the token if expiring within 1 hour.
4. Forward the raw request body via plain `fetch()` to `https://api.anthropic.com/v1/messages?beta=true`.
5. Set authentication headers (`Authorization: Bearer` for OAuth, `x-api-key` for API keys).
6. Forward client headers as-is, preserving Claude Code's own request shape, then merge in required OAuth betas and trace headers when absent. The proxy extracts incoming `traceparent` and `x-neurolink-*` headers and injects outbound trace context plus `x-claude-code-session-id` when needed.
7. For streaming: verify the first chunk (bootstrap retry), then forward the stream. For non-streaming: return JSON.

This mode preserves the exact request format that Claude Code expects, including thinking blocks, cache control headers, and multi-turn tool use conversations. Rate-limit headers from Anthropic (`retry-after`, `anthropic-ratelimit-requests-remaining`, `anthropic-ratelimit-requests-limit`, `anthropic-ratelimit-tokens-remaining`, `anthropic-ratelimit-tokens-limit`) are passed through to the client.

### Translation mode (Claude to other provider)

When model routing directs to a non-Anthropic provider:

1. Parse the Claude request using `parseClaudeRequest()` -- extracts prompt, system prompt, images, tools, thinking config, and conversation history. The thinking `type` field is handled adaptively: both `"enabled"` (fixed budget) and `"adaptive"` (auto budget, mapped to `thinkingLevel: "medium"`) are supported.
2. Call `neurolink.stream()` with the target provider and model. Tools and conversation messages from the original request are passed through (not disabled).
3. For streaming: use `ClaudeStreamSerializer` to emit Claude-compatible SSE events (`message_start`, `content_block_start`, `content_block_delta`, `content_block_stop`, `message_delta`, `message_stop`).
4. For non-streaming: collect all text from the stream and call `serializeClaudeResponse()` to build a Claude Messages API response.

If the translated response model differs from the requested model, the proxy records that as a model-substitution metric (`proxy_model_substitution_total`) and adds the requested vs actual model attributes to the trace.

### OAuth cloaking

For OAuth-authenticated requests, the proxy applies transformations to make requests appear as standard Claude CLI traffic:

- **User-Agent**: `claude-cli/2.1.87 (external, sdk-cli)`
- **Beta headers**: `oauth-2025-04-20`, `claude-code-20250219`, `interleaved-thinking-2025-05-14`, `context-management-2025-06-27`, `prompt-caching-scope-2026-01-05`, `advanced-tool-use-2025-11-20`, `effort-2025-11-24`
- **Identity headers**: `x-app: cli`, `anthropic-dangerous-direct-browser-access: true`
- **Stainless SDK headers**: `x-stainless-runtime`, `x-stainless-lang`, `x-stainless-os`, etc.
- **Billing header**: Injected into the system prompt as a deterministic Claude-Code-shaped billing block so prompt caching stays stable across requests
- **User ID**: `metadata.user_id` is a JSON string with `device_id`, `account_uuid`, and `session_id`, cached per account/token seed and reused across requests
- **Trace linkage**: outbound requests include W3C trace headers and a stable `x-claude-code-session-id` when the proxy owns the request shape

The `CloakingPipeline` supports three modes:

| Mode     | Behavior                                         |
| -------- | ------------------------------------------------ |
| `auto`   | Apply cloaking only for OAuth accounts (default) |
| `always` | Apply cloaking for all accounts                  |
| `never`  | Skip all cloaking                                |

### Cloaking plugins

The pipeline runs plugins in `order` field order:

- **HeaderScrubber** -- Removes or modifies headers that reveal proxy usage
- **SessionIdentity** -- Generates Claude-Code-shaped identity metadata with stable `device_id` and `account_uuid`
- **SystemPromptInjector** -- Adds billing and agent block to system prompts
- **TlsFingerprint** -- TLS fingerprint matching
- **WordObfuscator** -- Obfuscates identifiable patterns

### Request logging

The proxy writes four complementary log families under `~/.neurolink/logs/`:

- `proxy-YYYY-MM-DD.jsonl` -- final request summaries used for request counts, status trends, token totals, and dashboard panels
- `proxy-attempts-YYYY-MM-DD.jsonl` -- per-upstream-attempt diagnostics for retries, failover, and rate-limit debugging
- `proxy-debug-YYYY-MM-DD.jsonl` -- redacted body-capture index rows with phase, headers, file path, and response metadata
- `bodies/YYYY-MM-DD/<request-id>/*.json.gz` -- the corresponding redacted request and response body artifacts, stored compressed with `0o600` permissions

Final request summaries include request ID, method, path, model, account label, response status, response time, token usage, and `traceId` / `spanId` for trace correlation. Debug body captures are also emitted to OTLP logs as `event.name=proxy.body_capture`.

> **Redaction:** Sensitive headers and common JSON secret keys (`authorization`, `access_token`, `refresh_token`, `api_key`, etc.) are redacted before debug artifacts are written locally or emitted to OTLP.

### Log rotation

Log files are automatically cleaned up on two triggers:

- **At startup** -- deletes files older than 7 days, then trims remaining files if total size exceeds 500 MB (oldest first).
- **Hourly** -- repeats the same cleanup during proxy runtime.

This prevents unbounded log growth without requiring external cron jobs.

### Usage statistics

In-memory per-account statistics track:

- Upstream attempt count, success count, error count, rate-limit count
- Current backoff level and cooling state
- Last attempt and last error timestamps

Proxy-wide status also tracks total upstream attempts separately from completed requests. Statistics reset on proxy restart. Access them via the `/status` endpoint or `neurolink proxy status`.

## Comparison with CLIProxyAPI

| Feature                 | NeuroLink Proxy                   | CLIProxyAPI (Go)     |
| ----------------------- | --------------------------------- | -------------------- |
| Language                | TypeScript (Node.js)              | Go                   |
| Multi-account pooling   | Yes (fill-first + failover)       | Yes (round-robin)    |
| OAuth token refresh     | 2-layer (pre-request + 401 retry) | Single refresh       |
| Multi-provider fallback | Yes (any NeuroLink provider)      | No                   |
| Model mapping/routing   | Yes (YAML config)                 | No                   |
| Anti-detection/cloaking | Plugin pipeline                   | Built-in             |
| SDK integration         | Full NeuroLink SDK access         | Standalone binary    |
| Config format           | YAML/JSON with env vars           | TOML                 |
| Installation            | `npm install @juspay/neurolink`   | Standalone binary    |
| Claude Code integration | Auto-configures settings.json     | Manual setup         |
| Streaming               | SSE passthrough + bootstrap retry | SSE passthrough      |
| Token storage           | TokenStore (multi-provider)       | Single-provider file |

## Key Files

| File                                                                  | Purpose                                                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/cli/commands/proxy.ts`                                           | CLI commands: start, status, telemetry, setup, install, uninstall        |
| `src/lib/server/routes/claudeProxyRoutes.ts`                          | Claude API route handlers (passthrough + translation)                    |
| `src/lib/proxy/modelRouter.ts`                                        | Model name resolution and fallback chain                                 |
| `src/lib/proxy/claudeFormat.ts`                                       | Request parser, response serializer, SSE state machine                   |
| `src/lib/proxy/oauthFetch.ts`                                         | OAuth fetch wrapper with cloaking                                        |
| `src/lib/proxy/proxyConfig.ts`                                        | YAML/JSON config loader with env var interpolation                       |
| `src/lib/proxy/requestLogger.ts`                                      | JSONL request logging, OTLP log emission, and debug body capture storage |
| `src/lib/proxy/rawStreamCapture.ts`                                   | Lossless raw stream capture for debugging streaming request/response IO  |
| `src/lib/proxy/usageStats.ts`                                         | In-memory per-account statistics                                         |
| `src/lib/proxy/tokenRefresh.ts`                                       | Shared token refresh helpers (needsRefresh, refreshToken, persistTokens) |
| `src/lib/proxy/accountQuota.ts`                                       | Quota header parsing (unified-5h, unified-7d) and persistence            |
| `src/lib/proxy/cloaking/index.ts`                                     | CloakingPipeline orchestrator                                            |
| `src/lib/proxy/cloaking/types.ts`                                     | Cloaking plugin interface and context types                              |
| `src/lib/auth/tokenStore.ts`                                          | Multi-provider OAuth token storage                                       |
| `src/lib/auth/anthropicOAuth.ts`                                      | Anthropic OAuth 2.0 + PKCE flow                                          |
| `src/lib/auth/accountPool.ts`                                         | Account pool management                                                  |
| `src/cli/commands/auth.ts`                                            | Auth CLI commands: login, logout, list, status, refresh, cleanup, enable |
| `src/cli/factories/authCommandFactory.ts`                             | Auth command builder with subcommands                                    |
| `src/lib/types/subscriptionTypes.ts`                                  | Subscription tier, auth, and routing types                               |
| `scripts/observability/manage-local-openobserve.sh`                   | Local OpenObserve lifecycle helper for `proxy telemetry`                 |
| `docs/assets/dashboards/neurolink-proxy-observability-dashboard.json` | Maintained dashboard source-of-truth                                     |

## Observability

The proxy ships a local observability stack (OpenObserve + OTEL collector) with a pre-built dashboard covering traffic, failures, latency, account routing, token usage, and cost.

### Quick start

```bash
# Start OpenObserve + OTEL collector, import dashboard, wire up endpoint
neurolink proxy telemetry setup

# Then start the proxy as normal — telemetry flows automatically
neurolink proxy start
```

`telemetry setup` writes `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:<port>` (default: `14318`, configurable via `NEUROLINK_OTLP_HTTP_PORT`) into `~/.neurolink/.env`. The proxy reads that file on every start, including when running as a launchd service.

**Dashboard:** `http://localhost:5080` — login `root@example.com` / `Complexpass#123` (default credentials, change in `scripts/observability/proxy-observability.env`).

### Useful commands

| Command                                      | Purpose                                        |
| -------------------------------------------- | ---------------------------------------------- |
| `neurolink proxy telemetry setup`            | Start stack + import dashboard + wire endpoint |
| `neurolink proxy telemetry start`            | Start stack without re-importing dashboard     |
| `neurolink proxy telemetry stop`             | Stop the local stack                           |
| `neurolink proxy telemetry status`           | Show health and endpoint URLs                  |
| `neurolink proxy telemetry logs`             | Tail OpenObserve and collector logs            |
| `neurolink proxy telemetry import-dashboard` | Re-import the dashboard definition             |

When working from a repo checkout, the `pnpm run proxy:observability:*` scripts are equivalent shortcuts.

The maintained dashboard definition lives in `docs/assets/dashboards/neurolink-proxy-observability-dashboard.json`.

See [Claude Proxy Observability](./claude-proxy-observability) for a full guide to reading the dashboard.

## Troubleshooting

### Proxy won't start: "already running"

The proxy detected a running instance. Check status and stop the existing one:

```bash
neurolink proxy status
# If the reported PID is stale, remove the state file:
rm ~/.neurolink/proxy-state.json
neurolink proxy start
```

### Claude Code not connecting through proxy

1. Verify the proxy is running: `neurolink proxy status`
2. Check `~/.claude/settings.json` has `ANTHROPIC_BASE_URL` set
3. Restart Claude Code after starting the proxy

### Token refresh failures

If you see `refresh failed` in the logs:

```bash
# Manually refresh
neurolink auth refresh anthropic

# Or re-login
neurolink auth login anthropic --method oauth
```

### All accounts rate-limited

Check cooldown status and wait for recovery:

```bash
neurolink proxy status --format json
# Look at fallbackChain and uptime
```

Add more accounts to the pool to increase throughput:

```bash
neurolink auth login anthropic --method oauth --add --label extra
```

### Config file not loading

Verify the config file exists and is valid YAML:

```bash
cat ~/.neurolink/proxy-config.yaml
# Or specify explicitly:
neurolink proxy start --config /path/to/config.yaml
```

Unresolved `${VAR}` references in the config indicate missing environment variables. The proxy warns about plaintext API keys in config files -- use `${ENV_VAR}` references instead.

---

## Planned Future Features

Features explored during the CLIProxyAPI comparison analysis and deferred for future implementation.

### OpenAI-Compatible Endpoint (`/v1/chat/completions`)

**Priority: High** | **Complexity: Medium**

Add an OpenAI-compatible API endpoint so any tool that speaks the OpenAI format (Cursor, Continue, Aider, Open Interpreter, etc.) can route through the proxy to Claude accounts.

- **What exists:** NeuroLink SDK already translates between all providers via Vercel AI SDK. The Claude proxy (`claudeFormat.ts` + `claudeProxyRoutes.ts`) is the production template.
- **What's needed:**
  - `openaiFormat.ts` — parse OpenAI requests, serialize OpenAI responses, streaming SSE state machine (mirror of `claudeFormat.ts`)
  - `openaiProxyRoutes.ts` — `POST /v1/chat/completions`, `GET /v1/models`, `POST /v1/embeddings` endpoints
  - Route registration in `src/lib/server/routes/index.ts` with `openaiProxy: true`
- **Key format differences:** OpenAI uses `choices[].message.content` vs Claude's `content[].text`, `finish_reason` inline vs `stop_reason`, system messages in the messages array vs top-level `system` field
- **Account pool:** Shares the same OAuth account pool as the Claude proxy — all traffic pools across accounts with fill-first routing

### TLS Fingerprint Spoofing

**Priority: Medium** | **Complexity: High**

Bypass Cloudflare TLS fingerprinting on Anthropic OAuth endpoints. CLIProxyAPI uses `refraction-networking/utls` with `tls.HelloChrome_Auto` to impersonate Chrome's TLS handshake.

- **Current status:** Switching refresh endpoint from `console.anthropic.com` to `api.anthropic.com` (lighter Cloudflare) resolved most issues. Revisit only if Cloudflare blocks resurface.
- **Node.js options:**
  - `curl-impersonate` bindings via native module
  - `tls-client` npm package
  - Subprocess to `curl-impersonate` for OAuth operations only
- **Scope:** Only needed for token exchange and refresh calls, not API requests (those use proper headers already)

### Management Dashboard

**Priority: Low** | **Complexity: Medium**

Web-based UI for monitoring proxy status, account health, quota utilization, and request logs.

- **Data sources:** `~/.neurolink/account-quotas.json` (live quota), `~/.neurolink/logs/proxy-*.jsonl` (request logs), `~/.neurolink/tokens.json` (account status)
- **Possible approach:** Lightweight Hono route serving a static HTML dashboard, reading from existing files
- **CLIProxyAPI pattern:** Uses a management API (`/v0/management/auth-files`) for remote status — could expose similar endpoints

### WebSocket Relay

**Priority: Low** | **Complexity: High**

WebSocket-based connections for real-time bidirectional communication.

- **Use cases:** Live dashboard updates, browser-based clients, streaming multiplexing
- **Current need:** None — no consumer exists today
- **CLIProxyAPI pattern:** Uses WebSocket for dynamically connecting providers (e.g., Gemini via WebSocket). Only relevant if we add browser-based provider injection.

### Hot-Reload of Config Files

**Priority: Low** | **Complexity: Low** | **Partially Implemented**

Watch configuration files for changes and reload without restart.

- **Credentials hot-reload:** Already implemented — accounts are loaded per-request from disk, and runtime state auto-resets when credentials change (including re-enabling disabled accounts)
- **What's missing:** Config file hot-reload (`proxy-config.yaml`) — currently requires proxy restart. Could use `chokidar` or `fs.watch` to detect YAML changes and reload ModelRouter, strategy, and other settings
- **CLIProxyAPI pattern:** Uses `fsnotify` with debouncing (50ms for files, 150ms for config) and SHA256 change detection

### Quota-Aware Routing

**Priority: Medium** | **Complexity: Low**

Use captured quota data (`account-quotas.json`) to make smarter routing decisions.

- **Current behavior:** Fill-first — exhausts one account before moving to the next on 429/401
- **Enhancement:** Check `sessionUsed` / `weeklyUsed` before routing. If the primary account is above the `fallbackPercentage` threshold (50%), proactively switch to the next account before hitting a hard 429
- **Data available:** All quota headers are already captured and stored per-account

### Per-Model Account Restrictions

**Priority: Low** | **Complexity: Low**

Allow configuring which accounts can use which models.

- **Use case:** Account A has Max subscription (can use Opus), Account B has Pro (Sonnet/Haiku only). Routing Opus requests to Account B wastes a round-trip on a guaranteed 403.
- **CLIProxyAPI pattern:** Per-account `excluded-models` list with wildcard matching
- **Implementation:** Add `excludedModels?: string[]` to account config, filter during account selection
