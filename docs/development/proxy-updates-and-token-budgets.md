# Proxy package updates and token budgets

Automatic updates prepare a separate package before asking the supervisor to
activate it. They do not run a global package replacement over files used by
serving workers. These changes take effect after the release is installed and
its supervisor is activated; merging a PR does not change a running service.

## Update and restart behavior

The updater installs the current running version, when needed for rollback, and
the candidate under `~/.neurolink/proxy-packages/<version>`. Installation uses a
private temporary directory and publishes the version directory only after the
package name, version, executable location, and JavaScript syntax validate.
A candidate with missing dependencies can still fail startup: actual worker
readiness remains the activation gate, and the serving generation is retained
when replacement fails.

The package-manager process runs asynchronously. Output progress renews a
two-minute inactivity deadline; a fifteen-minute maximum still bounds an
installer that emits output forever. A timed-out installer and its process group
are stopped, its unpublished directory is removed, and transient errors receive
the updater's bounded retry schedule. Progress telemetry contains byte counts and
timing, not raw package-manager output that may contain authenticated URLs.

The stable launcher selects one validated package. Its `--version` check reads
package metadata in a minimal Node process; it does not initialize provider,
telemetry, or proxy code. Each worker is spawned from its expected package, so a
new candidate cannot silently change the recovery executable of an older worker.
Rollback restores the previous selection rather than reinstalling over live
files. Proxy auto-update does not change the global CLI package; invoking an older
global CLI to reinstall the service retains the selected proxy package instead
of downgrading it or rejecting its version. Version directories are intentionally retained: they can still be needed
by active/draining generations or rollback. This increases package disk usage;
there is currently no automatic garbage collection of retained versions.

Before refreshing a supervisor, all of the following must be settled:

- Active requests in the current worker.
- Every draining worker generation.
- Queued sockets and pending socket transfers.
- Any candidate worker.

Incomplete rolling status is not evidence of idleness. A drain attempt lasts at
most thirty seconds before deferral and admission recovery; it never kills an
older stream to make the update proceed. The worker also has a ninety-second
admission recovery lease if the updater disappears. Package installation and
validation finish before a legacy service closes admission.

Use `neurolink proxy restart --check` for a read-only restart preflight and
`neurolink proxy restart` for a supervisor-owned rolling replacement. A failed
check does not fall back to a forced process restart. The result distinguishes a
verified replacement from an activated worker whose final verification failed.
A worker restart does not, by itself, upgrade the supervisor.

Status separates `diskPackageVersion` (metadata at the executable used by the
reporting process), `selectedPackageVersion` (next launcher selection),
`validatedVersion` (last updater-validated package), `candidateVersion`, the
serving worker version, and the supervisor version. A changed disk manifest or a
validated package does not prove live adoption.

Reinstall first refuses any running worker, draining generation, or loaded launchd
job before writing files or changing processes. Unknown/permission-denied process
or launchd state also refuses. Use the rolling restart command for a live service;
explicitly stop and unload it before an intended reinstall.

For a stopped service, reinstall reads the saved definition before writing it. Existing
host/port, environment-file path, routing-config path, and operator OTel/proxy
variables become defaults; explicit arguments and current environment values
win. An unreadable service definition aborts reinstall instead of silently
removing its settings. Worker IPC identity is not persisted. This includes
`NEUROLINK_PROXY_OTLP_BODIES_ENDPOINT`, `NEUROLINK_PROXY_CONTEXT_POLICY`, and
`NEUROLINK_PROXY_TOKEN_BUDGET`.

## Optional token reservations

`NEUROLINK_PROXY_TOKEN_BUDGET` accepts a JSON object. No token cap is enabled by
default. For example, an operator could configure:

```json
{
  "maxInFlightTokens": 500000,
  "accountWindowTokens": 3000000,
  "sessionWindowTokens": 1000000,
  "windowMs": 3600000
}
```

These numbers are illustrative, not recommended account allowances. Supported
fields must be positive safe integers; an invalid configuration fails closed.
`maxInFlightTokens` is per provider/account. `accountWindowTokens` caps charged
tokens in that account's fixed window. `sessionWindowTokens` applies across
accounts and providers for the same client session. The default window is one
hour when a cap is set without `windowMs`.

Before each native upstream attempt or translated SDK invocation, the proxy
reserves estimated input plus the output allowance. An SDK invocation can contain
provider-internal retries that the proxy cannot observe individually; its single
reservation does not prove or cap the combined tokens of those hidden retries. Tool definitions and instructions contribute to the input
estimate. This is an estimate with recorded provenance, not an exact provider
tokenization or a guarantee of monetary cost. A configured estimated input maximum
is not a hard maximum on actual provider input tokens, especially for images,
audio, and files. Model/context policy is configured
separately with `NEUROLINK_PROXY_CONTEXT_POLICY`; it must use the actual serving
model. Provider-reported total input plus output replaces the estimate once when
complete usage is known. Reasoning is already part of output and is not added a
second time. Missing or uncertain usage retains the estimate. Cancellation
before dispatch refunds the unused reservation; cancellation after dispatch does
not presume that the provider billed zero.

Active and draining workers reserve atomically against one in-memory supervisor
coordinator. Outstanding reservations remain charged across a window boundary;
a reset cannot create new capacity for requests that are still running. Worker
exit retains estimated spending for its unresolved calls while releasing its
in-flight occupancy. A missing supervisor acknowledgement fails closed when
limits are configured; workers never silently create independent local budgets.
The number of account/session scopes and outstanding leases is bounded.

Client session identity follows `x-neurolink-session-id`,
`x-claude-code-session-id`, `session_id`, then `session-id`. It is hashed before
accounting; clients without these headers share an `unattributed` scope. Translated SDK routes that cannot identify an account before dispatch use an
explicit `sdk-unattributed` aggregate provider scope. Their session cap remains
shared with native routes, but the account scope cannot establish the real
upstream credential's combined limit across those routes. A foreground proxy
without a rolling supervisor uses a process-local coordinator.

Budget state is **not durable accounting**. It performs no per-request disk
writes, and a supervisor restart resets completed-window history. Separate proxy
supervisors do not share a budget. These limits must not be represented as a
durable daily-spending cap, an account subscription balance, or billing totals.
OTel usage evidence remains necessary for historical reconciliation. Local
budget denials are explicit nonretryable admission errors so provider fallback
cannot bypass spending control.

## OTLP acknowledgement boundaries

Both metadata and body queues serialize through OpenTelemetry's official JSON
serializer. A response-aware HTTP sender validates the complete, bounded response
before reporting transport acknowledgement. HTTP 200 with `{}` or a zero-rejection
`partialSuccess` warning is acknowledged. A known partial rejection leaves the
whole batch unconfirmed because the response does not identify the rejected
records; that batch is not replayed. Empty, malformed, interrupted, oversized,
unexpected-shape or ambiguous-alias success responses are also unconfirmed and
are not retried. Empty JSON is not `{}`; the zero-byte protobuf convention does
not apply to this JSON sender. Canonical and proto snake_case response names are
accepted, but duplicate aliases are conservatively rejected.

Transient HTTP 429/502/503/504 and transport failures before a response may retry
within the existing 30-second total export deadline, with at most five attempts
and exponential backoff with jitter even when Retry-After is zero. Retries retain the same
serialized event IDs and bytes, enabling query-side deduplication. Retry-After
cannot extend the deadline. Response reads are capped at 64 KiB. The exporter
preserves merged generic/log-specific OTLP headers, gzip request compression,
and configured CA/client certificate/key files; invalid configuration fails
explicitly. It requests uncompressed JSON responses and treats unsupported
response encodings as unconfirmed. Diagnostics omit collector response bodies
and credentials. Transport acknowledgement remains distinct from backend
persistence; query reconciliation is still needed to confirm ingestion.

A staged update may finish after its original supervisor/updater has been
replaced. Before publishing, validation rollback, or activation, the updater
rechecks that its recorded supervisor and updater PIDs still own the service
and that the original parent is running. Unknown ownership defers mutation.
Stale update jobs cannot overwrite or roll back a replacement's package selection.
Workers resolve matching active/previous private packages before consulting the
original global entry, so removing that old tree cannot prevent staged recovery.
