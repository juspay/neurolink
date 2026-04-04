---
title: Claude Proxy Observability
description: How to read the OpenObserve dashboard for the NeuroLink Claude proxy
keywords:
  [
    claude,
    proxy,
    observability,
    openobserve,
    otel,
    telemetry,
    dashboard,
    tracing,
  ]
---

# Claude Proxy Observability

This guide explains how to read the OpenObserve dashboard used to operate the NeuroLink Claude proxy.

## Source Of Truth

- Dashboard definition: `docs/assets/dashboards/neurolink-proxy-observability-dashboard.json`
- Live dashboard title: `NeuroLink Proxy Observability`
- Default time range: `Last 30 minutes`

## First-Time Local Setup

For a fresh local setup, use the NeuroLink-owned helper in `scripts/observability/` instead of borrowing telemetry files from another repo.

If you do not already have the CLI installed, install it first:

```bash
pnpm add -g @juspay/neurolink
# or
npm install -g @juspay/neurolink
```

Then continue with the setup steps below.

1. Optional: copy `scripts/observability/proxy-observability.env.example` to `scripts/observability/proxy-observability.env` only if your local ports or credentials need to differ from the defaults.
2. Start the local OpenObserve stack and import the dashboard:

```bash
neurolink proxy telemetry setup
```

The setup command starts OpenObserve and the OTEL collector, imports the pre-built dashboard, and automatically writes `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:<port>` (default: `14318`, configurable via `NEUROLINK_OTLP_HTTP_PORT`) into `~/.neurolink/.env`. The proxy reads that file on every start, so no manual `export` is required.

The collector uses a dedicated port set (`14317`/`14318`/`14333`) to avoid collisions with other local OTEL stacks. If you overrode ports in `proxy-observability.env`, the correct endpoint is printed by the setup command and written to `~/.neurolink/.env` automatically.

1. Start the proxy:

```bash
neurolink proxy start
# or, if installed as a launchd service:
launchctl start com.neurolink.proxy
```

Data begins flowing immediately. No environment variable export needed.

> **How the env file is picked up:** The proxy auto-loads `~/.neurolink/.env` on every start (whether run manually, via `proxy install`, or as a launchd service). You can also point the proxy at a different file with `--env-file <path>` or by setting `NEUROLINK_ENV_FILE`. See the [config reference](./claude-proxy-config-reference.md#3-environment-variables) for the full resolution order.

Useful follow-up commands:

```bash
neurolink proxy telemetry start
neurolink proxy telemetry stop
neurolink proxy telemetry status
neurolink proxy telemetry logs
neurolink proxy telemetry import-dashboard
```

Repo-local shortcuts are also available:

```bash
pnpm run proxy:observability:setup
pnpm run proxy:observability:status
```

### What Is Portable vs Instance-Specific

Portable:

- The dashboard query logic
- The stream names listed below
- The proxy log and trace fields used for correlation
- The helper scripts under `scripts/observability/`

Instance-specific:

- OpenObserve URL, login, ports, container names, and volume names
- Compose project name if you intentionally want multiple local stacks in parallel
- Dashboard IDs and owners assigned by the target OpenObserve instance at import time
- The process manager used to run the proxy locally, such as `launchd` on macOS

The helper `scripts/observability/import-openobserve-dashboard.mjs` strips `dashboardId`, `owner`, and `created` from the checked-in JSON before importing it, so the repo file can be reused on a different machine without editing those fields first.

### Active OpenObserve Streams

Use these streams when validating or updating the dashboard:

- Logs: `neurolink_proxy`
- Traces: `neurolink_proxy`
- Metrics: `proxy_requests_total`, `proxy_errors_total`, `proxy_retries_total`, `proxy_request_duration_ms_sum`, `proxy_request_body_bytes_sum`, `proxy_cost_usd_total`, `proxy_tokens_cache_read`, `proxy_tokens_cache_creation`

Do not point dashboard panels at the stale log stream `neurolink_proxy_logs` unless it has been intentionally revalidated.

### Local Log Families And Query Rules

- `~/.neurolink/logs/proxy-YYYY-MM-DD.jsonl` holds final request summaries. These are the rows the dashboard is built around.
- `~/.neurolink/logs/proxy-attempts-YYYY-MM-DD.jsonl` holds per-upstream-attempt diagnostics. Use it when retries or account rotation need debugging.
- `~/.neurolink/logs/proxy-debug-YYYY-MM-DD.jsonl` is the redacted index for captured request and response bodies.
- `~/.neurolink/logs/bodies/YYYY-MM-DD/<request-id>/*.json.gz` stores the corresponding redacted body artifacts.
- In OpenObserve, body captures arrive in the same `neurolink_proxy` log stream with `event.name=proxy.body_capture`, so request panels must filter to request-summary rows, for example `http_method IS NOT NULL`.
- Attempt logs are local-only on purpose. They should help explain retries without inflating dashboard request counts.

## What This Dashboard Should Answer

Use the dashboard to answer seven operational questions:

1. Is proxy traffic flowing right now?
2. Are users seeing failures, rate limits, or overloaded responses?
3. Is latency degrading for everyone, or only for a specific model or account?
4. Is fill-first routing concentrating traffic on one account as expected?
5. Are OTEL metrics still exporting correctly, or are logs and metrics diverging?
6. Is prompt cache reuse healthy, or are we paying too much cache creation cost?
7. Which traces should you open when you need request-level debugging?

## How To Read Each Tab

### Traffic & Health

Read this tab first.

- `Requests in Range` tells you whether volume changed.
- `Failed Request Share` gives the top-line user-facing reliability signal.
- `Mean Request Latency (s)` tells you whether users are feeling slowness.
- `Overloaded Responses` helps separate provider saturation from generic failures.
- `Request Trend` and `Requests by Model` explain whether a spike or a model mix shift caused the change.

### Failures & Rate Limits

Use this tab when reliability drops.

- `429 Rate-Limit Responses` means account or upstream rate pressure.
- `Failures by HTTP Status` separates auth issues (`401` and `403`), rate limits (`429`), and transient upstream failures (`5xx`).
- `Failures by Account / Route` shows whether one account or fallback route is poisoning the pool.
- `Failure Trend` tells you whether the issue is a short burst or a sustained incident.

### Latency & Throughput

Use this tab to judge user experience and saturation.

- `P95 Request Latency (s)` is the best early warning signal for degraded UX.
- `Throughput Trend` paired with `Latency Trend` tells you whether higher traffic is driving slower responses.
- `Mean Latency by Model (s)` and `Mean Latency by Account / Route (s)` isolate whether the slowdown is model-specific or account-specific.

### Accounts & Routing

Use this tab to understand fill-first routing behavior.

- `Requests on Busiest Account / Route` should usually be high because the proxy intentionally fills one account before rotating.
- `Accounts / Routes Used` shows whether the pool is spreading traffic or mostly staying on one account.
- `Failure Share by Account / Route` tells you whether one account or fallback route should be re-authenticated, disabled, or investigated.
- `Tokens by Account / Route (k)` helps explain quota pressure and uneven load.
- When `account_name` is empty, these panels fall back to `account_type` so non-Anthropic routes do not appear as blank pseudo-accounts.

### Telemetry Cross-Check

Use this tab to validate the OTEL export path itself.

- These panels are shown as per-window OTEL deltas, not raw cumulative counter values.
- `Metric Requests in Range`, `Metric Errors in Range`, and `Metric Retries in Range` should broadly agree with the earlier log-derived charts.
- If `Metric Request Trend (5m)` is flat while `Request Trend (5m)` is moving, the metrics pipeline is broken or delayed.
- If costs or request body volume stop moving here while logs keep arriving, OTEL metrics are unhealthy even if log export still works.

### Tokens, Cache & Cost

Use this tab to understand workload mix and cache behavior.

- `Prompt Tokens (M)` is prompt-side volume in millions: uncached input plus cache writes plus cache reads.
- `Cached Prompt Tokens Reused (M)` is actual cache reuse. These tokens were read from an existing prompt cache entry.
- `Cached Prompt Tokens Written (M)` is cache population. These tokens were written into a new cache entry on that request and can be reused by later requests.
- `Cache Reuse Ratio` is reused cache tokens divided by newly written cache tokens. Values above `1` mean reuse is outpacing cache writes.
- `Mean Total Tokens per Request` is average prompt-side plus output token volume per request, shown as raw tokens.
- `Input vs Output Tokens per Request (5m)` compares average input and output tokens per request as raw tokens, which is easier to read than total prompt-side volume when cache reuse is large.
- `Cache Reuse vs Cache Write Trend (5m, M)` keeps cache movement on its own scale so cache traffic does not flatten the input/output chart.
- `Token Volume by Model (M)` tells you which model families are driving token volume.
- `Top Sessions by Token Volume (M)` helps identify unusually heavy sessions for trace drilldown.
- `Input vs Output Tokens by Account / Route` shows raw token totals by real account or fallback route, with internal final rows excluded.

### Trace Drilldown

Use this tab after you know there is a problem and need request-level evidence.

- `Slowest Operations by Mean Duration` is the best starting point for deep latency debugging.
- `Span Status Mix` tells you whether failures are surfacing in traces as well as logs.
- `Span Volume by Operation` and `Trace Volume Trend` help confirm whether the trace pipeline matches traffic volume.

## Key Correlation Fields

These fields matter most when moving between logs, metrics, and traces:

- `_timestamp`: event time in OpenObserve
- `request_id`: request-level correlation key in proxy logs
- `trace_id`: cross-signal trace correlation key
- `span_id`: specific span correlation key
- `event.name`: distinguishes request summaries from `proxy.body_capture` debug events in the shared OpenObserve log stream
- `account_name`: which account handled the request
- `ai_model`: which model served the request
- `ai_input_tokens`: prompt/input tokens
- `ai_output_tokens`: completion/output tokens
- `ai_cache_creation_tokens`: tokens spent creating cache entries
- `ai_cache_read_tokens`: tokens served from cache

When a caller injects `traceparent` plus `x-neurolink-session-id` / `x-neurolink-user-id` / `x-neurolink-conversation-id`, the proxy attaches its spans to that upstream trace and preserves session-level attribution across SDK and proxy telemetry.

`ai_cache_creation_tokens` means prompt tokens written into a new cache entry.
`ai_cache_read_tokens` means prompt tokens reused from an existing cache entry.
All latency and duration panels are shown in whole seconds for faster scanning.
Counts and token-heavy charts default to whole numbers when practical, while ratios, costs, and million/MB rollups are capped at two decimals.

## Common Interpretation Patterns

- Rising `Failed Request Share` with flat traffic usually means a real reliability regression, not just more volume.
- Rising `429 Rate-Limit Responses` with high load on one account usually means the pool is exhausting the primary account as designed.
- Log traffic moving while the telemetry tab is flat means the OTEL metrics path needs attention.
- Rising `Cache Creation Tokens` without matching `Cache Read Tokens` means prompt reuse is weak or the cache is still warming.
- A slow chart on the latency tab plus the same operation on the trace tab gives you the fastest path to a concrete trace investigation.
