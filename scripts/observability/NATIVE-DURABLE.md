# Native collector queues and body separation

`otel-collector.proxy-native-durable.yaml` is an opt-in profile for
`otelcol-contrib >= 0.160.0`. It does not install, replace, or restart a service.
Application logs remain OTLP-only. Collector retry storage writes a bounded
queue to disk so records accepted into that queue survive a collector restart.

## Prepare an existing native installation

The shipped CLI stages a migration from the existing collector. It preserves
the metadata stream (for example, `curator`), backend endpoint and authorization,
metadata listener, health listener and metrics port. Its new body stream defaults
to `<metadata stream>_bodies`. Other operator customizations need review against
the staged standard profile, particularly filters, TLS, memory limits and
exporter settings. The original collector YAML and all service settings stay
unchanged.

```sh
neurolink telemetry native-prepare \
  --collector-config "$HOME/.neurolink/telemetry-native/config/collector.yaml" \
  --output "$HOME/neurolink-native-migration-review" \
  --queue-directory "$HOME/.neurolink/telemetry-native/queue" \
  --compaction-directory "$HOME/.neurolink/telemetry-native/compact" \
  --disk-quota-mib 1024 \
  --metadata-retention-days 14 \
  --body-retention-days 3

neurolink telemetry native-validate \
  --directory "$HOME/neurolink-native-migration-review" \
  --collector-bin "$HOME/.neurolink/telemetry-native/bin/otelcol-contrib"
```

The destination directory must not exist. It is created with mode `0700`, with
`0600` files: `collector.yaml`, `collector.env.json`, `proxy.env`, `doctor.env`
and `manifest.json`. The JSON environment contains the private backend
authorization; keep it private and do not paste it into an issue. Command output
and the profile do not contain that credential. The doctor snippet includes
**both stream names** and the actual collector metrics port; supply backend
authorization to the doctor's environment privately. Snippets are environment
configuration to merge, not shell scripts to execute. Never replace an existing
proxy environment wholesale with a snippet.

`native-validate` checks private file permissions, staged file hashes, the source
configuration hash, and stable collector version `>= 0.160.0`, then runs only
`otelcol-contrib validate`. It uses temporary queue paths inside the stage and
removes them afterward. It never starts a collector or connects to the backend.
Binary diagnostics are suppressed because they can contain credentials. A
successful validation proves profile acceptance, not delivery, backend retention,
queue recovery or runtime adoption. Re-prepare into a new directory after any
source or staged-file edits.

The manifest records requested payload limits, planned volume quota, separate
backend retention periods and remaining operator checks. `--metadata-queue-mib`
(default 32) applies to each of three metadata signal queues;
`--body-queue-mib` defaults to 256. These become collector environment byte
limits. The quota must allow at least twice the sum of payload limits, but that
is planning headroom, **not a guarantee that compaction fits**. No filesystem
quota or backend retention setting is applied. The operator must provision both
private storage directories on a quota-managed volume and apply/verify backend
retention before activation.

There is deliberately no activation command in this workflow. Service changes
require an explicit operator action: first back up collector config, service
definition and existing environments; then merge the reviewed settings using
the service manager. On failed health, export or backend checks, restore those
backups. Do not substitute `proxy install` for this review: it may regenerate
existing launch settings. Verify fresh metadata **and** body records, queue
failure counters and unchanged application-log files afterward. Package release
and static validation do not establish that the live service adopted the stage.

Host scheduling pressure is separate from queue durability. If the machine has
many concurrent builds, MCP launches or other CPU consumers, review that
concurrency independently. Preparation and validation do not stop processes,
disable scanners or change host scheduling policy.

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
