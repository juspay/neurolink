---
title: Claude Proxy Configuration Reference
description: Complete reference for all CLI flags, config file fields, environment variables, and file locations for the NeuroLink Claude proxy
keywords: claude, proxy, configuration, reference, yaml, cli, environment, oauth, tokens, routing, cloaking
---

# Claude Proxy Configuration Reference

This document is the authoritative reference for every configurable aspect of the NeuroLink Claude proxy. It covers CLI flags, the YAML config file schema, environment variables, auto-configured Claude Code settings, and all file locations.

---

## 1. CLI Flags

### `neurolink proxy start`

Start the Claude multi-account proxy server.

| Flag                | Alias | Type      | Default                          | Description                                                       |
| ------------------- | ----- | --------- | -------------------------------- | ----------------------------------------------------------------- |
| `--port`            | `-p`  | `number`  | `55669`                          | Port to listen on.                                                |
| `--host`            | `-H`  | `string`  | `127.0.0.1`                      | Host/IP to bind to. Use `0.0.0.0` to listen on all interfaces.    |
| `--strategy`        | `-s`  | `string`  | `fill-first`                     | Account selection strategy. Choices: `fill-first`, `round-robin`. |
| `--health-interval` |       | `number`  | `30`                             | Health check interval in seconds.                                 |
| `--quiet`           | `-q`  | `boolean` | `false`                          | Suppress non-essential output (banner, status messages).          |
| `--debug`           | `-d`  | `boolean` | `false`                          | Enable debug output (stack traces on errors, verbose logging).    |
| `--config`          | `-c`  | `string`  | `~/.neurolink/proxy-config.yaml` | Path to proxy config file (YAML or JSON).                         |
| `--env-file`        |       | `string`  |                                  | Path to .env file for provider API keys (overrides cwd .env).     |
| `--passthrough`     |       | `boolean` | `false`                          | Transparent forwarding: no retry, rotation, or polyfill.          |

**Examples:**

```bash
# Start with defaults (port 55669, fill-first strategy)
neurolink proxy start

# Custom port and explicit round-robin strategy
neurolink proxy start -p 8080 -s round-robin

# Start with 60-second health checks, debug output
neurolink proxy start --health-interval 60 --debug

# Use a custom config file
neurolink proxy start --config /path/to/my-proxy.yaml
```

### `neurolink proxy status`

Show the current proxy status.

| Flag       | Alias | Type      | Default | Description                             |
| ---------- | ----- | --------- | ------- | --------------------------------------- |
| `--format` |       | `string`  | `text`  | Output format. Choices: `text`, `json`. |
| `--quiet`  | `-q`  | `boolean` | `false` | Suppress non-essential output.          |

**Examples:**

```bash
# Human-readable status
neurolink proxy status

# Machine-readable JSON (for scripts)
neurolink proxy status --format json
```

**JSON output shape** (when `--format json`):

```json
{
  "running": true,
  "pid": 12345,
  "port": 55669,
  "host": "127.0.0.1",
  "strategy": "fill-first",
  "startTime": "2025-03-22T10:00:00.000Z",
  "uptime": 3600000,
  "url": "http://127.0.0.1:55669",
  "fallbackChain": [{ "provider": "google-ai", "model": "gemini-2.5-pro" }],
  "stats": {
    "totalAttempts": 42,
    "totalRequests": 31,
    "totalSuccess": 29,
    "totalErrors": 2,
    "totalRateLimits": 5
  }
}
```

### `neurolink proxy telemetry <action>`

Manage the repo-owned local OpenObserve stack and the maintained proxy dashboard.

| Action             | Description                                                             |
| ------------------ | ----------------------------------------------------------------------- |
| `setup`            | Start OpenObserve + OTEL collector and import the maintained dashboard  |
| `start`            | Start the local telemetry stack without re-importing the dashboard      |
| `stop`             | Stop the local telemetry stack                                          |
| `status`           | Show local stack health and endpoint info                               |
| `logs`             | Follow OpenObserve and collector logs                                   |
| `import-dashboard` | Re-import the dashboard and dedupe older dashboards with the same title |

| Flag      | Alias | Type      | Default | Description                                       |
| --------- | ----- | --------- | ------- | ------------------------------------------------- |
| `--quiet` | `-q`  | `boolean` | `false` | Suppress the local CLI spinner before delegating. |

**Examples:**

```bash
neurolink proxy telemetry setup
neurolink proxy telemetry status
neurolink proxy telemetry logs
```

### `neurolink proxy setup`

One-command setup: login + install proxy service + configure Claude Code.

| Flag           | Alias | Type      | Default | Description                                         |
| -------------- | ----- | --------- | ------- | --------------------------------------------------- |
| `--port`       | `-p`  | `number`  | `55669` | Proxy port.                                         |
| `--method`     |       | `string`  | `oauth` | Authentication method. Choices: `oauth`, `api-key`. |
| `--no-service` |       | `boolean` | `false` | Skip launchd install, just start foreground.        |
| `--env-file`   |       | `string`  |         | Path to a proxy provider env file to persist.       |

**Examples:**

```bash
# Full setup with defaults (OAuth login, port 55669, launchd service)
neurolink proxy setup

# Setup on a custom port
neurolink proxy setup -p 9000

# Login + start foreground (no auto-restart service)
neurolink proxy setup --no-service
```

**What `proxy setup` does:**

1. Checks for existing authenticated accounts in the TokenStore.
2. Falls back to the legacy `~/.neurolink/anthropic-credentials.json` file.
3. If no valid accounts are found, runs the OAuth login flow.
4. Installs as macOS launchd service (auto-restart on crash/reboot) and configures Claude Code. Use `--no-service` for foreground start.

### `neurolink proxy guard` (hidden)

Internal fail-open guard process. Spawned automatically by `proxy start` as a detached child. Monitors the proxy health endpoint and reverts Claude Code settings if the proxy dies unexpectedly.

| Flag                  | Type      | Default      | Description                                                  |
| --------------------- | --------- | ------------ | ------------------------------------------------------------ |
| `--host`              | `string`  | `127.0.0.1`  | Proxy host to monitor.                                       |
| `--port`              | `number`  | `55669`      | Proxy port to monitor.                                       |
| `--parent-pid`        | `number`  | _(required)_ | PID of the parent proxy process.                             |
| `--max-wait-ms`       | `number`  | `0`          | Maximum monitoring duration (0 = indefinite).                |
| `--failure-threshold` | `number`  | `5`          | Consecutive health check failures before triggering cleanup. |
| `--poll-interval-ms`  | `number`  | `1000`       | Interval between health checks in milliseconds.              |
| `--quiet`             | `boolean` | `true`       | Suppress output (guards are silent by default).              |

You should never need to run this command manually.

### `neurolink proxy install`

Install the proxy as a persistent macOS launchd service. The service auto-starts on login and auto-restarts on crash (5-second throttle). Currently macOS-only.

| Flag         | Alias | Type     | Default     | Description                                                   |
| ------------ | ----- | -------- | ----------- | ------------------------------------------------------------- |
| `--port`     | `-p`  | `number` | `55669`     | Proxy port.                                                   |
| `--host`     |       | `string` | `127.0.0.1` | Proxy host/IP to bind to.                                     |
| `--env-file` |       | `string` |             | Path to provider env file to persist for the service.         |
| `--config`   |       | `string` |             | Path to proxy routing config file to persist for the service. |

**Examples:**

```bash
# Install with defaults (port 55669)
neurolink proxy install

# Install on custom port
neurolink proxy install -p 9000
```

**What it does:**

1. Writes a launchd plist to `~/Library/LaunchAgents/com.neurolink.proxy.plist`.
2. Loads the service via `launchctl load`.
3. The service runs `neurolink proxy start --port <port> --host <host> --quiet` and persists any `--env-file` / `--config` values into the managed service definition.
4. Logs go to `~/.neurolink/logs/proxy-launchd-stdout.log` and `proxy-launchd-stderr.log`.

**Management:**

```bash
# Start/stop manually
launchctl start com.neurolink.proxy
launchctl stop com.neurolink.proxy

# Remove entirely
neurolink proxy uninstall
```

### `neurolink proxy uninstall`

Remove the proxy launchd background service. Unloads the service and deletes the plist file. Currently macOS-only.

No flags.

**Examples:**

```bash
neurolink proxy uninstall
```

### `neurolink auth cleanup`

Remove expired and disabled accounts from the token store.

| Flag      | Type      | Default | Description                                        |
| --------- | --------- | ------- | -------------------------------------------------- |
| `--force` | `boolean` | `false` | Skip confirmation when removing disabled accounts. |

**Examples:**

```bash
# Interactive cleanup (prompts before removing disabled accounts)
neurolink auth cleanup

# Force cleanup without confirmation
neurolink auth cleanup --force
```

**What it does:**

1. Prunes expired entries that have no refresh token.
2. Finds permanently disabled entries (e.g., accounts that failed refresh).
3. Prompts for confirmation before removing disabled accounts (unless `--force`).

### `neurolink auth enable`

Re-enable a previously disabled account so it can be used by the proxy pool again.

| Argument    | Type     | Required | Description                                           |
| ----------- | -------- | -------- | ----------------------------------------------------- |
| `<account>` | `string` | **Yes**  | Account key to re-enable (e.g., `anthropic:1-VjRIq`). |

**Examples:**

```bash
# Re-enable a disabled account
neurolink auth enable anthropic:1-VjRIq
```

Run `neurolink auth list` to see all accounts and their current status.

### `neurolink auth set-primary`

Designate the proxy's primary (home) Anthropic account by email/label. Writes `routing.primary-account` to the proxy config YAML; the proxy reads it on startup and tries this account first under fill-first (or uses it as the home reference under round-robin). Does **not** touch the encrypted token store and does **not** require re-OAuthing any account.

| Argument   | Type     | Required | Description                                                               |
| ---------- | -------- | -------- | ------------------------------------------------------------------------- |
| `<email>`  | `string` | **Yes**  | Email/label of the Anthropic account to make primary.                     |
| `--config` | `string` | No       | Path to the proxy config file. Default: `~/.neurolink/proxy-config.yaml`. |

If the email is not currently authenticated in the token store, the command still writes the field and prints a warning — the setting activates automatically once the account is added via `auth login --add`. If a proxy is currently running, a restart hint is printed.

**Examples:**

```bash
# Make alice@example.com primary in the default config
neurolink auth set-primary alice@example.com

# Use a non-default config path
neurolink auth set-primary alice@example.com --config ./proxy.yaml
```

> Note: writing YAML uses `js-yaml.dump`, which does not preserve comments. The command prints a warning before writing if the existing file contains comments. JSON config paths preserve everything except whitespace.

### `neurolink auth get-primary`

Show the proxy's currently configured primary account (and whether it is authenticated).

| Argument   | Type     | Required | Description                                                               |
| ---------- | -------- | -------- | ------------------------------------------------------------------------- |
| `--config` | `string` | No       | Path to the proxy config file. Default: `~/.neurolink/proxy-config.yaml`. |

**Examples:**

```bash
neurolink auth get-primary
```

Output (when configured and authenticated):

```
Configured primary: alice@example.com
Status: authenticated (anthropic:alice@example.com present in token store)
Source: /Users/.../.neurolink/proxy-config.yaml
```

### `neurolink auth clear-primary`

Remove `routing.primary-account` (and `routing.primaryAccount`) from the proxy config. The proxy reverts to insertion-order fallback on next start.

| Argument   | Type     | Required | Description                                                               |
| ---------- | -------- | -------- | ------------------------------------------------------------------------- |
| `--config` | `string` | No       | Path to the proxy config file. Default: `~/.neurolink/proxy-config.yaml`. |

**Examples:**

```bash
neurolink auth clear-primary
```

Idempotent — clearing when no primary is configured prints `No primary account was configured.` and exits 0.

---

## 2. Config File (`~/.neurolink/proxy-config.yaml`)

The proxy loads its configuration from a YAML (or JSON) file. The default location is `~/.neurolink/proxy-config.yaml`. Override it with `--config`.

YAML parsing uses `js-yaml` when available; otherwise falls back to `JSON.parse`.

### Environment Variable Interpolation

All string values support `${VAR_NAME}` and `${VAR_NAME:-default}` syntax for environment variable resolution:

```yaml
accounts:
  anthropic:
    - name: production
      apiKey: "${ANTHROPIC_API_KEY}" # resolved from env
    - name: backup
      apiKey: "${BACKUP_KEY:-sk-fallback-123}" # with default value
```

Resolution order:

1. Look up `VAR_NAME` in `process.env`.
2. If not found, use the `:-default` value when present.
3. If no default, the literal `${VAR_NAME}` token is preserved (validation will catch missing keys).

### Full Schema

```yaml
# ---------------------------------------------------------------------------
# Top-level fields
# ---------------------------------------------------------------------------

# Schema version (optional, default: 1)
version: 1

# Default provider applied when not specified per-account (optional)
defaultProvider: "anthropic"

# Default base URL applied to accounts that omit baseUrl (optional)
defaultBaseUrl: "https://api.anthropic.com"

# ---------------------------------------------------------------------------
# accounts (REQUIRED)
# ---------------------------------------------------------------------------
# Map of provider names to arrays of account configurations.
# At least one provider with at least one account is required.
accounts:
  anthropic:
    - name: "personal-pro" # Human-readable label (default: "unnamed")
      apiKey: "${ANTHROPIC_KEY_1}" # API key or OAuth token (REQUIRED, non-empty)
      baseUrl: "https://api.anthropic.com" # Base URL override (optional)
      orgId: "org-abc123" # Organization ID (optional)
      weight: 2 # Weight for weighted round-robin (default: 1)
      enabled: true # Whether this account is active (default: true)
      rateLimit: 60 # Max requests per minute (optional)
      metadata: # Arbitrary metadata (optional)
        tier: "pro"
        notes: "Main account"

    - name: "team-max"
      apiKey: "${ANTHROPIC_KEY_2}"
      weight: 3
      enabled: true

# ---------------------------------------------------------------------------
# routing (optional)
# ---------------------------------------------------------------------------
# Controls model mapping, fallback chains, and routing strategy.
# Accepts both camelCase and kebab-case keys for YAML-friendliness.
routing:
  # Account selection strategy: "round-robin" | "fill-first"
  strategy: "fill-first"

  # Primary (home) account: under fill-first this account is tried first;
  # under round-robin it is the home reference for cooling resets and the
  # starting offset on member-count changes. Resolved per-request to a
  # stable token-store key (anthropic:<email>); a numeric index is never
  # persisted, so reordering accounts in the token store is irrelevant.
  # When omitted the proxy falls back to insertion-order index 0.
  # Accepts: primary-account (kebab) or primaryAccount (camel).
  # Manage via:
  #   neurolink auth set-primary <email>
  #   neurolink auth get-primary
  #   neurolink auth clear-primary
  primary-account: "alice@example.com"

  # Model mappings: remap incoming model names to different provider/model pairs
  # Accepts: model-mappings (kebab) or modelMappings (camel)
  model-mappings:
    - from: "claude-sonnet-4-20250514" # Model name sent by Claude Code
      to: "gemini-2.5-pro" # Target model name
      provider: "google-ai" # Target provider (default: "anthropic")

    - from: "claude-3-haiku-20240307"
      to: "gpt-4o-mini"
      provider: "openai"

  # Fallback chain: when all Claude accounts are exhausted, try these in order
  # Accepts: fallback-chain (kebab) or fallbackChain (camel)
  fallback-chain:
    - provider: "google-ai"
      model: "gemini-2.5-pro"
    - provider: "openai"
      model: "gpt-4o"

  # Passthrough models: model IDs that skip routing and go directly to Anthropic
  # Accepts: passthrough-models (kebab) or passthroughModels (camel)
  passthrough-models:
    - "claude-sonnet-4-20250514"
    - "claude-3-5-sonnet-20241022"
    - "claude-3-haiku-20240307"

# ---------------------------------------------------------------------------
# cloaking (optional)
# ---------------------------------------------------------------------------
# Cloaking pipeline for making proxy requests indistinguishable from
# genuine Claude Code sessions.
cloaking:
  # Mode: "auto" | "always" | "never"
  #   auto   - apply cloaking only to OAuth accounts (default behavior)
  #   always - apply to all accounts (OAuth and API key)
  #   never  - disable all cloaking plugins
  mode: "auto"

  plugins:
    # Strip proxy-revealing headers (x-forwarded-for, via, etc.)
    headerScrubber: true

    # Generate consistent session identities per account (1-hour TTL)
    sessionIdentity: true

    # Inject Claude Code session context into system prompt (OAuth only)
    systemPromptInjector: true

    # Zero-width character insertion into sensitive words
    wordObfuscator:
      enabled: true
      words: # Custom words to obfuscate
        - "proxy"
        - "neurolink"
        - "load balancer"
        - "round-robin"
        - "failover"
        - "multi-account"

    # TLS fingerprint mimicry (stub/placeholder -- not yet implemented)
    tlsFingerprint:
      enabled: false
```

### Field Reference Table

#### Top-Level Fields

| Field             | Type                        | Default  | Required | Description                                               |
| ----------------- | --------------------------- | -------- | -------- | --------------------------------------------------------- |
| `version`         | `number`                    | `1`      | No       | Config schema version.                                    |
| `defaultProvider` | `string`                    | _(none)_ | No       | Default provider name applied to accounts that omit it.   |
| `defaultBaseUrl`  | `string`                    | _(none)_ | No       | Default base URL applied to accounts that omit `baseUrl`. |
| `accounts`        | `Record<string, Account[]>` | _(none)_ | **Yes**  | Map of provider names to account arrays.                  |
| `routing`         | `RoutingConfig`             | _(none)_ | No       | Routing strategy, model mappings, and fallback chain.     |
| `cloaking`        | `CloakingConfig`            | _(none)_ | No       | Cloaking pipeline configuration.                          |

#### Account Fields

| Field       | Type                      | Default     | Required | Description                                                              |
| ----------- | ------------------------- | ----------- | -------- | ------------------------------------------------------------------------ |
| `name`      | `string`                  | `"unnamed"` | No       | Human-readable account label.                                            |
| `apiKey`    | `string`                  | _(none)_    | **Yes**  | API key or OAuth token. Supports `${ENV_VAR}` interpolation.             |
| `baseUrl`   | `string`                  | _(none)_    | No       | Override the provider's API base URL.                                    |
| `orgId`     | `string`                  | _(none)_    | No       | Organization ID (e.g., OpenAI organizations).                            |
| `weight`    | `number`                  | `1`         | No       | Weight for weighted round-robin selection. Higher weight = more traffic. |
| `enabled`   | `boolean`                 | `true`      | No       | Whether this account is active. Disabled accounts are skipped.           |
| `rateLimit` | `number`                  | _(none)_    | No       | Maximum requests per minute for this account.                            |
| `metadata`  | `Record<string, unknown>` | _(none)_    | No       | Arbitrary metadata (tier info, notes, tags).                             |

#### Routing Fields

| Field                                      | Type                            | Default  | Required | Description                                                                                                                                                                                                                                                                    |
| ------------------------------------------ | ------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `strategy`                                 | `"round-robin" \| "fill-first"` | _(none)_ | No       | Account selection strategy. `round-robin` rotates across accounts. `fill-first` uses one account until exhausted.                                                                                                                                                              |
| `primary-account` / `primaryAccount`       | `string`                        | _(none)_ | No       | Email/label of the Anthropic account to treat as primary (home). Resolved per-request to `anthropic:<email>`; falls back to insertion-order index 0 when absent or when the configured account isn't currently authenticated. Manage via `neurolink auth set-primary <email>`. |
| `model-mappings` / `modelMappings`         | `ModelMapping[]`                | `[]`     | No       | Array of model-to-model remapping rules.                                                                                                                                                                                                                                       |
| `fallback-chain` / `fallbackChain`         | `FallbackEntry[]`               | `[]`     | No       | Ordered list of alternative providers to try when primary accounts are exhausted.                                                                                                                                                                                              |
| `passthrough-models` / `passthroughModels` | `string[]`                      | `[]`     | No       | Model IDs that bypass routing and go directly to Anthropic.                                                                                                                                                                                                                    |

#### ModelMapping Fields

| Field      | Type     | Default       | Required | Description                                      |
| ---------- | -------- | ------------- | -------- | ------------------------------------------------ |
| `from`     | `string` | `""`          | Yes      | Incoming model name (what Claude Code requests). |
| `to`       | `string` | `""`          | Yes      | Target model name at the destination provider.   |
| `provider` | `string` | `"anthropic"` | No       | Target provider to route to.                     |

#### FallbackEntry Fields

| Field      | Type     | Default | Required | Description                                  |
| ---------- | -------- | ------- | -------- | -------------------------------------------- |
| `provider` | `string` | `""`    | Yes      | Provider name (e.g., `google-ai`, `openai`). |
| `model`    | `string` | `""`    | Yes      | Model to use at that provider.               |

#### Cloaking Fields

| Field                            | Type                            | Default                       | Description                                                                                                  |
| -------------------------------- | ------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `mode`                           | `"auto" \| "always" \| "never"` | `"auto"`                      | `auto` applies cloaking only to OAuth accounts. `always` applies to all. `never` disables all plugins.       |
| `plugins.headerScrubber`         | `boolean`                       | `false`                       | Strip proxy-revealing headers (x-forwarded-for, via, sec-ch-\*, etc.).                                       |
| `plugins.sessionIdentity`        | `boolean`                       | `false`                       | Generate consistent user_id/session_id per account with 1-hour TTL.                                          |
| `plugins.systemPromptInjector`   | `boolean`                       | `false`                       | Inject Claude Code session context (IDE metadata, timestamps) into system prompt. OAuth accounts only.       |
| `plugins.wordObfuscator.enabled` | `boolean`                       | `false`                       | Insert zero-width characters into sensitive words to defeat string matching.                                 |
| `plugins.wordObfuscator.words`   | `string[]`                      | `["proxy", "neurolink", ...]` | Words to obfuscate. Defaults include: proxy, neurolink, load balancer, round-robin, failover, multi-account. |
| `plugins.tlsFingerprint.enabled` | `boolean`                       | `false`                       | TLS fingerprint mimicry. Currently a stub/placeholder (no-op).                                               |

### Validation Rules

The config loader validates the following:

- `accounts` must be present and be a non-array object.
- Each provider key in `accounts` must map to an array.
- Each account must have a non-empty string `apiKey`.
- If `version` is present, it must be a number.
- Plaintext API keys (not using `${ENV_VAR}` references) trigger a warning.

---

## 3. Environment Variables

| Variable                      | Purpose                                                                                                                                                              | Used By                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `ANTHROPIC_API_KEY`           | Anthropic API key. Used as a fallback credential when no OAuth accounts are found.                                                                                   | Proxy routes, Anthropic provider                 |
| `ANTHROPIC_OAUTH_TOKEN`       | OAuth access token for Anthropic (alternative to stored tokens).                                                                                                     | Anthropic provider, providerConfig               |
| `CLAUDE_OAUTH_TOKEN`          | Alias for `ANTHROPIC_OAUTH_TOKEN`. Checked as a fallback.                                                                                                            | Anthropic provider, providerConfig               |
| `NEUROLINK_SKIP_MCP`          | Set to `"true"` to skip MCP server initialization. Automatically set by `proxy start` (tools come from Claude Code, not local MCP servers).                          | `NeuroLink` constructor                          |
| `NEUROLINK_LOG_LEVEL`         | Log level for the NeuroLink logger. Values: `error`, `warn`, `info`, `debug`.                                                                                        | Logger utility                                   |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP HTTP endpoint for proxy telemetry export. Written automatically to `~/.neurolink/.env` by `neurolink proxy telemetry setup`. Example: `http://localhost:14318`. | Proxy OTEL init (`initializeProxyOpenTelemetry`) |
| `NEUROLINK_ENV_FILE`          | Path to a `.env` file the proxy should load at startup. Overrides the default `~/.neurolink/.env` auto-load.                                                         | `proxyEnv.ts` (`resolveProxyEnvFile`)            |

### Proxy Env File Resolution Order

When the proxy starts, it loads env vars from a `.env` file using this priority:

1. `--env-file <path>` CLI flag — explicit path, required to exist.
2. `NEUROLINK_ENV_FILE=<path>` environment variable — explicit path, required to exist.
3. `~/.neurolink/.env` — loaded automatically if the file exists (created by `neurolink proxy telemetry setup`).
4. Nothing — proxy starts without extra env vars; telemetry remains disabled unless env vars are already set in the shell, and the proxy emits a startup log explaining how to enable it unless output is suppressed.

The `--env-file` flag is baked into the launchd plist by `proxy install`, so the service always loads from the same file across reboots.

**Priority for Anthropic credentials** (checked in order by the proxy routes):

1. **TokenStore compound keys** -- `anthropic:<label>` entries in `~/.neurolink/tokens.json`.
2. **Legacy credentials file** -- `~/.neurolink/anthropic-credentials.json` (only if no compound keys exist).
3. **`ANTHROPIC_API_KEY` env var** -- Only if no OAuth accounts are found at all.

---

## 4. Claude Code Settings

When the proxy starts, it automatically writes to `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:55669",
    "ENABLE_TOOL_SEARCH": "true"
  }
}
```

| Key                  | Value                  | Description                                                                 |
| -------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `ANTHROPIC_BASE_URL` | `http://<host>:<port>` | Tells Claude Code to route all Anthropic API requests through the proxy.    |
| `ENABLE_TOOL_SEARCH` | `"true"`               | Enables tool search in Claude Code (required for full proxy compatibility). |

**Lifecycle:**

- **On `proxy start`** -- Both keys are written (or merged into existing settings).
- **On `proxy stop` (Ctrl+C / SIGTERM)** -- Both keys are removed. Other env keys in the settings file are preserved.
- **Fail-open guard** -- If the proxy crashes without a clean shutdown, the detached guard process detects the unhealthy endpoint and removes the stale settings automatically.
- **Safety** -- If the `ANTHROPIC_BASE_URL` has been changed to a different value (e.g., another proxy), the cleanup will not overwrite it.

After starting the proxy, restart Claude Code for the new settings to take effect.

---

## 5. File Locations

All NeuroLink proxy files are stored under `~/.neurolink/` (with `0o700` directory permissions).

| File                                                         | Permissions  | Description                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `~/.neurolink/tokens.json`                                   | `0o600`      | **TokenStore** -- Multi-provider OAuth token storage. Stores tokens keyed by `provider:label` (e.g., `anthropic:personal`). XOR-obfuscated by default (not plaintext).                                                                                                                                                 |
| `~/.neurolink/anthropic-credentials.json`                    | `0o600`      | **Legacy credentials** -- Single-account OAuth tokens. Used as a fallback when no compound keys exist in `tokens.json`. Updated on token refresh (pre-request or on-401).                                                                                                                                              |
| `~/.neurolink/proxy-config.yaml`                             | user default | **Proxy config** -- YAML/JSON configuration file. Loaded by `proxy start` (default path, overridable with `--config`).                                                                                                                                                                                                 |
| `~/.neurolink/.env`                                          | `0o600`      | **Proxy env file** — Auto-loaded by the proxy on startup. Created with mode `0o600` by `neurolink proxy telemetry setup` with `OTEL_EXPORTER_OTLP_ENDPOINT`. Add any provider API keys or proxy env vars here to avoid exporting them in every shell session. Override path with `--env-file` or `NEUROLINK_ENV_FILE`. |
| `~/.neurolink/proxy-state.json`                              | user default | **Proxy state** -- Runtime state persisted by the running proxy (PID, port, host, strategy, start time, fallback chain, guard PID). Used by `proxy status` and the fail-open guard.                                                                                                                                    |
| `~/.neurolink/logs/proxy-YYYY-MM-DD.jsonl`                   | `0o600`      | **Request summary logs** -- One JSONL entry per completed proxied request. Includes requestId, method, path, model, status, account label, response time, token usage, and trace correlation fields.                                                                                                                   |
| `~/.neurolink/logs/proxy-attempts-YYYY-MM-DD.jsonl`          | `0o600`      | **Attempt logs** -- One JSONL entry per upstream attempt. Useful for retry, failover, and cooldown debugging without inflating request totals.                                                                                                                                                                         |
| `~/.neurolink/logs/proxy-debug-YYYY-MM-DD.jsonl`             | `0o600`      | **Debug index logs** -- Redacted body-capture index rows with phase, headers, status, duration, and the stored body artifact path.                                                                                                                                                                                     |
| `~/.neurolink/logs/bodies/YYYY-MM-DD/<request-id>/*.json.gz` | `0o600`      | **Body artifacts** -- Compressed redacted request and response bodies captured for debugging.                                                                                                                                                                                                                          |
| `~/.neurolink/account-quotas.json`                           | user default | **Account quotas** -- Cached quota/utilization data from Anthropic's `unified-5h` and `unified-7d` rate-limit headers. Flushed to disk every 5 seconds.                                                                                                                                                                |
| `~/.claude/settings.json`                                    | user default | **Claude Code settings** -- Auto-configured with `ANTHROPIC_BASE_URL` and `ENABLE_TOOL_SEARCH` when the proxy starts. Cleaned up on shutdown.                                                                                                                                                                          |

### TokenStore Details

The `tokens.json` file uses this internal structure (after deobfuscation):

```json
{
  "version": "2.0",
  "lastModified": 1711100000000,
  "providers": {
    "anthropic:personal": {
      "tokens": {
        "accessToken": "...",
        "refreshToken": "...",
        "expiresAt": 1711103600000,
        "tokenType": "Bearer",
        "scope": "..."
      },
      "createdAt": 1711100000000,
      "lastAccessed": 1711100000000
    },
    "anthropic:team": {
      "tokens": { "...": "..." },
      "createdAt": 1711100000000,
      "lastAccessed": 1711100000000
    }
  }
}
```

The `TokenStore` class options:

- `encryptionEnabled` (default: `true`) -- XOR obfuscation with a machine-derived key.
- `customStoragePath` -- Override the default `~/.neurolink/tokens.json` path.

Tokens are automatically refreshed 1 hour before expiration when a `TokenRefresher` function is registered.

---

## 6. Model Mapping Examples

Model mappings let you reroute specific model requests to different providers. The proxy's `ModelRouter` checks mappings in this order:

1. **Explicit mapping** -- If the requested model has a `from` match in `model-mappings`, use the corresponding `to`/`provider`.
2. **Gemini prefix** -- If the requested model starts with `gemini-`, route to Vertex by default.
3. **Passthrough list** -- If the model is in `passthrough-models`, route to Anthropic.
4. **Claude prefix** -- Any model starting with `claude-` is routed to Anthropic.
5. **Unknown model** -- Returns `provider: null` (the proxy will reject non-Claude models unless routing is configured).

### Example: Route Haiku to a Cheaper Provider

```yaml
routing:
  model-mappings:
    - from: "claude-3-haiku-20240307"
      to: "gpt-4o-mini"
      provider: "openai"
```

Claude Code requests `claude-3-haiku-20240307` but the proxy sends the request to OpenAI's `gpt-4o-mini` instead, translating the request format via `neurolink.generate()`.

### Example: Use Gemini for All Sonnet Requests

```yaml
routing:
  model-mappings:
    - from: "claude-sonnet-4-20250514"
      to: "gemini-2.5-pro"
      provider: "google-ai"
    - from: "claude-3-5-sonnet-20241022"
      to: "gemini-2.5-flash"
      provider: "google-ai"
```

### Example: Passthrough Specific Models

```yaml
routing:
  passthrough-models:
    - "claude-sonnet-4-20250514"
    - "claude-3-opus-20240229"
  model-mappings:
    - from: "claude-3-haiku-20240307"
      to: "gemini-2.5-flash"
      provider: "google-ai"
```

Here, Sonnet 4 and Opus requests go directly to Anthropic (passthrough), while Haiku requests are redirected to Gemini.

### Example: No Routing (Pure Multi-Account Pool)

Omit the `routing` section entirely. All requests pass through to Anthropic using the configured accounts with the proxy's default `fill-first` strategy:

```yaml
accounts:
  anthropic:
    - name: "account-1"
      apiKey: "${ANTHROPIC_KEY_1}"
    - name: "account-2"
      apiKey: "${ANTHROPIC_KEY_2}"
    - name: "account-3"
      apiKey: "${ANTHROPIC_KEY_3}"
```

---

## 7. Fallback Chain Examples

The fallback chain is tried in order when all primary Claude accounts are exhausted (rate-limited, errored, or cooling down). Each entry specifies a provider and model. The proxy translates the Claude-format request into the target provider's format using `neurolink.generate()` or `neurolink.stream()`.

### Example: Gemini then OpenAI

```yaml
routing:
  fallback-chain:
    - provider: "google-ai"
      model: "gemini-2.5-pro"
    - provider: "openai"
      model: "gpt-4o"
```

Request flow:

1. Try Claude accounts with the configured strategy (`fill-first` by default) plus retry/failover.
2. If all exhausted, try Google AI Studio with `gemini-2.5-pro`.
3. If that also fails, try OpenAI with `gpt-4o`.

### Example: Multiple Gemini Tiers

```yaml
routing:
  fallback-chain:
    - provider: "google-ai"
      model: "gemini-2.5-pro"
    - provider: "google-ai"
      model: "gemini-2.5-flash"
    - provider: "openai"
      model: "gpt-4o-mini"
```

Falls back through progressively cheaper models.

### Example: Vertex AI as Primary Fallback (Enterprise)

```yaml
routing:
  fallback-chain:
    - provider: "google-vertex"
      model: "gemini-2.5-pro"
    - provider: "amazon-bedrock"
      model: "anthropic.claude-3-5-sonnet-20241022-v2:0"
```

Uses enterprise-grade providers (Vertex AI, Bedrock) as fallbacks. Requires the corresponding provider credentials to be configured in environment variables.

### Example: Full Multi-Tier Setup

```yaml
version: 1

accounts:
  anthropic:
    - name: "pro-personal"
      apiKey: "${CLAUDE_PRO_KEY}"
      weight: 1
    - name: "max-team"
      apiKey: "${CLAUDE_MAX_KEY}"
      weight: 3

routing:
  strategy: "fill-first"

  passthrough-models:
    - "claude-sonnet-4-20250514"

  model-mappings:
    - from: "claude-3-haiku-20240307"
      to: "gemini-2.5-flash"
      provider: "google-ai"

  fallback-chain:
    - provider: "google-ai"
      model: "gemini-2.5-pro"
    - provider: "openai"
      model: "gpt-4o"

cloaking:
  mode: "auto"
  plugins:
    headerScrubber: true
    sessionIdentity: true
    systemPromptInjector: true
    wordObfuscator:
      enabled: true
      words:
        - "proxy"
        - "neurolink"
```

This configuration:

- Pools two Claude accounts with 1:3 weighting (Max gets 3x traffic).
- Passes Sonnet 4 requests directly to Anthropic.
- Redirects Haiku requests to Gemini Flash.
- Falls back to Gemini Pro, then GPT-4o when Claude accounts are exhausted.
- Applies cloaking to OAuth accounts (header scrubbing, session identity, system prompt injection, word obfuscation).

---

## Proxy Endpoints

For reference, the running proxy exposes these HTTP endpoints:

| Method | Path                        | Description                                                                                  |
| ------ | --------------------------- | -------------------------------------------------------------------------------------------- |
| `POST` | `/v1/messages`              | Anthropic-compatible chat completions (main endpoint).                                       |
| `GET`  | `/v1/models`                | List available models.                                                                       |
| `POST` | `/v1/messages/count_tokens` | Token counting endpoint.                                                                     |
| `GET`  | `/health`                   | Health check. Returns `{ status, strategy, uptime }`.                                        |
| `GET`  | `/status`                   | Detailed status with per-account stats, total attempts, completed requests, and error rates. |

---

## Log Rotation

Log files (`proxy-*.jsonl`, `proxy-attempts-*.jsonl`, `proxy-debug-*.jsonl`) and old body-capture directories are automatically cleaned up to prevent unbounded growth.

| Parameter        | Value            | Description                                                |
| ---------------- | ---------------- | ---------------------------------------------------------- |
| Max age          | 7 days           | Files older than 7 days are deleted                        |
| Max total size   | 500 MB           | If remaining files exceed 500 MB, oldest are deleted first |
| Cleanup triggers | Startup + hourly | Runs once at proxy start, then every 60 minutes            |

The `cleanupLogs()` function performs two passes:

1. **Age pass** -- delete all files with `mtime` older than the cutoff.
2. **Size pass** -- if remaining files exceed the size limit, delete oldest first until under the cap.

Log rotation is non-fatal. If cleanup fails, the proxy continues operating normally.

---

## Rate Limit Headers from Anthropic

The proxy captures and uses Anthropic's quota headers for per-account utilization tracking:

| Header                                       | Format          | Description                            |
| -------------------------------------------- | --------------- | -------------------------------------- |
| `anthropic-ratelimit-unified-5h-utilization` | float (0.0-1.0) | 5-hour rolling session utilization     |
| `anthropic-ratelimit-unified-5h-status`      | string          | Session status (e.g., `ok`, `warning`) |
| `anthropic-ratelimit-unified-5h-reset`       | integer (epoch) | When the 5-hour window resets          |
| `anthropic-ratelimit-unified-7d-utilization` | float (0.0-1.0) | 7-day rolling weekly utilization       |
| `anthropic-ratelimit-unified-7d-status`      | string          | Weekly status                          |
| `anthropic-ratelimit-unified-7d-reset`       | integer (epoch) | When the 7-day window resets           |
| `anthropic-ratelimit-fallback-percentage`    | float           | Fallback percentage threshold          |
| `anthropic-ratelimit-overage-status`         | string          | Overage status                         |

These headers are parsed by `parseQuotaHeaders()` in `accountQuota.ts` and cached in memory with debounced persistence to `~/.neurolink/account-quotas.json`. The `neurolink auth list` command displays per-account 5h and 7d utilization when available.

---

## Token Refresh

The proxy uses a reactive (not background) refresh strategy. There is no background timer polling for token expiry. Instead, tokens are refreshed on demand:

1. **Pre-request check** — Before each request, if the token's `expiresAt <= now + 1 hour`, the proxy refreshes it inline via `POST https://api.anthropic.com/v1/oauth/token` (fallback: `https://console.anthropic.com/v1/oauth/token`). On success, the credential file is updated atomically (write to `.tmp`, then rename).
2. **On-401 retry** — If Anthropic returns a 401 despite the pre-request check, the proxy refreshes the token and retries the request up to 5 times before failing over to the next account.
