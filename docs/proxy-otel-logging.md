# Proxy logging through OpenTelemetry

The default remains file logging plus the existing OTLP request/body export.
To use only OTLP for proxy application logs, set these variables in the proxy
environment file before starting the service:

```dotenv
NEUROLINK_PROXY_LOG_SINK=otel
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:14318
```

`OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` can override the complete logs URL, including
`/v1/logs`. Remote collectors require HTTPS; HTTP is limited to loopback.
A missing or invalid endpoint fails initialization; it does not
silently switch back to disk. Verify the collector and its backend before
switching the service. Changing a running supervisor's sink requires replacing
the supervisor. A worker-only reload cannot change the old supervisor's sink.

In this mode:

- Request finals retain their dashboard attributes and complete structured
  metadata in the log body. `proxy.record_kind=request_final` identifies them.
- Attempts, lifecycle/runtime/supervisor events, stream errors and body indexes
  have distinct record kinds and do not carry final-request success fields.
- Redacted body processing remains in the bounded body worker. It skips gzip,
  artifact writes and the debug index file, and exports redacted chunks directly.
- Request admission submits lifecycle evidence asynchronously. Collector latency,
  queue overflow and outages do not cause telemetry admission HTTP 503s.
- Proxy application console diagnostics go to OTel. Updater/guard file descriptors
  and the file retention scanner are disabled. A launchd installation created in
  this mode uses `/dev/null` for stdout/stderr. Existing installations need their
  plist updated as part of the supervised cutover. Ambient OTel sink, endpoint
  and exporter header settings are retained in a private launchd plist.
- Existing historical logs are preserved. Credentials, quota, accounting and
  supervisor state are operational persistence and continue to be stored.

Metadata has a 2,048-record queue; redacted body chunks have an independent
256-record queue. Bodies use chunks capped at 128 KiB. Outstanding counts
include exports in flight. Publication owns up
to 64 captures / 32 MiB of redacted payloads concurrently. Captures share export
batches of at most 64 records, wait for queue capacity, and settle their own
chunks from exporter callbacks. Metadata has its own queue and transport.
Transport timeouts are 30 seconds, with a 31-second callback guard. Capture
publication has a 20-second deadline covering capacity waits and export
settlement. A deadline or failed export produces an explicit unconfirmed or
partial result; submitted chunks retain ownership until their callbacks settle.
These bounds still permit rejected captures during a prolonged outage. They are
payload/queue limits, not total process RSS limits: objects, serialization
buffers and the capture worker add overhead.

OTel-only body capture submission returns without waiting for the collector,
even when an HTTP handler awaits the logging function. Shutdown calls
`flushRequestLogs()` before flushing/shutting down the OTel provider so already
submitted processing and publication keep their ownership until settled.

Each `body_capture_index` includes a unique `captureId`, a SHA-256 digest of the
captured redacted text, and `bodyDelivery`. Chunks carry the same identity as
`body.capture_id`; reconstruct by capture ID and chunk index, then verify the
count and digest. The index is emitted after publication settles:

- `transport_acknowledged`: all prepared chunks received validated OTLP JSON
  acknowledgments reporting no rejected records; this does not prove backend
  persistence or independently verified per-record acceptance.
- `reference`: identical redacted bytes for this request already received a
  transport acknowledgment. `bodyReference` identifies that exported capture,
  digest, byte count and export time. Reconstruct its chunks and verify the
  current index's digest and byte count; references never form chains. A
  reference alone does not prove the source is retained in backend storage.
- `export_unconfirmed`: all chunks were submitted, but at least one export was
  not acknowledged. Some or all may still be stored in the backend.
- `partial`: publication stopped after only part of the capture was submitted,
  or a chunk was dropped. Inspect `expectedChunks`, `acknowledgedChunks`,
  `unconfirmedChunks`, `droppedChunks` and `notSubmittedChunks` separately.
- `rejected`: the publication queue or deadline rejected the capture. No
  partial body is deliberately enqueued to make room.
- `capture_rejected`: the body worker's admission guard rejected processing;
  the index includes `captureError`. `captureAdmission` identifies the limiting
  resource (`entry`, `captures`, `bytes`, or `worker`) and the admission-time
  pending count/bytes and configured limits. `no_body` means no body was present.

The worker admits up to 64 pending captures within a 32 MiB aggregate pool.
OTel-only mode permits a single entry to use that pool; file mode retains its
16 MiB per-entry estimate. `captureAdmission.maxEntryBytes` reports the active
entry limit, including rejected inputs. Its estimate accounts for UTF-16 strings without
serializing on the serving thread. Admission reasons distinguish
`body_capture_entry_too_large`, `body_capture_unsupported_value`,
`body_capture_traversal_limit`, `body_capture_queue_full` and
`body_worker_backoff`; `/status` includes counts by reason. A processing
`completed` count alone is not evidence of transport delivery.

OTel-only redacted text is capped at **8 MiB per capture**; the default file mode
keeps its existing **1 MiB** ceiling. Indexes expose `bodyCaptureLimitBytes`,
`originalRedactedBodyBytes` and `bodyTruncated`. Larger or structurally excessive
inputs remain bounded and explicitly rejected or truncated. This is a logging
policy and does not truncate the request sent to the model. Borrowed traffic
still excludes body capture and emits a metadata-only `policy_excluded` index
with reason `borrowed_traffic`; it does not expose the borrowed body.

OTel-only mode deduplicates identical redacted payloads within one request,
including concurrent client/upstream phases. Every phase keeps its own capture
index, headers, identity and truncation/redaction metadata. Transformed payloads
with different digests and payloads from different requests are exported
independently. Partial or unconfirmed exports never become reference sources;
a waiting duplicate attempts its own export instead. The metadata-only cache
holds at most 1,024 references for five minutes and retains no body strings.
Set `NEUROLINK_PROXY_BODY_DEDUPLICATION=false` to disable this optimization.
File logging/replay retain their existing independent artifacts.

`NEUROLINK_PROXY_BODY_BYTES_PER_MINUTE` optionally limits unique redacted body
bytes submitted to OTel using a token bucket with a one-minute burst capacity.
Unset means no additional byte-rate policy. A positive safe integer enables
the budget; invalid configured values explicitly exclude bodies instead of
silently disabling the policy. Each omission retains a phase index with
`bodyDelivery.status=policy_excluded` and reason `body_byte_budget_exhausted`
or `body_byte_budget_invalid`. Metadata and inference payloads are unaffected.
The budget counts attempted unique payload bytes even if export later fails;
transport retry and protocol overhead are outside this payload budget.
`/status` request logging includes `bodyCapturePolicy` counters for submitted,
deduplicated and omitted bytes/captures and the current reference/budget bounds.
Doctor treats configured omissions as incomplete retained content, resolves
references for sampled body verification, and cannot report backend completeness
from transport acknowledgments alone. Backend retention remains a separate
operator policy; expiring the source also makes its references unreconstructable.

`/status.observability.process` reports the worker's actual lifecycle sink,
OTel initialization and stdout/stderr descriptor types. The `supervisor` field
queries the current supervisor through its authenticated private control socket;
missing support in an older supervisor is explicitly unavailable. Doctor checks
both processes. A worker-only restart refuses an incomplete supervisor logging
cutover; replacing a worker cannot close the supervisor's inherited log files.
The selected sink and per-process export counters remain under request logging
observability. `submitted` means admitted to the memory queue;
`transportAcknowledged` means the response-aware transport validated the OTLP
JSON acknowledgment with no reported rejected records. It does not prove
individual record acceptance or backend persistence. `exportUnconfirmed`
means an export failed or could not be confirmed; it may have reached the
collector before a connection failed. `dropped` counts local queue overflow.
Reconcile these with collector counters and queries for correlated request IDs
in the backend. Do not claim exactly-once or lossless delivery from HTTP success.

Native runtime output emitted outside application console methods is discarded
by `/dev/null`; the supervisor still records worker exits. The shipped collector
uses a disk-backed 4,096-entry sending queue and unbounded retry with a 30-second
maximum backoff. Its `file_storage` directory must be on persistent storage. The
local OpenObserve stack defaults to 30 days of retention through
`NEUROLINK_OPENOBSERVE_RETENTION_DAYS`; size the volume for the actual capture
rate. A collector/backend can still lose telemetry after storage exhaustion or
corruption; this mode removes proxy log files, not backend storage.

The local `proxy analyze`, `proxy replay` and file-based account ledger commands
read historical files. They do not query the collector and cannot describe new
OTel-only traffic. Use the telemetry backend for that interval.

## Querying historical metadata within a small backend memory budget

Configure `NEUROLINK_OPENOBSERVE_URL`, `NEUROLINK_OPENOBSERVE_ORG`,
`NEUROLINK_PROXY_STREAM_HEADER` (the actual log stream), and either
`NEUROLINK_OPENOBSERVE_BASIC_AUTH` or the user/password environment variables.
Keep credentials in the environment rather than command-line arguments.

```sh
neurolink proxy telemetry query \
  --since 2026-09-13T12:32:00Z --until 2026-09-13T18:52:00Z \
  --kind body_capture_index > body-capture-history.json
```

This queries metadata, not bulk body chunks, in ten-minute windows and
200-record pages. Equal-time records have deterministic secondary ordering.
Windows returning partial results are discarded and retried in smaller
intervals; persistent partial results fail the command. The default 10,000-row
bound, configurable with `--max-rows` up to 100,000, and a 512-query budget fail
explicitly instead of silently truncating the answer. A successful result
describes query completeness for the specified interval, not whether the proxy
instrumented or delivered every possible event. Include the returned query
ledger when reporting evidence.

## Built-in telemetry verification

```sh
neurolink proxy telemetry doctor --format json
neurolink proxy telemetry doctor --since 2026-09-15T00:00:00Z --until 2026-09-15T01:00:00Z
neurolink proxy telemetry query --since 2026-09-15T00:00:00Z --kind telemetry_delivery
```

OTLP is the standard for exporting logs, traces and metrics; it has no historical
query API. These read-only commands query **stored OTLP data through OpenObserve's
search API**, and inspect the proxy/collector diagnostics endpoints. They do not
start Docker, restart services, generate model traffic or scan application files.
The existing script entry points call the same implementation. New OTel-only
traffic must be read through these commands or the backend; archived file-based
analyze/replay commands retain their offline meaning.

Backend settings come from the OpenObserve environment variables above, or from
`~/.neurolink/telemetry-native/config/collector.yaml` when an explicit backend URL
is absent. Override the config path with `NEUROLINK_OTEL_COLLECTOR_CONFIG`.
Credentials stay internal and redirects are rejected. Use
`NEUROLINK_OTEL_COLLECTOR_METRICS_URL` to select the loopback collector metrics
endpoint; native discovery defaults to `http://127.0.0.1:14388/metrics`.
`--proxy-url` or `NEUROLINK_PROXY_URL` selects the proxy diagnostics endpoint.

The doctor defaults to the last fifteen minutes ending thirty seconds ago to
allow export/ingestion to settle. It verifies:

- Runtime readiness and actual worker/supervisor OTel-only logging, including
  inherited stdout/stderr file descriptors.
- Producer delivery diagnostics and capture admission failures for the selected
  interval. Worker-lifetime counters remain in evidence with an explicit scope,
  but an older incident does not make every later interval warn.
- Stored logs, traces and request metrics with a latest timestamp no more than
  120 seconds behind the **selected window end**. Historical windows therefore
  measure historical freshness, not current service health.
- Unique final IDs, trace/duration/outcome fields and explained first-output
  timing, grouped by model. `not_observed` cannot pass timing coverage.
- Stored terminal-event/final reconciliation. In-flight admissions and requests
  spanning the query boundaries are not assumed to have failed.
- Client-response capture phase coverage for Claude and direct Codex finals.
  Capture queries include a two-minute settling margin; delivery checks retain
  the requested interval. Missing route evidence cannot pass phase coverage.
- Capture rejection/truncation/policy status for every queried index, plus count,
  contiguous chunk indexes, UTF-8 bytes and SHA-256 for up to three largest
  acknowledged captures (8 MiB per sample). This is explicitly a sample check.
- Up to three stored trace correlations, and collector failure/queue counters.
  Collector counters are cumulative; a historical failure is not a count of
  proven missing records in the selected interval.

All queries share a 512-request budget; history has a configurable 10,000-record
limit per kind (maximum 100,000). Invalid ranges, partial backend results and
exceeded bounds fail explicitly. Missing data, idle traffic, absent collector
series, old versions without required fields and unavailable measurements cannot
produce a green report. `pass` exits zero; `fail` or `incomplete` exits nonzero.
A successful report proves these checks over the selected records and samples;
it cannot prove an event that disappeared before any observable admission.

## Correlation and output timing

The shared HTTP tracker creates a W3C-parented OTel SERVER span for `/v1/*`,
`/v1beta/*` and `/backend-api/*`. Health, status and administrative polling are
excluded to avoid recursive diagnostic traffic. Route traces inherit that span;
finals, attempts, lifecycle and body records retain native OTLP trace/span fields
through deferred callbacks. Standalone supervisor events are process evidence
and do not invent a request trace. Direct Codex requests now use the same tracing
and request metrics path, including selected account and requested reasoning
effort. Internal child traces do not increment client request metrics. Codex
fallback children own their observed token metrics; the parent owns the client
request count and retains attributable usage on its span without counting it
again. If a later SDK fallback owns the final outcome, the failed Codex attempt
retains its usage and the parent does not inherit that earlier provider's usage.

Claude JSON, native streams and translated fallbacks record useful-output
availability and its source. Populated content starts and completed zero-argument
tool calls count as useful output; thinking and whitespace alone do not. Malformed or oversized
frames report `not_observed` with a reason rather than implying an empty result.
JSON timing measures when the complete parsed body becomes available. Buffered
translations use `translated_response.ready` after the full output is validated;
upstream text arrival cannot establish output latency visible to the client.

Direct Codex routes capture client request, each upstream request/response, and
client response, including HTTP errors. Internal fallbacks retain the parent's
client phases. Raw stream observers keep at most 1 MiB each and share a 16 MiB
retained-byte pool, releasing it on completion, abort or cancellation. The Claude
SSE parser retains a separate bounded 1 MiB prefix outside that pool so upstream
and client observations remain distinct across cancellation boundaries.
UTF-8 prefixes, original wire byte counts and `bodyTruncated` stay explicit.
These limits do not alter client bytes or the model context. SSE data is redacted
structurally; malformed structured data is replaced with a redaction marker.
Plain text and embedded strings use the shared credential-pattern sanitizer
without its short diagnostic-text limit.

Codex `firstUsefulOutputStatus` is `observed`, `no_useful_output`, or
`not_observed`. Timing recognizes non-whitespace text/refusal, populated function and
custom-tool calls, content parts and completion-only output. Empty tool shells,
reasoning and control events are not useful output. Malformed, oversized or
undispatched frames make an absence claim unavailable. These observations never
change the relayed bytes, retry policy or context sent to the model.

Each OTel log gets a `proxy.event_id`. Per queue, `/status` retains the latest
16 failed exports/admissions, up to 64 record identities per batch, and a
`failureHistoryEvicted` counter. These entries contain event/request/capture IDs
and sanitized error metadata, not log bodies. After a successful export,
`telemetry_delivery` records report queued diagnostics through the same OTel
pipeline. Retryable transport failures use bounded retries with unchanged event
identities. After export settles as failed, recovery diagnostics do not replay
the original uncertain records. Failure diagnostics are bounded, can themselves
be lost, and cannot repair an abrupt process exit. The response-aware transport
marks partial rejection and malformed acknowledgments unconfirmed without
replaying those batches. A valid acknowledgment still does not prove backend
persistence.

## Coverage maintained in CI

`pnpm run test:proxy-telemetry` exercises recorded upstreams, local collector
fixtures and the built CLI in temporary homes. It is wired into required CI.
The matrix below describes supported cases, not a universal lossless guarantee.

| Case                                                                              | Observable evidence                                                                   | Deterministic verification                                             |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Anthropic/Codex completion, client cancel, semantic SSE failure, missing terminal | Final outcome, account, attempt, transport and lifecycle records                      | HTTP route/stream fault fixtures                                       |
| W3C context and Codex text, tool, refusal, control-only output                    | Native OTLP trace IDs, parent spans, timing status/source                             | Actual local OTLP receiver and in-memory span exporter                 |
| Malformed frames and incomplete measurement                                       | Explicit `not_observed`, preserved relay bytes                                        | Malformed/oversized Codex fixture                                      |
| Upstream auth, quota, cooling and network faults                                  | Classified attempt and terminal outcomes                                              | Recorded transport/account/fallback fixtures                           |
| Admission, stream accounting and worker exit                                      | Lifecycle sequence, terminal evidence or explicit unconfirmed state                   | Durable journal, worker death and socket fixtures                      |
| OTel-only application logs                                                        | Finals, attempts, bodies, lifecycle and console records; no application log directory | Local collector plus filesystem assertions                             |
| Export rejection, delayed acknowledgement and shutdown                            | Unconfirmed/dropped counters, failed record IDs, recovery diagnostics                 | Reject/recover and slow collector fixtures                             |
| Large body, redaction, truncation and queue pressure                              | Capture index, admission reason, delivery counts, digest                              | 7.3 MB request, burst, redaction and rejection fixtures                |
| Stored query completeness and duplicates                                          | Query ledger, explicit row/page bounds and nonzero failure                            | Partial/paged backend fixtures and built CLI                           |
| Missing, stale, corrupt or inconsistent stored data                               | Doctor fail/incomplete with named check                                               | Recorded backend variants including missing final and collector series |

Finite memory, policy exclusions, sampling, collector/backend retention and
process death remain explicit limits. OTel-only removes proxy application log
files; collectors/backends still need storage. Operational account, credential,
quota and supervisor state is not application logging and remains persistent.

For rollback, restore the previous service environment and launchd configuration,
then replace the supervisor with the previous runtime after draining requests.
Removing `NEUROLINK_PROXY_LOG_SINK=otel` restores the default file behavior.

## Bounded critical evidence under collector pressure

The proxy maintains four independent in-memory log queues, including records
currently exporting. `metadata` reserves 2,048 records / 8 MiB for lifecycle,
attempt, final, stream-error and supervisor evidence. `indexes` reserves 1,024
records / 8 MiB for body-capture indexes. `diagnostics` reserves 512 records /
2 MiB for console, runtime and delivery diagnostics. `bodies` reserves 256
chunks / 40 MiB. Byte accounting uses UTF-8
payload and attributes plus per-record overhead; these are admission budgets,
not an exact process RSS cap. Status exposes outstanding bytes, high-water
bytes, byte-limit drops and oldest outstanding age for each queue.

Critical metadata remains owned across transient transport failures for a
120-second budget from admission. An active HTTP attempt can finish within its
existing 31-second callback deadline. Retries keep the original event IDs, respect
Retry-After and use capped backoff. The doctor deduplicates identical backend
retries by event identity. Partial acceptance, malformed acknowledgements and
permanent rejection are never replayed. Exhausted retention is explicitly
unconfirmed; transport acknowledgement is not proof of backend persistence.
Status exposes retrying records, retried batches and retention exhaustion.

Shutdown ends waiting retries immediately, allows healthy in-flight exports to
finish and cancels remaining HTTP work after four seconds, within the service's
five-second telemetry cleanup budget. Interrupted exports remain unconfirmed.
No application disk spool is introduced. A crash can still lose process memory;
durable collector enqueue, bounded storage, backend reconciliation and capacity
monitoring remain necessary. Infinite outages cannot be covered by finite queues.
