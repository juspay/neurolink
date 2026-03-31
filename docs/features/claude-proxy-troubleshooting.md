---
title: Claude Proxy Troubleshooting
description: Practical troubleshooting guide for the NeuroLink Claude proxy, covering common errors, debugging techniques, and architecture notes
keywords: claude, proxy, troubleshooting, debugging, errors, oauth, rate-limit, streaming, passthrough
---

# Claude Proxy Troubleshooting

This guide covers every issue encountered during development and real-world usage of the NeuroLink Claude proxy. For general proxy documentation, see [Claude Proxy](/docs/features/claude-proxy).

## Common Issues

### 1. "API Error: 400 invalid_request_error: Error"

**Cause:** An OAuth token was sent without the required cloaking headers (billing header, `user_id` in metadata). This only happens when making bare `curl` requests through the proxy -- Claude Code includes its own cloaking automatically.

**Fix:** Always connect to the proxy via Claude Code, not bare HTTP clients. The proxy's cloaking pipeline is designed to complement Claude Code's own request format. If you are testing with `curl`, the proxy will still work for the `/health`, `/status`, and `/v1/models` endpoints, but `/v1/messages` requires a properly formed Claude Code request or a valid API key account.

---

### 2. "credit balance is too low"

**Cause:** The `ANTHROPIC_API_KEY` environment variable points to an account with no credits, and that key was included in the account rotation pool.

**Fix:** The proxy now only uses API keys as a fallback when no OAuth accounts exist. If you have OAuth accounts authenticated via `neurolink auth login`, remove `ANTHROPIC_API_KEY` from your environment to prevent it from being picked up:

```bash
# Check if the env var is set
echo $ANTHROPIC_API_KEY

# Remove it from your shell profile (~/.zshrc, ~/.bashrc, etc.)
# Then restart your terminal, or:
unset ANTHROPIC_API_KEY
```

Account priority order: TokenStore compound keys > legacy credentials file > `ANTHROPIC_API_KEY`. The environment variable is only used when no other accounts exist.

---

### 3. "context_management: Extra inputs are not permitted"

**Cause:** Missing beta headers in the upstream request to Anthropic, specifically `prompt-caching-scope-2026-01-05`. Without this header, Anthropic rejects fields that Claude Code includes in its requests.

**Fix:** The proxy now forwards Claude Code's exact beta headers to Anthropic. Ensure you are running the latest build:

```bash
pnpm run build:cli
```

If the error persists, verify the beta headers in debug logs:

```bash
NEUROLINK_LOG_LEVEL=debug neurolink proxy start
# Look for: [proxy] beta headers: oauth-2025-04-20, claude-code-20250219, ...
```

---

### 4. First request takes 30 seconds

**Cause:** MCP server initialization. If `~/.mcp-config.json` or the project's `.mcp.json` references external MCP servers (filesystem, github-copilot, etc.), NeuroLink tries to connect to all of them on the first request.

**Fix:** The proxy sets `NEUROLINK_SKIP_MCP=true` internally to skip MCP initialization. If you are still experiencing slow first requests:

1. Verify you are starting the proxy via `neurolink proxy start` (not running NeuroLink directly).
2. Check that the `NEUROLINK_SKIP_MCP` environment variable is not being overridden.
3. If using a custom config, ensure it does not reference MCP servers.

---

### 5. "OAuth token has expired"

**Cause:** The token expired and the auto-refresh mechanism did not trigger in time. This can happen if the proxy was stopped and restarted after a long period, or if the system clock drifted.

**Fix:** Re-authenticate:

```bash
neurolink auth login anthropic --method oauth
```

The proxy has two layers of token refresh to prevent this:

1. **Pre-request check** (1-hour buffer) -- refreshes before each request if the token expires soon.
2. **401 auto-refresh + retry** -- on a 401 response, refreshes and retries up to 5 times.

If this error occurs repeatedly, check that your system clock is accurate (`date` should match real time).

---

### 6. "accounts disabled until re-authentication"

**Cause:** All accounts have been permanently disabled because their OAuth refresh tokens are expired or invalid. This happens after 15 consecutive refresh failures on an account. The proxy persists this state to disk via `tokenStore.markDisabled()`, so it survives restarts.

**Fix:** Re-authenticate the affected accounts:

```bash
# Re-login to reset the disabled state
neurolink auth login anthropic --method oauth

# For labeled accounts
neurolink auth login anthropic --method oauth --add --label work
```

After re-authentication, the proxy detects the changed token material and automatically re-enables the account (clears `permanentlyDisabled`, resets `consecutiveRefreshFailures`).

---

### 7. Token refresh rate limited

**Cause:** Too many refresh attempts in a short period. Anthropic's OAuth server rate-limits token refresh requests.

**Fix:** Wait 30 seconds, then re-login:

```bash
# Wait, then re-authenticate
neurolink auth login anthropic --method oauth
```

If you see this error, it likely means multiple proxy instances are running or a manual refresh was triggered concurrently.

Check for duplicate instances:

```bash
neurolink proxy status
# If stale, clean up:
rm ~/.neurolink/proxy-state.json
```

---

### 8. Claude Code not connecting to proxy

**Symptoms:** Claude Code makes requests directly to `api.anthropic.com` instead of through the proxy.

**Diagnosis:**

```bash
# Check if ANTHROPIC_BASE_URL is configured
cat ~/.claude/settings.json | python3 -m json.tool
# Should include: "ANTHROPIC_BASE_URL": "http://127.0.0.1:55669"
```

**Fix:**

1. Run `neurolink proxy setup` which auto-configures `~/.claude/settings.json`.
2. Or manually add the env var to `~/.claude/settings.json`:
   ```json
   {
     "env": {
       "ANTHROPIC_BASE_URL": "http://127.0.0.1:55669"
     }
   }
   ```
3. **Restart Claude Code** after setting the env var. Claude Code reads settings on startup, not dynamically.

---

### 9. Streaming response shows as raw bytes

**Cause:** An earlier version of the Hono handler re-encoded the `ReadableStream` as a byte array instead of passing it through as a raw SSE stream.

**Fix:** This is fixed in the current version. The proxy returns a raw `Response` object for streaming requests, preserving the SSE format. If you encounter this, rebuild:

```bash
pnpm run build:cli
```

---

### 10. Tools not working / "0 chunks"

**Cause:** An earlier architecture had NeuroLink merging 68+ MCP tools with the client's tools, causing tool name conflicts and prefixing issues. Tool definitions were being modified or dropped in the merge.

**Fix:** This is fixed in the current version. The proxy uses **passthrough mode** for Claude-to-Claude requests: the raw request body is forwarded directly to Anthropic without any parsing, tool merging, or reconstruction. Tool definitions pass through exactly as Claude Code sent them.

If you are seeing tool issues:

1. Verify the proxy is in passthrough mode (check logs for `[proxy] POST /v1/messages` -- passthrough requests do not show "translation" in the log).
2. Ensure you are targeting a Claude model (passthrough is only for `claude-*` models).
3. Check that `NEUROLINK_SKIP_MCP=true` is set (prevents MCP tool injection).

---

### 11. Account not rotating on 429

**Cause:** The proxy uses **fill-first** routing by design. It keeps sending requests to one account until that account is rate-limited, then switches to the next.

**This is expected behavior.** Fill-first is optimal for Anthropic because:

- Anthropic's prompt caching is tied to the account/session. Spreading requests across accounts reduces cache hit rates.
- Fill-first maximizes the benefit of each account's rate-limit window before moving on.

On a 429, the proxy applies exponential backoff to the current account (1s, 2s, 4s, 8s, ... up to 10 minutes) and immediately tries the next non-cooling account.

To verify rotation is working:

```bash
NEUROLINK_LOG_LEVEL=debug neurolink proxy start
# Watch for:
# [proxy] <- 429 account=primary backoff-level=1 cooldown=2s
# [proxy] -> account=secondary (oauth)
```

## Debugging

### Enable debug logging

```bash
NEUROLINK_LOG_LEVEL=debug neurolink proxy start
```

This outputs detailed information for every request:

```
[proxy] POST /v1/messages -> model=claude-opus-4-6 stream tools=109
[proxy] -> account=1-Tq78E (oauth)
[proxy] <- 200 account=1-Tq78E
```

### Check request logs

The proxy writes structured JSONL logs to `~/.neurolink/logs/`:

```bash
# List log files
ls ~/.neurolink/logs/

# View today's request log (summary per request)
cat ~/.neurolink/logs/proxy-$(date +%Y-%m-%d).jsonl | python3 -m json.tool

# Pretty-print the last 5 entries
tail -5 ~/.neurolink/logs/proxy-$(date +%Y-%m-%d).jsonl | python3 -m json.tool
```

Each log entry includes: timestamp, request ID, method, path, model, account label, response status, response time (ms), token usage, and OTel correlation fields (`traceId`, `spanId`).

### Correlate logs with traces

When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, every request log entry includes `traceId` and `spanId` fields. Use these to find the corresponding trace in your observability backend (Jaeger, Grafana Tempo, OpenObserve):

```bash
# Find the traceId for a specific request
cat ~/.neurolink/logs/proxy-$(date +%Y-%m-%d).jsonl | jq 'select(.traceId) | {timestamp, model, traceId, spanId, responseStatus}'

# Search by traceId in your OTel backend
# Jaeger: http://localhost:16686/trace/<traceId>
# Grafana: Explore → Tempo → Search by traceId
```

### Check debug logs

Full request/response debug logs (complete headers and body summaries) are written to a separate file:

```bash
# View today's debug log
cat ~/.neurolink/logs/proxy-debug-$(date +%Y-%m-%d).jsonl | python3 -m json.tool

# Search for a specific request ID
grep "abc-123" ~/.neurolink/logs/proxy-debug-$(date +%Y-%m-%d).jsonl | python3 -m json.tool
```

Debug log entries include: request headers, request body summary (model, max_tokens, message count, tool count, thinking config), response status, response headers, response body (first 2000 chars on errors), and duration.

**Log rotation:** Log files are automatically cleaned up at startup and hourly. Files older than 7 days are deleted. If remaining files exceed 500 MB total, the oldest are deleted until under the limit.

### Check account status

```bash
# List all authenticated accounts
neurolink auth list

# Show proxy status (PID, uptime, strategy, accounts, cooldowns)
neurolink proxy status

# Machine-readable status
neurolink proxy status --format json

# Direct HTTP status check
curl http://127.0.0.1:55669/status
```

### Check Claude Code connection

```bash
# Verify settings.json has the proxy URL
cat ~/.claude/settings.json | python3 -m json.tool
# Expected output includes:
# "env": {
#   "ANTHROPIC_BASE_URL": "http://127.0.0.1:55669"
# }
```

### Test proxy endpoints directly

```bash
# Health check (is the proxy running?)
curl http://127.0.0.1:55669/health

# Detailed status (accounts, cooldowns, uptime)
curl http://127.0.0.1:55669/status

# List available models
curl http://127.0.0.1:55669/v1/models
```

### Verify token validity

```bash
# Check token expiry times
neurolink auth status anthropic

# Force a manual refresh
neurolink auth refresh anthropic

# Re-authenticate if refresh fails
neurolink auth login anthropic --method oauth
```

## Architecture Notes for Debugging

Understanding the proxy's architecture helps diagnose issues faster.

### Passthrough mode (Claude to Claude)

Raw body forwarding. The proxy does not parse, modify, or reconstruct the request body. Only the authentication and protocol headers are set:

- `Authorization: Bearer <oauth_token>` (for OAuth accounts)
- `x-api-key: <key>` (for API key accounts)
- Beta headers from the client request are forwarded as-is
- Cloaking headers applied only for OAuth accounts (User-Agent, Stainless SDK headers, billing block)

**When to suspect passthrough issues:** If the request works with one account but not another, the issue is likely account-specific (expired token, wrong permissions, billing).

### Translation mode (Claude to other provider)

Full request parsing and format conversion through `neurolink.stream()`. The Claude Messages API request is converted to NeuroLink's internal format, sent to the target provider (Gemini, OpenAI, etc.), and the response is serialized back to Claude SSE format.

**When to suspect translation issues:** If the error only occurs with non-Claude models or when the fallback chain activates. Check that the target provider's API key is configured and the model name is valid.

### Token lifecycle

```
Per-request check (1-hour buffer before expiry)
    |
    v
Send request to Anthropic
    |
    v
If 401 -> auto-refresh token -> retry up to 5 times
    |
    v
All retries 401 -> 5min cooldown -> next account
```

### Account selection (fill-first)

```
Request arrives
    |
    v
Find first non-cooling account (in priority order)
    |
    v
Send request
    |
    |-- 200 OK -> return response
    |-- 429 -> exponential backoff on this account -> try next account
    |-- 401 (OAuth) -> refresh token -> retry up to 5x
    |-- 401 (API key) -> 5-min cooldown -> try next account
    |-- 5xx -> no cooldown -> rotate immediately
    |
    v
All accounts exhausted -> walk fallback chain
    |
    v
All fallbacks exhausted -> return 429 with Retry-After header
```

### Exponential backoff progression

For repeated 429 errors on the same account:

| Backoff Level | Cooldown Duration |
| ------------- | ----------------- |
| 0             | 1 second          |
| 1             | 2 seconds         |
| 2             | 4 seconds         |
| 3             | 8 seconds         |
| 4             | 16 seconds        |
| 5             | 32 seconds        |
| ...           | ...               |
| Max           | 10 minutes (cap)  |

The backoff level resets to zero on a successful request.

## Quick Reference

| Symptom                         | Likely Cause                         | First Step                                      |
| ------------------------------- | ------------------------------------ | ----------------------------------------------- |
| 400 invalid_request_error       | Missing cloaking (bare curl)         | Use Claude Code, not curl                       |
| credit balance too low          | API key with no credits in pool      | Remove `ANTHROPIC_API_KEY` or add credits       |
| Extra inputs not permitted      | Missing beta headers                 | Rebuild with `pnpm run build:cli`               |
| Slow first request (30s)        | MCP server init                      | Verify `NEUROLINK_SKIP_MCP=true`                |
| Token expired                   | Auto-refresh missed                  | `neurolink auth login anthropic --method oauth` |
| Refresh rate limited            | Too many refresh attempts            | Wait 30s, then re-login                         |
| Accounts disabled until re-auth | Expired refresh tokens (15 failures) | `neurolink auth login anthropic --method oauth` |
| Claude Code bypassing proxy     | `ANTHROPIC_BASE_URL` not set         | `neurolink proxy setup`, restart Claude Code    |
| Raw bytes in stream             | Old build with Hono encoding bug     | Rebuild with `pnpm run build:cli`               |
| Tools broken / 0 chunks         | MCP tool merging (old build)         | Rebuild; verify passthrough mode in logs        |
| No account rotation             | Fill-first is working as designed    | Check debug logs for 429 + rotation             |
