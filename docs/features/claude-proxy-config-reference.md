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
| `--share-port`      |       | `number`  | `--port` + 1                     | Gate-only listener port for peer sharing (see below).             |
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

#### The share listener

`proxy start` runs a **second, gate-only listener** whenever this node has at
least one active share grant. It serves the same routes on a different port and
refuses every request that carries no valid share token; the main port keeps
serving the operator's own untokened client exactly as before.

Which port a request arrived on is decided by the accepting socket, so nothing a
client sends can move it across. That is the reason for a second port rather
than an origin check: cloudflared and every reverse proxy connect from
`127.0.0.1`, so tunnelled traffic is indistinguishable from local traffic by
address alone.

| Behaviour           | Detail                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Port                | `--share-port`, else `NEUROLINK_PROXY_SHARE_PORT`, else main port + 1                            |
| Lifecycle           | Comes up on the first active grant, closes when the last is revoked — no restart on either edge  |
| Poll interval       | 15s against the grant file                                                                       |
| Bind failure        | Logged once and retried; never fatal. Set `--share-port` to move it                              |
| Rolling replacement | The incoming worker loses the bind until the outgoing one drains, then takes it on the next poll |
| Disable             | `NEUROLINK_PROXY_SHARE_LISTENER=0`                                                               |

`neurolink proxy expose` picks this port automatically. Expose it, not the main
one.

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
  "autoUpdateEnabled": true,
  "updaterPid": 12346,
  "updaterRunning": true,
  "latestVersion": "9.88.9",
  "pendingRestartVersion": null,
  "lastUpdateFailure": null,
  "fallbackChain": [{ "provider": "google-ai", "model": "gemini-2.5-pro" }],
  "stats": {
    "totalAttempts": 42,
    "totalAttemptErrors": 5,
    "totalRequests": 31,
    "totalSuccess": 29,
    "totalErrors": 2,
    "totalRateLimits": 3,
    "totalTransientRateLimits": 2,
    "totalQuotaRateLimits": 1
  }
}
```

`totalRequests`, `totalSuccess`, and `totalErrors` are final request outcomes.
`totalAttempts`, `totalAttemptErrors`, and the rate-limit counters describe
upstream attempts, including retries that later recovered. Per-account
`requests`, `success`, and `errors` use the same final-outcome semantics;
`attemptErrors` and the rate-limit fields remain attempt-level diagnostics.

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

Internal fail-open guard process. Spawned only by a foreground `proxy start`; launchd-managed proxies leave restart ownership entirely to launchd. The guard reverts stale Claude Code settings only after its parent is confirmed dead and never restarts or signals a live proxy. A launchd installation uses a separate updater-only worker which never changes client settings.

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

Designate the proxy's primary (home) Anthropic account by email/label. Writes `routing.primary-account` to the proxy config YAML; a running proxy watching that exact file applies it automatically and tries this account first under fill-first (or uses it as the home reference under round-robin). Does **not** touch the encrypted token store and does **not** require re-OAuthing any account.

| Argument   | Type     | Required | Description                                                               |
| ---------- | -------- | -------- | ------------------------------------------------------------------------- |
| `<email>`  | `string` | **Yes**  | Email/label of the Anthropic account to make primary.                     |
| `--config` | `string` | No       | Path to the proxy config file. Default: `~/.neurolink/proxy-config.yaml`. |

If the email is not currently authenticated in the token store, the command still writes the field and prints a warning — the setting activates automatically once the account is added via `auth login --add`. For a running proxy, the command reports whether it watches the edited path, watches a different path, or predates hot-reload support.

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

Remove `routing.primary-account` (and `routing.primaryAccount`) from the proxy config. A running proxy watching that file reverts to insertion-order fallback on its next valid configuration generation.

| Argument   | Type     | Required | Description                                                               |
| ---------- | -------- | -------- | ------------------------------------------------------------------------- |
| `--config` | `string` | No       | Path to the proxy config file. Default: `~/.neurolink/proxy-config.yaml`. |

**Examples:**

```bash
neurolink auth clear-primary
```

Idempotent — clearing when no primary is configured prints `No primary account was configured.` and exits 0.

### `neurolink proxy share <action>`

Lender-side controls for peer sharing. Conceptual documentation lives in
[Proxy peer sharing](/docs/features/proxy-peer-sharing); this is the flag
reference. Actions: `create`, `provision`, `url`, `list`, `status`, `pause`,
`resume`, `revoke`, `topup`, `set`, `link`, `rotate`, `level`, `note`, `notes`,
`receipts`, `delete`.

| Argument                  | Type      | Description                                                                                                                                                            |
| ------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--peer`                  | `string`  | Borrower label, or a grant id. Required by everything but `list`, `status`, `url`, `note` and `notes` — the coin-note actions are issued against the node, not a peer. |
| `--preset`                | `string`  | `spare` (default), `spillover`, `metered`, `open`. Fills the gate set; every field stays overridable by an explicit flag.                                              |
| `--level`                 | `string`  | `live` (default) or `complete`.                                                                                                                                        |
| `--ledger`                | `string`  | `coins` or `unlimited`. Implied `coins` when `--coins` is given.                                                                                                       |
| `--coins`                 | `number`  | Starting balance for a metered grant. With `topup`, the amount to add; with `set`, the absolute balance.                                                               |
| `--refill`                | `string`  | Standing allowance, e.g. `100/week` or `50/session`. Applied at the first borrowed request after the period elapses, not on a timer.                                   |
| `--max-slice`             | `string`  | Ceiling as a percent of the **pool**: `20`, or `5h=20,7d=15`. Consumption is summed across the grant's reachable accounts and divided by their count.                  |
| `--max-slice-per-account` | `string`  | The same ceiling applied to each account independently. Opt-in; the pre-pool behaviour.                                                                                |
| `--reserve`               | `string`  | Headroom floor the borrower may never eat into: `30`, or `5h=30,7d=20`. Per-account by design.                                                                         |
| `--spillover`             | `string`  | Use-it-or-lose-it window: `12h<60` or `12h<60@25` (hours before reset, utilization below, optional slice cap).                                                         |
| `--models`                | `array`   | Tier allowlist, matched as case-insensitive substrings — `sonnet,haiku` covers every dated id in those tiers.                                                          |
| `--accounts`              | `array`   | Which of your accounts this grant may draw on, by full key or bare label. Also the denominator of `--max-slice`.                                                       |
| `--rate`                  | `string`  | Requests per minute: `20/min` or `20`.                                                                                                                                 |
| `--concurrency`           | `number`  | Simultaneous in-flight borrowed requests.                                                                                                                              |
| `--schedule`              | `string`  | Hour-of-day window in local time: `21-9` wraps midnight.                                                                                                               |
| `--expires`               | `string`  | Grant expiry: `7d`, `48h`, `90m`. A bare number means days.                                                                                                            |
| `--from-account`          | `string`  | Which account a complete share is minted from. Without it the drift audit has no baseline to reconcile against.                                                        |
| `--code`                  | `string`  | Authorization code from your browser, to finish `share provision`.                                                                                                     |
| `--offline-grace`         | `string`  | How long a complete-share borrower may run unheard-from. Default `24h`.                                                                                                |
| `--heartbeat`             | `string`  | Complete-share check-in interval. Default `15m`.                                                                                                                       |
| `--lease-ttl`             | `string`  | Lease lifetime. Default `7d`. A lease can never outlive the grant's own `--expires`.                                                                                   |
| `--public-url`            | `string`  | Address share links are minted against. Recorded once by `share url`.                                                                                                  |
| `--clear`                 | `boolean` | With `share url`: forget the recorded address.                                                                                                                         |
| `--to`                    | `string`  | With `share level`: `live` or `complete`.                                                                                                                              |
| `--note`                  | `string`  | Free-text note kept with the grant.                                                                                                                                    |
| `--ttl`                   | `string`  | With `share note`: how long a coin note stays redeemable. Default 30d.                                                                                                 |
| `--memo`                  | `string`  | With `share note`: text carried on the coin note itself.                                                                                                               |
| `--json`                  | `boolean` | Emit JSON. `share create --json` is the only way to capture a token programmatically — it is never stored.                                                             |
| `--dev`                   | `boolean` | Use the isolated dev-mode state directory.                                                                                                                             |

`share url` also takes a positional: `share url <address>` records one,
`share url get` prints the bare value (exit 1 when unset), `share url clear`
forgets it, and a bare `share url` reports the current value.

### `neurolink proxy peer <action>`

Borrower-side controls. Actions: `add`, `request`, `sync`, `receipts`, `net`,
`redeem`, `list`, `status`, `test`, `remove`, `pause`, `resume`, `set`.

| Argument           | Type      | Description                                                                                                                              |
| ------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `--name`           | `string`  | Local name for the lender. Required by everything but `list` and `sync`.                                                                 |
| `--link`           | `string`  | Share link from the lender: `neurolink://share/<host>#<token>`. The token rides in the fragment, which is never transmitted to the host. |
| `--url`            | `string`  | Lender's proxy address, when adding by hand instead of by link.                                                                          |
| `--token`          | `string`  | Share token, when adding by hand.                                                                                                        |
| `--priority`       | `number`  | Lower is tried first. Default `100`.                                                                                                     |
| `--claim`          | `boolean` | With `peer request`: collect a code the lender has authorized, and exchange it locally.                                                  |
| `--label`          | `string`  | Local account label for a provisioned credential. Default `<peer>-shared`.                                                               |
| `--note`           | `string`  | Free-text note kept with the peer.                                                                                                       |
| `--receipt-secret` | `string`  | Secret this lender signs receipts with, when adding a peer by hand instead of from a link.                                               |
| `--reciprocal`     | `string`  | With `peer net`: label of the grant you issued to the same person. Defaults to the peer's own name.                                      |
| `--coin-note`      | `string`  | With `peer redeem`: the coin note to present.                                                                                            |
| `--check`          | `boolean` | With `peer redeem`: ask the issuer about the note without spending it.                                                                   |
| `--json`           | `boolean` | Emit JSON instead of formatted text.                                                                                                     |
| `--dev`            | `boolean` | Use the isolated dev-mode state directory.                                                                                               |

### `neurolink proxy expose`

Publish this proxy over a Cloudflare tunnel, refusing to do so while the gate is
off.

| Argument  | Type      | Description                                                                                                                            |
| --------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `--port`  | `number`  | Local port to expose. No default — omit it and the gate-only share listener is picked, falling back to the running proxy's port.       |
| `--host`  | `string`  | Local host to expose. Default `127.0.0.1`.                                                                                             |
| `--named` | `string`  | Named tunnel to run instead of a quick tunnel. Quick-tunnel URLs change on restart and rot every peer entry.                           |
| `--force` | `boolean` | Publish anyway when the gate probe says the proxy answers untokened requests. Publishes your subscription to anyone who finds the URL. |

---

## 2. Config File (`~/.neurolink/proxy-config.yaml`)

The proxy loads its configuration from a YAML (or JSON) file. The default location is `~/.neurolink/proxy-config.yaml`. Override it with `--config`.

### Runtime Reload Semantics

The running proxy watches the resolved config path and proxy env path. Changes are debounced, parsed, validated, and converted into a complete immutable routing snapshot before one pointer swap publishes the next generation. Each request captures one generation, so a reload never changes model routing, fallback order, or account eligibility midway through that request.

The following values reload without restarting:

- `routing.strategy`, unless `--strategy` supplied a fixed CLI override
- model mappings, fallback chain, auto fallback, per-account admission, and passthrough models
- primary account and account allowlist
- quota routing, session soft limit, and reset tolerance
- env interpolation used by those routing fields
- `NEUROLINK_PROXY_QUOTA_ROUTING`, `NEUROLINK_PROXY_SESSION_SOFT_LIMIT`, and `NEUROLINK_PROXY_SESSION_RESET_TOLERANCE_MS` from the proxy env file

Malformed, invalid, or deleted previously observed files do not partially apply. The last-known-good generation remains active, and `/status` exposes `config.generation`, `config.lastReloadError`, and `config.consecutiveFailures`. `neurolink proxy status` presents the same information. `SIGHUP` requests an immediate reload; normal edits need no signal.

Listener address, port, passthrough mode, keep-alive dispatcher settings, telemetry initialization, and executable code remain startup concerns. Those require process replacement; editing their env values is intentionally not presented as a successful hot reload.

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

  # Quota-aware ordering controls for fill-first. Accounts with session
  # headroom are ordered by soonest weekly expiry; a session at the soft limit
  # is temporarily demoted until its 5h window resets. Environment variables
  # with matching names take precedence when present in the proxy env file.
  quota-routing: true
  session-soft-limit: 0.97
  session-reset-tolerance-ms: 900000

  # Optional bound for concurrent upstream requests per OAuth account. Omit
  # this key for unlimited admission. When set, requests try another eligible
  # account first, then queue only if all are full. Valid range is 1 through 20.
  # A value outside that range — a non-integer, 0, or 21+ — is rejected with a
  # warning and leaves admission unlimited; it is NOT clamped to the nearest
  # bound, so a typo here silently removes the cap rather than tightening it.
  # max-inflight-per-account: 2

  # Primary (home) account: under fill-first without quota routing this account
  # is tried first. With quota routing enabled it is only the final tie-break;
  # session headroom and weekly expiry determine order first. Under round-robin
  # it sets the starting offset when account membership changes. Resolved
  # per-request to a stable token-store key (anthropic:<email>); a numeric index
  # is never persisted, so reordering accounts in the token store is irrelevant.
  # When omitted the proxy falls back to insertion-order index 0.
  # Accepts: primary-account (kebab) or primaryAccount (camel).
  # Manage via:
  #   neurolink auth set-primary <email>
  #   neurolink auth get-primary
  #   neurolink auth clear-primary
  primary-account: "alice@example.com"

  # Optional hard boundary for Anthropic credential discovery. Entries may be
  # labels/emails or full anthropic:<label> keys. An empty list denies all.
  # Hidden legacy/env credentials require explicit legacy-default/env entries.
  # Accepts: account-allowlist (kebab) or accountAllowlist (camel).
  account-allowlist:
    - "alice@example.com"

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

  # Disabled by default. Set true only when it is acceptable for a request to
  # use an unspecified provider selected by the translation layer after the
  # configured fallback chain is exhausted. It is skipped when any account
  # returned a rate limit; that case still returns 429.
  auto-fallback: false

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

| Field                                                    | Type                            | Default       | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------- | ------------------------------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `strategy`                                               | `"round-robin" \| "fill-first"` | _(none)_      | No       | Account selection strategy. `round-robin` rotates across accounts. `fill-first` uses one account until exhausted.                                                                                                                                                                                                                                                                                                                    |
| `primary-account` / `primaryAccount`                     | `string`                        | _(none)_      | No       | Email/label of the Anthropic account to treat as primary (home). With quota routing enabled, primary is only the final tie-break after session headroom and weekly expiry. Resolved per-request to `anthropic:<email>`; falls back to insertion-order index 0 when absent or when the configured account isn't currently authenticated. Manage via `neurolink auth set-primary <email>`.                                             |
| `account-allowlist` / `accountAllowlist`                 | `string[]`                      | _(none)_      | No       | Allowed Anthropic account labels/keys. When present, unlisted TokenStore, legacy, and environment credentials are excluded before loading or refresh. Empty denies all; absent is unrestricted. Special fallback labels are `legacy-default` and `env`.                                                                                                                                                                              |
| `model-mappings` / `modelMappings`                       | `ModelMapping[]`                | `[]`          | No       | Array of model-to-model remapping rules.                                                                                                                                                                                                                                                                                                                                                                                             |
| `fallback-chain` / `fallbackChain`                       | `FallbackEntry[]`               | `[]`          | No       | Ordered list of alternative providers to try when primary accounts are exhausted.                                                                                                                                                                                                                                                                                                                                                    |
| `auto-fallback` / `autoFallback`                         | `boolean`                       | `false`       | No       | Allows a translation-layer-selected fallback provider after configured fallbacks fail. Keep disabled to restrict requests to explicit accounts and fallback entries.                                                                                                                                                                                                                                                                 |
| `max-inflight-per-account` / `maxInflightPerAccount`     | `integer`                       | _(unlimited)_ | No       | Optional maximum concurrent upstream requests per OAuth account, from 1 through 20. When omitted, every request is admitted immediately. When set, requests prefer an available ordered account before queueing. Any value outside the range — non-integer, `0`, or `21`+ — is discarded with a warning and admission stays **unlimited**; values are never clamped to the nearest bound.                                            |
| `passthrough-models` / `passthroughModels`               | `string[]`                      | `[]`          | No       | Model IDs that bypass routing and go directly to Anthropic.                                                                                                                                                                                                                                                                                                                                                                          |
| `quota-routing` / `quotaRouting`                         | `boolean`                       | `true`        | No       | Enables weekly-expiry-first quota ordering for fill-first with multiple accounts. Accounts at the session soft limit are temporarily demoted until their 5h window resets. The environment override takes precedence.                                                                                                                                                                                                                |
| `session-soft-limit` / `sessionSoftLimit`                | `number`                        | `0.97`        | No       | Session utilization in `(0, 1]` at which quota routing proactively demotes an account.                                                                                                                                                                                                                                                                                                                                               |
| `session-reset-tolerance-ms` / `sessionResetToleranceMs` | `integer`                       | `900000`      | No       | Positive reset-time bucket width used when session reset time breaks a weekly-expiry tie and when saturated accounts are ordered by recovery time.                                                                                                                                                                                                                                                                                   |
| `use-overage` / `useOverage`                             | `"auto" \| "always" \| "never"` | `auto`        | No       | Whether an account may keep serving on paid extra usage once its subscription window is spent. `auto` follows what Anthropic reports per account; `never` parks the account at the subscription limit so the pool never spends credits; `always` keeps serving whenever the provider permits it. Only `never` overrides the provider — nothing here enables extra usage Anthropic has disabled. Manage via `neurolink auth overage`. |

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
- `routing.account-allowlist` must be an array of non-empty strings when present.
- `routing.quota-routing` must be a boolean when present.
- `routing.auto-fallback` must be a boolean when present.
- `routing.max-inflight-per-account` must be an integer from 1 through 20 when present.
- `routing.session-soft-limit` must be a number in `(0, 1]` when present.
- `routing.session-reset-tolerance-ms` must be a positive integer when present.
- `routing.use-overage` must be `auto`, `always`, or `never` when present; any
  other value is ignored with a warning and the default `auto` applies.
- Plaintext API keys (not using `${ENV_VAR}` references) trigger a warning.

An absent default config is optional. An existing config that cannot be read or
validated fails proxy startup; it is never ignored in favor of unrestricted
routing.

---

## 3. Environment Variables

| Variable                                     | Purpose                                                                                                                                                                                                                                                                                                                | Used By                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `ANTHROPIC_API_KEY`                          | Anthropic API key. Used as a fallback credential when no OAuth accounts are found.                                                                                                                                                                                                                                     | Proxy routes, Anthropic provider                 |
| `ANTHROPIC_OAUTH_TOKEN`                      | OAuth access token for Anthropic (alternative to stored tokens).                                                                                                                                                                                                                                                       | Anthropic provider, providerConfig               |
| `CLAUDE_OAUTH_TOKEN`                         | Alias for `ANTHROPIC_OAUTH_TOKEN`. Checked as a fallback.                                                                                                                                                                                                                                                              | Anthropic provider, providerConfig               |
| `NEUROLINK_SKIP_MCP`                         | Set to `"true"` to skip MCP server initialization. Automatically set by `proxy start` (tools come from Claude Code, not local MCP servers).                                                                                                                                                                            | `NeuroLink` constructor                          |
| `NEUROLINK_LOG_LEVEL`                        | Log level for the NeuroLink logger. Values: `error`, `warn`, `info`, `debug`.                                                                                                                                                                                                                                          | Logger utility                                   |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                | OTLP HTTP endpoint for proxy telemetry export. Written automatically to `~/.neurolink/.env` by `neurolink proxy telemetry setup`. Example: `http://localhost:14318`.                                                                                                                                                   | Proxy OTEL init (`initializeProxyOpenTelemetry`) |
| `NEUROLINK_ENV_FILE`                         | Path to a `.env` file the proxy should load at startup. Overrides the default `~/.neurolink/.env` auto-load.                                                                                                                                                                                                           | `proxyEnv.ts` (`resolveProxyEnvFile`)            |
| `NEUROLINK_PROXY_AUTO_UPDATE`                | Automatic package updates for launchd installations. Enabled by default; set to `0`, `off`, or `false` to disable. Updates use the package manager owning the running install and restart only after all requests and streams are idle.                                                                                | Dedicated launchd updater worker                 |
| `NEUROLINK_PROXY_REQUIRE_GRANT`              | Gate the **main** port too, refusing any request without a valid share token — including the operator's own client. Rarely needed now that the share listener exists; keep it for binding `0.0.0.0` with nothing in front. Also redacts account identity on `/status`. Values: `1`, `true`, `on`, `yes`. Startup-only. | Peer-sharing gate (`shareGate.ts`)               |
| `NEUROLINK_PROXY_SHARE_PORT`                 | Port for the gate-only share listener. Default: main port + 1. `--share-port` wins over this.                                                                                                                                                                                                                          | Share listener (`shareListener.ts`)              |
| `NEUROLINK_PROXY_SHARE_LISTENER`             | Set to `0`, `off`, `false` or `no` to suppress the share listener entirely, whatever grants exist.                                                                                                                                                                                                                     | Share listener (`shareListener.ts`)              |
| `NEUROLINK_PROXY_QUOTA_ROUTING`              | Quota-aware fill-first ordering. Enabled by default; set to `0`, `off`, or `false` to disable. Reloads from the proxy env file at runtime.                                                                                                                                                                             | Runtime routing configuration                    |
| `NEUROLINK_PROXY_SESSION_SOFT_LIMIT`         | Session utilization threshold in `(0, 1]`; defaults to `0.97`. Reloads from the proxy env file at runtime.                                                                                                                                                                                                             | Runtime routing configuration                    |
| `NEUROLINK_PROXY_SESSION_RESET_TOLERANCE_MS` | Positive reset-time bucket width in milliseconds; defaults to `900000`. Reloads from the proxy env file at runtime.                                                                                                                                                                                                    | Runtime routing configuration                    |
| `NEUROLINK_PROXY_SESSION_SECRET`             | Optional secret used to produce stable, non-reversible lifecycle session hashes. When unset, the proxy creates a random mode-`0600` installation key in the log directory and reuses it across restarts. Changing this value intentionally starts a new correlation domain.                                            | Lifecycle metadata logger                        |
| `NEUROLINK_PACKAGE_MANAGER_PATH`             | Optional absolute path to the npm or pnpm executable used by the updater. The candidate is still rejected unless its writable global root owns the running NeuroLink installation.                                                                                                                                     | Dedicated launchd updater worker                 |
| `NEUROLINK_PACKAGE_MANAGER`                  | Optional `npm` or `pnpm` type for `NEUROLINK_PACKAGE_MANAGER_PATH`. When omitted, the updater infers the type from the executable name.                                                                                                                                                                                | Dedicated launchd updater worker                 |
| `NEUROLINK_PNPM_PATH`                        | Legacy pnpm-specific updater override. Prefer `NEUROLINK_PACKAGE_MANAGER_PATH` for new installations.                                                                                                                                                                                                                  | Dedicated launchd updater worker                 |

### Proxy Env File Resolution Order

When the proxy starts, it loads env vars from a `.env` file using this priority:

1. `--env-file <path>` CLI flag — explicit path, required to exist.
2. `NEUROLINK_ENV_FILE=<path>` environment variable — explicit path, required to exist.
3. `~/.neurolink/.env` — loaded automatically if the file exists (created by `neurolink proxy telemetry setup`).
4. Nothing — proxy starts without extra env vars; telemetry remains disabled unless env vars are already set in the shell, and the proxy emits a startup log explaining how to enable it unless output is suppressed.

The `--env-file` flag is baked into the launchd plist by `proxy install`, so the service always loads from the same file across reboots. The three runtime routing variables above and routing interpolation are reread transactionally; other env settings remain startup-only.

**Priority for Anthropic credentials** (checked in order by the proxy routes):

1. **TokenStore compound keys** -- `anthropic:<label>` entries in `~/.neurolink/tokens.json`.
2. **Legacy credentials file** -- `~/.neurolink/anthropic-credentials.json` (only if no compound keys exist).
3. **`ANTHROPIC_API_KEY` env var** -- Only if no Anthropic TokenStore entries or legacy credential are present.

`routing.account-allowlist` filters these sources before loading or refresh. Legacy and environment fallbacks are never activated merely because existing TokenStore accounts are disabled, cooling, or unavailable.

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
- **Fail-open guard** -- A foreground proxy's detached guard removes stale settings only after confirming its parent died and no replacement is healthy. launchd-managed proxies do not spawn this cleanup guard; they use a separate updater-only worker.
- **Safety** -- If the `ANTHROPIC_BASE_URL` has been changed to a different value (e.g., another proxy), the cleanup will not overwrite it.

After starting the proxy, restart Claude Code for the new settings to take effect.

---

## 5. File Locations

All NeuroLink proxy files are stored under `~/.neurolink/` (with `0o700` directory permissions).

| File                                                         | Permissions  | Description                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `~/.neurolink/tokens.json`                                   | `0o600`      | **TokenStore** -- Multi-provider OAuth token storage. Stores tokens keyed by `provider:label` (e.g., `anthropic:personal`). XOR-obfuscated by default (not plaintext).                                                                                                  |
| `~/.neurolink/anthropic-credentials.json`                    | `0o600`      | **Legacy credentials** -- Single-account OAuth tokens. Used as a fallback when no compound keys exist in `tokens.json`. Updated on token refresh (pre-request or on-401).                                                                                               |
| `~/.neurolink/proxy-config.yaml`                             | user default | **Proxy config** -- YAML/JSON configuration file. Loaded and watched by `proxy start` (default path, overridable with `--config`). Valid routing changes publish a new runtime generation.                                                                              |
| `~/.neurolink/.env`                                          | `0o600`      | **Proxy env file** — Auto-loaded and watched by the proxy. Runtime routing variables and routing interpolation reload transactionally; startup-only variables do not. Created by `neurolink proxy telemetry setup`. Override with `--env-file` or `NEUROLINK_ENV_FILE`. |
| `~/.neurolink/proxy-state.json`                              | `0o600`      | **Proxy state** -- Runtime state persisted by the running proxy (PID, listener, strategy, fallback chain, account allowlist, config path/generation/reload error, and supervisor PIDs). Used by `proxy status`, auth config commands, and the fail-open guard.          |
| `~/.neurolink/logs/proxy-YYYY-MM-DD.jsonl`                   | `0o600`      | **Request summary logs** -- One JSONL entry per completed proxied request. Includes requestId, method, path, model, status, account label, response time, token usage, and trace correlation fields.                                                                    |
| `~/.neurolink/logs/proxy-attempts-YYYY-MM-DD.jsonl`          | `0o600`      | **Attempt logs** -- One JSONL entry per upstream attempt. Useful for retry, failover, and cooldown debugging without inflating request totals.                                                                                                                          |
| `~/.neurolink/logs/proxy-debug-YYYY-MM-DD.jsonl`             | `0o600`      | **Debug index logs** -- Redacted body-capture index rows with phase, headers, status, duration, and the stored body artifact path.                                                                                                                                      |
| `~/.neurolink/logs/bodies/YYYY-MM-DD/<request-id>/*.json.gz` | `0o600`      | **Body artifacts** -- Compressed redacted request and response bodies captured for debugging.                                                                                                                                                                           |
| `~/.neurolink/account-quotas.json`                           | `0o600`      | **Account quotas** -- Cached quota/utilization data from Anthropic's `unified-5h` and `unified-7d` rate-limit headers. Flushed to disk every 5 seconds.                                                                                                                 |
| `~/.neurolink/account-cooldowns.json`                        | `0o600`      | **Account cooldowns** -- Extend-only rate-limit and transient-auth recovery timestamps. Persisted atomically so a proxy restart cannot immediately retry a known-exhausted account.                                                                                     |
| `~/.claude/settings.json`                                    | user default | **Claude Code settings** -- Auto-configured with `ANTHROPIC_BASE_URL` and `ENABLE_TOOL_SEARCH` when the proxy starts. Cleaned up on shutdown.                                                                                                                           |

### Peer-sharing state

Written only once this node lends or borrows capacity — see
[Proxy peer sharing](/docs/features/proxy-peer-sharing). All follow the same
`0o600` + atomic-rename discipline as the files above. In `--dev` mode they
resolve under `<cwd>/.neurolink-dev/` instead.

| File                                         | Owner    | Description                                                                                                                                                                                                                                                                                  |
| -------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `~/.neurolink/proxy-grants.json`             | lender   | **Share grants** -- One record per borrower: hashed token (`sha256(salt + secret)`; the token itself is never stored), level, state, entitlement and the full gate set. Also holds this node's recorded `publicUrl`. Re-read when its mtime moves, so `share pause` lands without a restart. |
| `~/.neurolink/proxy-share-ledger.json`       | lender   | **Coin ledger and window buckets** -- Settled coin spend and request counts per `grantId\|accountKey`, plus how much of each 5h/7d window a grant has taken, keyed by that window's reset timestamp so a rollover starts fresh. In-flight holds are memory-only.                             |
| `~/.neurolink/proxy-share-audit.json`        | lender   | **Drift audit** -- Last utilization observation per complete-mode grant, the consecutive-drift streak and the auto-pause marker. Cleared by `share resume`; deleted with the grant.                                                                                                          |
| `~/.neurolink/proxy-share-provisioning.json` | lender   | **Split-PKCE requests** -- A borrower's outstanding code challenge, its 15-minute expiry, and (between authorization and the single claim that consumes it) the authorization code. Never a verifier, never a token.                                                                         |
| `~/.neurolink/proxy-peers.json`              | borrower | **Peers** -- Lender name, URL, share token, priority, per-reason cooldown, last observed grant status, and any outstanding provisioning verifier.                                                                                                                                            |
| `~/.neurolink/proxy-resident-grants.json`    | borrower | **Resident grants** -- The signed lease governing each credential a lender provisioned here, its lease secret, last heartbeat and unreported spend.                                                                                                                                          |
| `~/.neurolink/proxy-share-receipts.json`     | lender   | **Receipts** -- The last 500 signed settlement statements per grant, each carrying the usage its charge was computed from, plus the cumulative coins forgiven by reciprocal netting.                                                                                                         |
| `~/.neurolink/proxy-share-notes.json`        | issuer   | **Coin notes** -- Every transferable note this node minted, and which have been redeemed, by which grant and when. The spent-set is the replay protection.                                                                                                                                   |

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

| Method | Path                        | Description                                                                                                                                                                                    |
| ------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/v1/messages`              | Anthropic-compatible chat completions (main endpoint).                                                                                                                                         |
| `GET`  | `/v1/models`                | List available models.                                                                                                                                                                         |
| `POST` | `/v1/messages/count_tokens` | Token counting endpoint.                                                                                                                                                                       |
| `GET`  | `/health`                   | Health check. Returns `{ status, strategy, uptime }`.                                                                                                                                          |
| `GET`  | `/status`                   | Detailed status with per-account stats, total attempts, completed requests, and error rates. On a gated proxy, account identity is released only to a caller holding the update-control token. |
| `GET`  | `/limits`                   | Fresh per-account limits from Anthropic's usage API. `?account=<label>` for one, `?snapshot=true` for stored state. Operator-only: refused for borrowed traffic.                               |
| `GET`  | `/peer/handshake`           | Peer protocol version, capabilities and grant state. Authenticated by share token; touches no account.                                                                                         |
| `GET`  | `/peer/limits`              | What the calling grant may still do: remaining coins, slice left, whether anything can serve it. Carries no account identity.                                                                  |
| `POST` | `/peer/provision`           | Lodge a split-PKCE code challenge (complete shares).                                                                                                                                           |
| `GET`  | `/peer/provision`           | Collect the authorization code the lender produced. Single-use.                                                                                                                                |
| `POST` | `/peer/heartbeat`           | Complete-share check-in: report spend, receive a refreshed lease or a stop. Authenticated by the grant's lease secret.                                                                         |
| `GET`  | `/peer/receipts`            | Signed statements of what this grant was charged. `?since=<sequence>` for the ones not yet collected.                                                                                          |
| `POST` | `/peer/net`                 | Settle one round of reciprocal netting. The claim is signed with the grant's receipt secret.                                                                                                   |
| `POST` | `/peer/note`                | Check a transferable coin note, or redeem it into this grant's balance. A check needs only the note; redeeming needs a grant to credit.                                                        |

The `/peer/*` routes sit outside the request gate: they consume no capacity, and
running them through it would spend the grant's rate allowance on calls that
exist to ask whether spending is possible. Each authenticates itself.

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

The proxy coordinates background, pre-request, and on-401 refresh paths:

1. **Background check** — One non-overlapping cycle runs every 30 seconds and considers only allowed, enabled accounts within 5 minutes of expiry.
2. **Pre-request check** — Before each request, if `expiresAt <= now + 5 minutes`, refresh inline via `POST https://api.anthropic.com/v1/oauth/token` (fallback: `https://console.anthropic.com/v1/oauth/token`).
3. **On-401 retry** — If Anthropic returns a 401, refresh and retry within the bounded account retry budget before rotating.

Concurrent callers sharing a rotating refresh token reuse one in-flight result. `400`, `401`, `403`, and `404` refresh responses are credential rejections and disable the account until explicit login. Network failures, refresh `429`s, and `5xx` responses are transient and receive a bounded auth cooldown. Automatic token persistence preserves manual disable metadata.
