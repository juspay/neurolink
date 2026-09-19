# Native collector queues and body separation

`otel-collector.proxy-native-durable.yaml` is an opt-in profile for
`otelcol-contrib >= 0.160.0`. It does not install, replace, or restart a service.
Application logs remain OTLP-only. Collector retry storage writes a bounded
queue to disk so records accepted into that queue survive a collector restart.

Configure these variables in the collector service environment:

- `NEUROLINK_OPENOBSERVE_OTLP_ENDPOINT`: backend API endpoint, for example
  `http://127.0.0.1:5080/api/default` (use TLS outside loopback).
- `NEUROLINK_OPENOBSERVE_BASIC_AUTH`: backend authorization, supplied privately.
- `NEUROLINK_OTEL_QUEUE_DIRECTORY` and `NEUROLINK_OTEL_COMPACTION_DIRECTORY`:
  private directories on a volume with an operator-managed disk quota.
- `NEUROLINK_PROXY_STREAM_HEADER=neurolink_proxy` and
  `NEUROLINK_PROXY_BODY_STREAM_HEADER=neurolink_proxy_bodies`.

Configure the proxy service with `NEUROLINK_PROXY_LOG_SINK=otel`,
`OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://127.0.0.1:14318/v1/logs` and
`NEUROLINK_PROXY_OTLP_BODIES_ENDPOINT=http://127.0.0.1:14319/v1/logs`.
Configure the doctor's environment with the same two stream variables, or point
`NEUROLINK_OTEL_COLLECTOR_CONFIG` at this collector's resolved configuration.
Without a separate body endpoint/stream, existing single-stream deployments
continue to work.

The profile isolates metadata and bulk body queues and backend streams. There is
no volatile batch processor before the persistent exporter queue: receiver
success follows persistent enqueue rather than a timer-buffered batch. Proxy
chunk batching still reduces transport calls. Queues use a 32 MiB metadata byte
limit per signal and a 256 MiB body byte limit, plus in-flight requests and
storage/index overhead. Compaction reclaims consumed pages. These are payload
bounds, not a hard filesystem size cap; apply a volume quota and monitor free
space. Backend retention should be configured separately for each stream.

Disk-full errors, queue saturation, invalid records, process crashes before
persistent enqueue, and permanent backend rejection can still lose records.
Retry queues retry transient errors indefinitely until delivered or storage
limits are reached. A transport acknowledgment is not proof of backend
persistence or exactly-once delivery; use stable event IDs to deduplicate
retries. Retrying after ambiguous network acknowledgment can create duplicates.

Validate a profile before an authorized activation:

```sh
otelcol-contrib validate --config scripts/observability/otel-collector.proxy-native-durable.yaml
```

The isolated recovery test starts its own collector on random loopback ports,
uses a temporary queue directory and a fake backend, forces an outage, kills
only that test-owned collector process, restarts it with the same directory,
and verifies replay. It never operates an installed service:

```sh
NEUROLINK_TEST_OTELCOL_BIN=/absolute/path/to/otelcol-contrib \
  pnpm exec tsx test/continuous-test-suite-proxy-capture-pipeline.ts
```

The doctor's admission reconciliation searches a bounded lookback (24 hours by
default), applies per-request deadlines where logged, and gives late ingestion
120 seconds before flagging missing endings. Use `--admission-lookback-minutes`
and `--max-rows` to select an explicit wider proof; exceeding row/query budgets
is incomplete evidence, never a green result. Request success remains separate
from capture admission, worker processing, publication and exporter transport.
