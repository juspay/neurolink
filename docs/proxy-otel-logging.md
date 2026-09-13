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
256-record queue. Outstanding counts include exports in flight. A separate
publication queue owns up to 16 captures / 32 MiB of redacted payloads. It sends
one capture at a time, at most 64 chunks per batch, and waits for actual exporter
callbacks before submitting more. Slow or failed collectors cannot make a burst
silently drop the tail of an otherwise accepted capture. Metadata uses its own
queue and continues independently. Transport timeouts are five seconds, with a
six-second callback guard. Capture publication has a 20-second deadline including
queue wait; a failed batch stops further publication and produces an explicit
unconfirmed or partial result. These bounds still permit rejected captures
during a prolonged outage. They are payload/queue limits, not total process RSS
limits: objects, serialization buffers and the capture worker add overhead.

OTel-only body capture submission returns without waiting for the collector,
even when an HTTP handler awaits the logging function. Shutdown calls
`flushRequestLogs()` before flushing/shutting down the OTel provider so already
submitted processing and publication keep their ownership until settled.

Each `body_capture_index` includes a unique `captureId`, a SHA-256 digest of the
captured redacted text, and `bodyDelivery`. Chunks carry the same identity as
`body.capture_id`; reconstruct by capture ID and chunk index, then verify the
count and digest. The index is emitted after publication settles:

- `transport_acknowledged`: all prepared chunks received SDK transport success;
  this does not prove backend persistence or per-record acceptance.
- `export_unconfirmed`: all chunks were submitted, but at least one export was
  not acknowledged. Some or all may still be stored in the backend.
- `partial`: publication stopped after only part of the capture was submitted,
  or a chunk was dropped. Inspect `expectedChunks`, `acknowledgedChunks`,
  `unconfirmedChunks`, `droppedChunks` and `notSubmittedChunks` separately.
- `rejected`: the publication queue or deadline rejected the capture. No
  partial body is deliberately enqueued to make room.
- `capture_rejected`: the body worker's admission guard rejected processing;
  the index includes `captureError`. `no_body` means no body was present.

The worker uses a 16 MiB per-entry estimate of retained clone memory and a
32 MiB aggregate pool. Its estimate accounts for UTF-16 strings without
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
still excludes body capture.

`/status` exposes the selected sink and per-process export counters under request
logging observability. `submitted` means admitted to the memory queue;
`transportAcknowledged` means the SDK reported HTTP export success. It does not
prove individual record acceptance or backend persistence. `exportUnconfirmed`
means an export failed or could not be confirmed; it may have reached the
collector before a connection failed. `dropped` counts local queue overflow.
Reconcile these with collector counters and queries for correlated request IDs
in the backend. Do not claim exactly-once or lossless delivery from HTTP success.

An in-memory pipeline can lose evidence during an outage or abrupt process exit.
Native runtime output emitted outside application console methods is discarded
by `/dev/null`; the supervisor still records worker exits. Set collector queue,
retry, memory and backend retention limits deliberately. A collector/backend may
still persist telemetry; this mode removes proxy log files, not backend storage.

The local `proxy analyze`, `proxy replay` and file-based account ledger commands
read historical files. They do not query the collector and cannot describe new
OTel-only traffic. Use the telemetry backend for that interval.

## Querying historical metadata within a small backend memory budget

Configure `NEUROLINK_OPENOBSERVE_URL`, `NEUROLINK_OPENOBSERVE_ORG`,
`NEUROLINK_PROXY_STREAM_HEADER` (the actual log stream), and either
`NEUROLINK_OPENOBSERVE_BASIC_AUTH` or the user/password environment variables.
Keep credentials in the environment rather than command-line arguments.

```sh
node scripts/observability/query-proxy-history.mjs \
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

The telemetry doctor honors the configured stream name and, with
`NEUROLINK_PROXY_LOG_SINK=otel`, does not require or scan stale local log files.
Stream inventory freshness alone remains a coarse signal; reconcile records
with producer counters and capture indexes for a delivery audit.

For rollback, restore the previous service environment and launchd configuration,
then replace the supervisor with the previous runtime after draining requests.
Removing `NEUROLINK_PROXY_LOG_SINK=otel` restores the default file behavior.
