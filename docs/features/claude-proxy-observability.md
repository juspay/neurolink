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

### OTel Queries And Coverage

Use the same OTel pipeline for application logs, request/attempt metadata,
redacted bodies, lifecycle evidence and traces. Set `NEUROLINK_PROXY_LOG_SINK=otel`
to disable proxy application disk logging. See [OTel logging](../proxy-otel-logging.md)
for limits, native backend discovery, correlation and the maintained coverage matrix.

```bash
neurolink proxy telemetry doctor --format json
neurolink proxy telemetry query --since 2026-09-15T00:00:00Z --kind request_final
neurolink proxy telemetry query --since 2026-09-15T00:00:00Z --kind attempt
```

These commands read stored OTLP telemetry using OpenObserve's search API. OTLP
itself is an export protocol, not a query language. The doctor also reads runtime
and collector diagnostics, makes no model calls and returns nonzero for missing,
stale, partial or corrupt evidence. A green report covers its requested interval
and explicitly bounded samples; it is not a guarantee of universal delivery.
`telemetry logs` remains the Compose service-output command, while `telemetry query`
reads application telemetry and also works with the native stack.

### Historical File Families And Query Rules

The paths below apply to file mode and old archives; they are not the source for
new OTel-only traffic.

- `~/.neurolink/logs/proxy-YYYY-MM-DD.jsonl` holds final request summaries. These are the rows the dashboard is built around.
- `~/.neurolink/logs/proxy-attempts-YYYY-MM-DD.jsonl` holds per-upstream-attempt diagnostics. Rate-limited attempts include `retryable`, `rateLimitKind`, and `cooldownReason` so transient admission throttles are distinguishable from exhausted quota windows. Use this file when retries or account rotation need debugging.
- `~/.neurolink/logs/proxy-debug-YYYY-MM-DD.jsonl` is the redacted index for captured request and response bodies.
- `~/.neurolink/logs/bodies/YYYY-MM-DD/<request-id>/*.json.gz` stores the corresponding redacted body artifacts.
- In OpenObserve, body captures arrive in the same `neurolink_proxy` log stream with `event.name=proxy.body_capture`, so request panels must filter to request-summary rows, for example `http_method IS NOT NULL`.
- In OTel-only mode attempts use `proxy.record_kind=attempt`; final request counts
  must filter `proxy.record_kind=request_final`. Lifecycle, body and delivery
  diagnostics must not inflate those counts. File-mode attempt archives remain
  available for offline reconstruction.

### Deterministic Request Reconstruction

When body capture is enabled, export one request and its upstream attempts without contacting the proxy or provider:

```bash
neurolink proxy replay export \
  --request-id <request-id> \
  --output replay.json
```

Use `--attempt <number>` to select a specific upstream attempt and `--logs-dir <path>` for a non-default log directory. The command verifies that every compressed artifact remains inside the managed body directory and matches the SHA-256 value in its debug index. The generated bundle is deterministic, redacted, written with `0o600` permissions, and reports missing phases, missing artifacts, and truncation instead of presenting partial evidence as complete.

Credentials are never included in a replay bundle. To perform a direct comparison, inject each redacted header from a named environment variable and explicitly permit network execution:

```bash
export ANTHROPIC_AUTHORIZATION='Bearer ...'
neurolink proxy replay compare \
  --bundle replay.json \
  --output comparison.json \
  --execute \
  --header-env authorization=ANTHROPIC_AUTHORIZATION
```

The direct response is bounded and redacted using the same rules as proxy body logging. The comparison records status, content type, body hash, JSON shape, time to headers, and total duration. Redirects are not followed. HTTPS is required except for loopback fixture testing. A truncated or body-redacted request requires a complete `--body-file` override before execution.

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

## Request telemetry and evidence quality

Use `neurolink proxy analyze --since 1h --format json` to reconcile retained
request, attempt, lifecycle, and capture-index records. Read `dataQuality` before
interpreting success rates or latency. The analyzer does not require captured
prompt or response bodies.

A client request has one generated `requestId`. Internal Codex fallback attempts
retain their own ID plus `parentRequestId`, model, account, and `reasoningEffort`.
The final Claude record retains the configured `fallbackPlan`; attempt records
show which entries were actually tried. This evidence survives body retention.

### Completion and timing

| Field                                             | What it establishes                                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `responseStatus` on a lifecycle terminal          | HTTP status committed by the adapter; a stream can still fail after HTTP 200                                          |
| `finalStatus`, `terminalOutcome`, `outcomeSource` | Route outcome, joined before terminal publication; `unknown` means final evidence was unavailable                     |
| `transportOutcome`                                | EOF, bodyless response, read error, or cancellation observed by the response adapter                                  |
| `telemetryStatus`                                 | Whether terminal bookkeeping completed, timed out, failed, or lacked a final record; separate from the provider error |
| `latencyMs.firstChunk`                            | First body chunk, including SSE control events                                                                        |
| `latencyMs.firstUsefulOutput`                     | First nonempty text or tool-argument delta parsed at the proxy; excludes thinking and control events                  |
| `latencyMs.terminal`                              | Adapter terminal time, captured before waiting for bookkeeping or log writes                                          |

Anthropic streams require `message_stop`; native Codex streams require
`response.completed`. In-band error events, incomplete responses, and EOF without
the expected completion event are failures even if HTTP 200 was already sent.
An unterminated SSE event is not dispatched completion evidence. Native Codex
cancellation after the adapter observed the chunk containing a completion event
counts as completed; a close before completion remains a cancellation. Provider
error codes are retained in metadata, and a failed stream enriches its original
attempt instead of inventing a new upstream call.

Timing and byte counts describe observation at the proxy, not proof that the
remote client received or consumed every byte. Useful-output timestamps use the
worker's wall clock; lifecycle elapsed times use a monotonic clock. Requests with
no useful output do not contribute a zero-latency sample.

### Storage health

`GET /status` exposes `observability.lifecycle` and `observability.requestLogs`.
The latter has independent `requests`, `attempts`, and `debug` sinks. For each
metadata sink:

```text
attempted = written + pending + inFlight + dropped + unconfirmedWrites
```

`written` means the append promise completed. `pending` means queued;
`inFlight` means an append still owns its destination. The per-sink queue admits
up to 4,096 queued or active records; further records increment `dropped`.
`writeTimeouts` diagnoses slow appends and overlaps these states. A timeout never
replays an append or forgets the underlying operation. Metadata writes are
serialized per file within each worker.

Lifecycle appends retry only destination-open failures that cannot have written
any bytes. Other failed appends increment `unconfirmedWrites`: they may have
written a prefix and are never replayed. Queue drops and definite exhausted
write failures are exposed separately. A bounded shutdown flush may fail while
writes remain pending; a successful flush alone does not prove that every record
was written. Check drop and uncertainty counters too.

When lifecycle logging is enabled, the HTTP adapter confirms the admission
append before dispatching upstream. It waits for that record, not for all later
traffic, with a two-second deadline. Failure returns HTTP 503 with local error
code `PROXY_TELEMETRY_UNAVAILABLE`; it does not send an unrecorded provider request.
A timed-out append can still complete later and is never replayed. Explicitly
disabling logging disables this barrier. Confirmed appends survive serving-process
death, but these files have no per-record `fsync` or transaction across log files.
Power loss, retention, disk failure, and unconfirmed terminal tails remain
possible. Counters
are worker-local and reset on restart. They do not prove delivery to an OTEL
collector or OpenObserve. Exporter/backend health must be checked separately.

### Reconciliation limits

The analyzer deduplicates lifecycle `(processInstanceId, sequence)` identities
before aggregating outcomes and latency. Conflicting duplicate payloads remain
visible in `conflictingLifecycleDuplicates`, and affected requests are excluded
from lifecycle latency samples. Repeated `(requestId, attempt)`
records are merged, preserving failure evidence. Legacy `:codex-fallback` IDs are
joined to their parents.

`finalOutcomeConflicts` counts lifecycle/final disagreements. Final request
failures override an old lifecycle success; a lifecycle success with no final
record becomes `unknown`. `acceptedWithoutFinal` and `terminalWithoutFinal`
report missing evidence, which can include active requests, interrupted workers,
retention, or storage loss. They are not automatically provider failures.

Token counting (`POST /v1/messages/count_tokens`) and model discovery
(`GET /v1/models`, `GET /backend-api/codex/models`) have HTTP terminal outcomes
without model final records. The analyzer identifies these as
`lifecycle.auxiliaryRequests` and excludes them from missing-final counts. Their
transport errors and unsuccessful HTTP statuses remain failures. They do not
contribute model successes to `requests.success`.

The time filter admits events in the selected window and follows already
accepted requests through later retained lifecycle, attempt, and final records.
Consequently, a request started near the window boundary can finish after
`--until`. The observed ranges show that retained follow-up. Sequence gaps only
measure gaps across the selected sequence span for each worker, including
intervening retained events belonging to requests outside the time window.
Excluding those requests from the outcome cohort does not create a sequence gap.
The audit cannot identify missing
prefixes, suffixes, or an entire missing worker. Stream `completeWindow` fields
indicate temporal coverage, not proof of lossless collection. Historical final
records without protocol evidence retain their reported outcome; this analysis
cannot retrospectively certify completion or reconstruct discarded error causes.

### Worker incidents and host pressure

The launchd supervisor writes `proxy-supervisor-YYYY-MM-DD.jsonl` independently
of serving workers. The bounded recent-event ring is a status summary; the journal
retains activation, failures, rejected connections, and actual worker exits past
that ring. Exit records include the worker process-instance ID learned at readiness,
PID, generation, version, exit code and signal. Supervisor actions are recorded
separately from observed exits. Startup permits up to 120 seconds for a candidate;
an existing worker keeps serving while its replacement starts.

`lifecycle.unconfirmedAtWorkerExit` joins durable admissions without transport
terminals to actual worker exits by process-instance ID. This establishes missing
completion evidence at exit, not proof that the provider failed or that the client
received nothing. A final provider record alone cannot prove client delivery.
Older workers that do not report an instance ID remain unclassified.

Every ten seconds, enabled journals record `runtime_sample`: actual sample duration,
process CPU as a percentage of one core, RSS, heap, event-loop delay p99/max, host
one-minute load average, and available CPU parallelism. Delayed sampling includes
the extended interval. `proxy analyze` reports maxima in `runtime`; host load is
never interpreted as a request count or a provider rate limit. Compare these
samples with admission, first-output and attempt timings in the same interval.

Socket offer and commit each get their own deadline. An offer timeout cancels an
uncommitted connection. A commit timeout closes only that connection, whose dispatch
is uncertain, and requests a replacement before draining existing streams. Neither
path kills a serving worker because one handoff failed, and neither replays the
socket. Replacements remain bounded by the existing candidate/draining limits and
one-minute stall cooldown. Actual worker exits use the normal recovery backoff.

### Bounded body capture

Bulk body serialization, redaction, hashing, compression and artifact writes run
in a separate worker thread. The queue admits at most 64 captures and 32 MiB of
estimated clone data with a 20-second deadline. OTel-only mode permits one entry
to use the 32 MiB pool; file mode retains a 16 MiB per-entry ceiling. The estimate
accounts for UTF-16 strings and object traversal without serializing on the
serving thread. Oversized or unsupported values are explicitly rejected.
Redacted bodies retain an 8 MiB OTel-only cap or a 1 MiB file cap. Stream captures
retain at most 1 MiB per observer within a separate 16 MiB aggregate byte pool;
indexes flag truncated prefixes. Borrowed traffic excludes body capture. See
[OTel logging](../proxy-otel-logging.md) for delivery and supervisor verification.

`observability.requestLogs.bodyCapture` reconciles:

```text
attempted = completed + failed + rejected + pending
```

Debug indexes include `bodyWriteFailed`, `captureError`, `captureQueueWaitMs`, and
`captureProcessingMs`. Queue rejection and worker errors never fall back to bulk
serialization on the serving thread. A worker crash can leave an orphan artifact;
it does not turn a missing index into a successful capture. Regular retention
cleans both indexed and orphan artifacts.

OTLP body chunks remain compatible with existing dashboards. Chunk construction
uses byte slices, emission yields between groups, and exporter batches are limited
to 64 records (approximately 1 MiB of body text). OTLP remains a separate,
best-effort export; local append counters do not certify backend delivery.

Native Codex final errors retain the final attempt's transport code and account.
Only explicit pre-connect transport failures may rotate automatically. EPIPE,
socket resets and generic timeouts can occur after POST dispatch, so they are
terminal instead of silently replaying potentially executed work.

Request-log shutdown uses a 30-second flush budget, covering the body worker's
20-second deadline plus index and export publication. Storage failures can still
leave explicitly unconfirmed writes after that deadline. Existing log directories
are hardened to mode `0700` before lifecycle recording is enabled; failure keeps
admission required and rejects dispatch with `PROXY_TELEMETRY_UNAVAILABLE`.
Current-day supervisor journals are protected by the same retention rule as other
active metadata logs. Sensitive JSON keys are redacted at every nesting level
regardless of whether their values are strings, numbers, arrays, or objects.
