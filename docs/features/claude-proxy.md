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

The proxy uses three coordinated token refresh paths:

1. **Background check** -- Every 30 seconds, one non-overlapping maintenance cycle checks allowed, enabled accounts.
2. **Pre-request check** -- A request refreshes an OAuth token when it is within 5 minutes of expiry.
3. **401 retry** -- An unexpected Anthropic 401 triggers refresh and bounded retry before account rotation.

Refresh calls sharing the same rotating refresh token are serialized and reuse the winning result. Credential rejection responses (`400`, `401`, `403`, or `404`) disable the account until explicit login; network errors, refresh-endpoint `429`s, and `5xx` responses apply a bounded 30-second to 5-minute auth cooldown instead. Automatic token saves preserve an operator-disabled account's metadata.

Refreshed TokenStore and legacy credentials are persisted with `0o600` permissions using serialized atomic snapshot writes.

### Multi-Account Routing

When multiple accounts are available, the proxy uses **fill-first** routing:

1. Use the first non-cooling account for every request.
2. On a 429, classify the authoritative quota window, persist its cooldown, and try the next account.
3. Continue until a request succeeds or all accounts are exhausted.
4. If all accounts are exhausted, walk the fallback chain (alternative providers).
5. If all fallbacks fail, return a 429 with a `Retry-After` header indicating the earliest account recovery time.

If every account has a known future cooldown, the proxy does not call any of them again. Cooldowns survive restarts in `~/.neurolink/account-cooldowns.json`.

Account sources are checked in priority order:

1. **TokenStore** compound keys (e.g., `anthropic:work`, `anthropic:personal`) -- from `neurolink auth login --label`
2. **Legacy credentials file** (`~/.neurolink/anthropic-credentials.json`) -- only if no TokenStore accounts exist
3. **Environment variable** (`ANTHROPIC_API_KEY`) -- only if no other accounts exist

#### Designating a primary (home) account

By default the "first" account is the first key in token-store insertion order. To override this without re-OAuthing or editing the encrypted token store, set `routing.primary-account` in the proxy config. The proxy resolves the email to a stable token-store key per request, so the choice survives account additions/removals and only takes effect when that account is currently authenticated:

```bash
neurolink auth set-primary alice@example.com
neurolink proxy status   # Config: generation N
curl http://127.0.0.1:55669/status   # stats.primaryAccount.label = alice@example.com
```

After a 429 cools off, traffic returns to the configured primary (not literal index 0). When the configured account is missing or disabled, the proxy logs a warning while loading the configuration and falls back to insertion-order index 0. See the [config reference](./claude-proxy-config-reference.md#neurolink-auth-set-primary) for the full CLI surface (`set-primary` / `get-primary` / `clear-primary`).

#### Restricting eligible accounts

`primary-account` controls ordering; it is not a security or isolation boundary. To ensure the proxy can use only an explicit set of Anthropic credentials, configure `routing.account-allowlist`:

```yaml
routing:
  primary-account: primary@example.com
  account-allowlist:
    - primary@example.com
```

Entries accept an email/label or a full `anthropic:<email-or-label>` key and are matched case-insensitively. When the field is present, unlisted TokenStore accounts are excluded before token loading or refresh. The legacy credential and `ANTHROPIC_API_KEY` fallback are also denied unless explicitly listed as `legacy-default` or `env`, and neither hidden fallback is considered while any Anthropic TokenStore entry exists. An empty list denies all Anthropic credentials; an absent field preserves unrestricted account discovery.

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

The proxy loads configuration from `~/.neurolink/proxy-config.yaml` by default (override with `--config`). The file supports YAML or JSON format with environment variable interpolation. The running proxy watches this file and its resolved proxy env file. Valid routing edits are published atomically for new requests; in-flight requests keep their original generation. Invalid or deleted observed files are rejected and the last-known-good generation remains active.

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
  quota-routing: true
  session-soft-limit: 0.97
  session-reset-tolerance-ms: 900000
  primary-account: primary@example.com
  account-allowlist:
    - primary@example.com

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

### `neurolink proxy analyze`

Read the proxy's own request and attempt logs and report what actually happened:
per-account success and failure counts, retry-recovered requests, terminal error
categories, and routing decisions.

```bash
neurolink proxy analyze                       # summarise the retained window
neurolink proxy analyze --logs-dir <path>     # a specific log directory
```

Reported counts are bounded by log retention. When the request and attempt
windows are not comparable, the command says so rather than printing a
recovered-after-retry figure it cannot stand behind.

### `neurolink proxy replay <export|compare>`

Reconstruct a captured request for debugging, or send it directly upstream to
compare proxied and direct behaviour.

```bash
neurolink proxy replay export --request-id <id> --output bundle.json
neurolink proxy replay compare --bundle bundle.json --execute
```

`compare` reaches a provider, so it requires the explicit `--execute` flag.
Captured bodies are redacted; supply `--body-file` when a full body is needed,
and `--header-env` to inject a credential from an environment variable rather
than a literal.

### `neurolink proxy share <action>`

Lend spare pool capacity to a peer, with the terms enforced on every request.
See [Proxy Peer Sharing](/docs/features/proxy-peer-sharing) for the full guide.

```bash
neurolink proxy share url https://proxy.example.com   # record this node's address
neurolink proxy share url                             # show it
neurolink proxy share url get                         # bare value, for scripts
neurolink proxy share url --clear                     # forget it
neurolink proxy share create --peer <name> --preset spare
neurolink proxy share list | status [--peer <name>]
neurolink proxy share pause  --peer <name>            # stops at their next request
neurolink proxy share resume --peer <name>
neurolink proxy share set    --peer <name> --reserve 40 --max-slice 5h=15
neurolink proxy share topup  --peer <name> --coins 200
neurolink proxy share rotate --peer <name>            # new token, same controls
neurolink proxy share revoke --peer <name>
neurolink proxy share delete --peer <name>
neurolink proxy share level  --peer <name> --to complete
neurolink proxy share provision --peer <name> --from-account <account-label>
neurolink proxy share provision --peer <name> --code <code>   # finish it
neurolink proxy share receipts --peer <name>          # what you charged them
neurolink proxy share note --coins 200 --ttl 30d      # mint a transferable note
neurolink proxy share notes                           # notes minted, and spent
```

`share provision` is a **split-PKCE** flow: the borrower runs
`neurolink proxy peer request` first and keeps the verifier, you authorize in
your browser and relay a single-use code. You never hold a token for the
credential you mint. See
[Proxy peer sharing](/docs/features/proxy-peer-sharing).

Controls, all applied together:

| Flag                                           | Meaning                                                       |
| ---------------------------------------------- | ------------------------------------------------------------- |
| `--reserve 30`                                 | Keep 30% headroom on **each** account for yourself            |
| `--max-slice 20`                               | Borrower may take at most 20% of the **pool**, however spread |
| `--max-slice-per-account 20`                   | Apply that ceiling to each account independently instead      |
| `--spillover 12h<60@25`                        | Lend only near a reset, when little of the window was used    |
| `--models sonnet haiku`                        | Restrict which model tiers the share covers                   |
| `--accounts <label>`                           | Restrict which of your accounts are lendable                  |
| `--rate 20/min --concurrency 2`                | Request and in-flight ceilings                                |
| `--schedule 21-9`                              | Hours the share is open (wraps midnight)                      |
| `--expires 7d`                                 | Grant lifetime                                                |
| `--ledger coins --coins 500 --refill 100/week` | Meter it instead of leaving it open                           |

Presets fill these in: `spare` (reserve + pool slice), `spillover`, `metered`,
`open`. Any explicit flag overrides the preset.

### `neurolink proxy peer <action>`

Borrow capacity from someone else's pool. Peers are consulted **only after every
local account is spent**, ahead of the provider fallback chain.

```bash
neurolink proxy peer add --name <lender> --link "neurolink://share/...#<token>"
neurolink proxy peer add --name <lender> --url https://proxy.example.com --token <token>
neurolink proxy peer request --name <lender>                  # ask to be provisioned
neurolink proxy peer request --name <lender> --claim          # collect and install
neurolink proxy peer list | status [--json]
neurolink proxy peer test  --name <lender>                   # free reachability probe
neurolink proxy peer sync  [--name <lender>]                 # force a check-in
neurolink proxy peer receipts --name <lender>                # check what you were charged
neurolink proxy peer net      --name <lender>                # net reciprocal use
neurolink proxy peer redeem   --name <lender> --coin-note <note>
neurolink proxy peer set   --name <lender> --priority 5
neurolink proxy peer pause | resume | remove --name <lender>
```

### `neurolink proxy expose`

Publish this node through a `cloudflared` tunnel, for operators without an
address of their own. With no `--port` it picks the gate-only **share
listener** — the port that requires a grant on every request — and refuses to
open a tunnel to anything that serves untokened requests.

```bash
neurolink proxy expose                          # the share listener
neurolink proxy expose --port 3000              # or a port you name
neurolink proxy expose --named <tunnel-name>    # stable URL across restarts
```

The share listener starts on its own once at least one grant is active, on
`--share-port` (default: proxy port + 1). Your own client keeps using the main
port untokened.

If you already front the proxy with your own domain, skip this and record the
address with `neurolink proxy share url <url>` instead.

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

Remove accounts from the token store whose credentials no longer work.

```bash
neurolink auth cleanup           # Interactive: prompts before removing
neurolink auth cleanup --force   # Remove without prompting
```

Only accounts the proxy gave up on are deleted — expired entries with no refresh
token, and accounts disabled for `missing_refresh_token`, `refresh_invalid` or
`refresh_failed`. An account you disabled yourself, or one blocked by an
organization policy, still holds a valid login, so cleanup keeps it and tells you
to use `auth enable` or `auth remove` instead.

### `neurolink auth enable` / `neurolink auth disable`

Take an account out of the proxy pool, or put it back. Disabling keeps the
credentials; the proxy re-reads the token store on every request, so it takes
effect on the next one without a restart.

```bash
neurolink auth disable anthropic:work --reason "org disabled oauth"
neurolink auth enable anthropic:work
```

The proxy also disables an account automatically when Anthropic refuses it on an
organization entitlement policy (`403 permission_error`), after rotating the
request to a healthy account. Re-enable it once an admin restores access.

### `neurolink auth cooldown <action> [account]`

Inspect or release the per-account cooldowns the proxy persists after rate limits
and auth failures. `action` is `list` or `clear`.

```bash
neurolink auth cooldown list
neurolink auth cooldown clear anthropic:work
neurolink auth cooldown clear --all
```

A running proxy caches cooldowns for its process lifetime, so restart it for a
clear to take effect on an instance that is already serving.

### `neurolink auth overage [action]`

Show or set whether the pool may keep serving on paid extra usage once an
account's subscription window is spent. Writes `routing.use-overage` to the proxy
config, which a running proxy picks up automatically. `action` is `status`
(the default), `auto`, `always` or `never`.

```bash
neurolink auth overage                # current policy and per-account status
neurolink auth overage auto|always|never
neurolink auth overage never          # stop at the subscription limit
```

Only `never` overrides the provider. Nothing here can enable extra usage that
Anthropic reports as disabled — `status` names the reason when it is, for example
`org_level_disabled`.

### `neurolink auth set-primary` / `get-primary` / `clear-primary`

Pin routing to a preferred account, read the current pin, or remove it. The
primary is a preference, not a guarantee: a saturated or cooling primary is still
passed over.

```bash
neurolink auth set-primary <account-label>
neurolink auth get-primary
neurolink auth clear-primary
```

### `neurolink auth health`

Report per-account credential health — token validity, expiry, disabled state
and the reason for it.

```bash
neurolink auth health
neurolink auth health --format json
```

### `neurolink auth logout <provider>` / `neurolink auth remove <provider>`

`logout` clears stored tokens for a provider but keeps the account entry.
`remove` deletes the entry entirely.

```bash
neurolink auth logout anthropic
neurolink auth remove anthropic
```

### `neurolink auth validate <token>`

Check a token against the provider without storing it — useful when diagnosing
whether a credential or the routing around it is at fault.

```bash
neurolink auth validate <token>
```

### `neurolink auth providers`

List the providers the auth subsystem supports and which of them have stored
credentials.

```bash
neurolink auth providers
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

When `routing.account-allowlist` is configured, this discovery happens only within the allowed set. A disabled or unavailable TokenStore account does not cause the proxy to activate a legacy file or environment key while TokenStore entries still exist.

Within the account pool, the proxy uses **fill-first** routing: it always tries the first non-cooling account and only switches on failure. This avoids unnecessary identity switches that could confuse Claude Code's session state.

### Model-scoped weekly limits

Some plans cap a specific model separately from the overall weekly window — a
Fable-only weekly allowance, for instance. Anthropic reports that cap as its own
header family (`anthropic-ratelimit-unified-7d_oi-*`), sent **only** on responses
for the model it applies to, so the proxy learns about it from live traffic
rather than needing a refresh.

Routing treats a spent model-scoped cap as per-model, never per-account:

- An account whose cap for the requested model is spent is skipped for **that
  model only**. It stays fully available for every other model, and no cooldown
  is set — cooling is account-wide and would wrongly withhold a healthy account.
- Among accounts that do have headroom, the one closest to spending its
  allowance is preferred, so the pool finishes an allowance rather than spreading
  across all of them. This rung only applies when both candidates report a window
  for the model.
- If **every** account has spent the cap, the request is not attempted. The
  client gets a `429` naming the model, the real reset time, and that other
  models remain available — switch model, or add an account with headroom.
- A scoped window older than the quota freshness budget is ignored, so stale or
  mis-parsed data can never take the pool down. Routing falls back to attempting
  the request.

`neurolink auth list` shows any scoped window under its account, and
`GET /limits` returns the full `windows[]` array.

### Cooldown and backoff

When an account encounters an error, it enters a cooldown period based on the error type:

| Failure                                                | Cooldown                                           | Behavior                                         |
| ------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------ |
| Authoritative unified, 5-hour, or 7-day rejection      | Upstream reset or `Retry-After`, capped per reason | Persist cooldown and rotate immediately          |
| Transient burst 429                                    | Upstream delay, capped at 15 minutes               | At most 2 same-account retries, then rotate      |
| Refresh credential rejection (`400`/`401`/`403`/`404`) | Disabled until explicit login                      | Rotate without retrying an invalid refresh token |
| Refresh network, `429`, or `5xx`                       | 30 seconds to 5 minutes                            | Persist auth cooldown and rotate                 |
| Upstream `5xx` or network error                        | Bounded same-account retries                       | Rotate after retry budget                        |

Cooldown updates are extend-only: a late concurrent response cannot shorten a longer known reset window.

Each cooldown is also capped by what its reason can mean — a `session` cooldown
describes a 5-hour window, so it can never run for days no matter what reset the
upstream reports. The cap is applied when the cooldown is written and again when
it is read back from disk, so an entry written by an older build heals itself on
load and logs that it did:

```
[proxy] cooldown clamp: anthropic:work session entry healed from 206.0h to 5.3h — the stored wait exceeded what "session" can mean
```

Use `neurolink auth cooldown list` to see what is currently parked, and
`neurolink auth cooldown clear <account>` to release one.

## Error Handling

The proxy classifies upstream errors and applies different strategies:

### 429 Rate Limit

- Treat top-level `anthropic-ratelimit-unified-status: rejected` as authoritative, even if sub-windows still say `allowed`.
- Prefer the rejected 5-hour or 7-day reset and otherwise use `Retry-After`.
- Persist the cooldown and rotate immediately for authoritative exhaustion.
- Return the earliest recovery timestamp without another upstream request when all accounts are cooling.

### 401/402/403 Authentication Errors

- **OAuth accounts with refresh token:** Serialize refresh, persist the new rotating token, and retry. A rejected refresh credential disables the account until re-authentication; transient refresh infrastructure errors cool and rotate.
- **OAuth accounts without refresh token:** Disable until re-authentication and rotate.
- **API key accounts:** Rotate after authentication failure.

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
- Apply bounded same-account retries, then rotate to the next account.

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

The proxy persists its running state to `~/.neurolink/proxy-state.json` so that `neurolink proxy status` can report on it and `neurolink proxy start` can detect an already-running instance. The state includes PID, port, host, strategy, start time, fallback chain, enforced account allowlist, and the optional foreground fail-open guard PID.

### Fail-open guard

A foreground proxy spawns one detached `neurolink proxy guard` that removes stale Claude Code settings after confirming its parent process has died. A launchd-managed proxy keeps restart ownership in launchd and starts a separate updater-only worker. Automatic package updates are enabled by default and can be disabled with `NEUROLINK_PROXY_AUTO_UPDATE=off` (also accepts `0` or `false`). The worker validates the global package root and executable directory, requires the package manager that owns the running installation, and waits for every request and stream to finish plus a two-minute idle window before asking launchd to restart. Post-install executable validation uses bounded retries, and the proxy supervises and replaces an updater worker that exits unexpectedly. Installed-but-not-running versions and stage-specific update failures remain persisted in `~/.neurolink/update-state.json`. Updater diagnostics are written to `~/.neurolink/logs/proxy-updater.log` and exposed in `neurolink proxy status`.

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

1. Load allowed, enabled TokenStore accounts. Consider legacy or environment credentials only when no Anthropic TokenStore entries exist and the source is allowed.
2. Select the first non-cooling account according to the active routing strategy. With the default `fill-first` strategy, this is always the current primary account until it cools down.
3. Auto-refresh the token if expiring within 5 minutes, sharing one in-flight refresh for concurrent requests.
4. Forward the raw request body via plain `fetch()` to `https://api.anthropic.com/v1/messages?beta=true`.
5. Set authentication headers (`Authorization: Bearer` for OAuth, `x-api-key` for API keys).
6. Forward client headers as-is, preserving Claude Code's own request shape, then merge in required OAuth betas and trace headers when absent. The proxy extracts incoming `traceparent` and `x-neurolink-*` headers and injects outbound trace context plus `x-claude-code-session-id` when needed.
7. For streaming: verify the first chunk (bootstrap retry), then forward the stream. For non-streaming: return JSON.

This mode preserves the exact request format that Claude Code expects, including thinking blocks, cache control headers, and multi-turn tool use conversations. Rate-limit headers from Anthropic are passed through to the client — see [Limit response headers](#limit-response-headers) below.

### Limit response headers

Every proxy response — streaming, non-streaming, and errors including 429 — carries the account's limit state. There are two layers.

**Verbatim passthrough.** Anthropic's own `anthropic-ratelimit-*` headers and `retry-after` are forwarded unchanged. This is deliberate: a proxied response looks identical to a direct one, so a client needs only a single parser for both. Which family is present depends on the serving account:

| Account type         | Headers                                                                                            | Semantics                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| OAuth / subscription | `anthropic-ratelimit-unified-5h-*`, `-7d-*`, `-status`, `-overage-status`                          | **Utilization** (0.0-1.0 of capacity _used_) plus a reset epoch. Anthropic publishes no absolute remaining count for subscription windows. |
| API key              | `anthropic-ratelimit-requests-remaining`/`-limit`, `anthropic-ratelimit-tokens-remaining`/`-limit` | Absolute remaining counts.                                                                                                                 |

**NeuroLink additions** (`x-neurolink-*`) carry what only the proxy knows:

| Header                                                                     | Meaning                                                                                                                                          |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `x-neurolink-quota-source`                                                 | `live` (parsed from this response), `snapshot` (last known reading for the account), or `none` (no Anthropic account served it). Always present. |
| `x-neurolink-account` / `-account-type`                                    | Which account served the request, and whether it is `oauth` or `api_key`.                                                                        |
| `x-neurolink-served-by`                                                    | `anthropic`, or the fallback provider name when routing fell through.                                                                            |
| `x-neurolink-quota-session-left-pct` / `-weekly-left-pct`                  | Derived headroom, `(1 - utilization) × 100`. Omitted when `quota-source` is `none`.                                                              |
| `x-neurolink-quota-session-resets-in` / `-weekly-resets-in`                | Seconds until the window resets.                                                                                                                 |
| `x-neurolink-quota-session-status` / `-weekly-status` / `-unified-status`  | `allowed`, `throttled`, or `rejected`.                                                                                                           |
| `x-neurolink-account-cooling-until` / `-cooling-reason`                    | Set when the serving account is in a cooldown window.                                                                                            |
| `x-neurolink-pool-available` / `-pool-cooling` / `-pool-best-session-left` | Account-pool headroom — how many accounts are usable and the best remaining capacity among them.                                                 |

> **`quota-source` matters.** When a fallback provider serves the request, or Anthropic returns no quota headers, the proxy reports `none` and omits the headroom figures rather than echoing a stale snapshot. Treat `snapshot` as "last known", not "current".

Account labels are frequently email addresses and are emitted as-is; the proxy binds to `127.0.0.1` by default. If you expose it beyond localhost, terminate and authenticate it in front — the proxy performs no inbound authentication of its own.

**Consuming from the SDK.** The Anthropic provider parses these headers on every request in both auth modes and surfaces them on `result.limits` and `result.analytics.limits`, logs one line per request (escalating to WARN below 15% session headroom or on a `throttled`/`rejected` status), and sets `neurolink.claude.quota.*` span attributes alongside `gen_ai.usage.*`. This works without the proxy too — direct subscription traffic returns the same unified headers.

```typescript
const result = await neurolink.generate({
  prompt: "...",
  provider: "anthropic",
});
console.log(result.limits?.rateLimit.sessionLeftPct); // e.g. 58
console.log(result.limits?.quotaSource); // "live"
console.log(result.limits?.account); // set only when routed through the proxy
```

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

- Final completed, successful, and failed request counts
- Upstream attempts and failed attempts, including authentication retries,
  network failures, and retries that later recovered
- Transient-throttle and exhausted-quota attempt counts
- Current account cooling state

Final request counters add up across accounts and match proxy-wide completed, success, and error totals. Attempt counters are intentionally separate because one final request can make several attempts or rotate accounts. Statistics reset on proxy restart. Access them via the `/status` endpoint or `neurolink proxy status`.

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

**Implemented**

- **Credentials:** Accounts are loaded per request, and runtime state resets when credentials change.
- **Routing config:** The config and proxy env files are polled with debouncing and SHA256 effective-config detection. Model mappings, fallback chain, passthrough models, strategy, primary account, account allowlist, and quota routing controls apply to the next request without a restart.
- **Failure behavior:** Parse, validation, missing-file, and primary/allowlist conflicts leave the last-known-good generation active. `/status` and `neurolink proxy status` report the generation and last rejection.
- **Manual trigger:** Send `SIGHUP` to request an immediate serialized reload. File watching remains the normal path.

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
