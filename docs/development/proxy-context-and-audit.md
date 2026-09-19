# Proxy context protection and audit closure

Context checks run before native Anthropic, native Codex, and translated SDK
provider dispatch. Each fallback uses its actual serving model. The proxy records
estimated input, instruction, tool and output-schema tokens, the output/reasoning
reserve, discovered/configured model limits, and retained tool counts. It never
silently truncates conversation history.

`NEUROLINK_PROXY_CONTEXT_POLICY` is an optional JSON object:

```json
{
  "maxInputTokens": 100000,
  "outputReserveTokens": 32768,
  "enforceDiscoveredLimits": true,
  "models": {
    "provider/model-id": { "contextWindow": 200000, "maxOutputTokens": 32768 }
  }
}
```

These numbers illustrate the schema, not recommended model limits. Unknown
model context windows stay unknown; a guessed catalog default never becomes a
hard limit. Successful Codex model discovery can register advertised limits
without an additional discovery request. Codex does not support the bridged
Claude `max_tokens` transport setting, so its reservation uses the known model
output ceiling or configured/default output reserve instead.

An optional `toolAllowlist` selects tools by name. Tools referenced by prior
calls and an explicit tool choice are retained; unnamed native tools are also
retained. This is opt-in and can change which new tools the model can choose.
The proxy preserves required instructions, history and call/result structure.
Automated history summarization has not been introduced: reducing text without
an application-specific quality evaluation can discard information required to
complete a task.

Token quantities are estimates, including media estimates. Media requests are
marked uncertain and are not rejected solely from a guessed combined context
window. A configured estimated input cap is not an exact provider-token cap.
Provider tokenization, media metering and model quality evaluations remain
necessary before claiming exact limits or performance-preserving compression.
Invalid configured policy and local context/budget refusals are explicit,
nonretryable errors; automatic fallback cannot bypass them.

Shared account/session spending controls are described in
[proxy-updates-and-token-budgets.md](/docs/development/proxy-updates-and-token-budgets).
Collector durability and body separation are described in
[collector durability profile](https://github.com/juspay/neurolink/blob/release/scripts/observability/NATIVE-DURABLE.md).

The telemetry doctor accepts `--admission-lookback-minutes`,
`--request-timeout-ms`, and `--ingestion-grace-ms`. The lookback must exceed the
default request deadline plus ingestion grace. If the effective queried window
cannot cover a longer observed request deadline, admission reconciliation is
`unverified`; it cannot establish that missing endings were detected.

## Audit coverage

The table preserves every requirement in the incident audit. “Source” means
implemented with deterministic isolated checks; it does not mean deployed.
A package version on disk, a passing test or a merged PR does not prove the
serving supervisor and workers adopted it.

| Item | Requirement                                | Change or evidence boundary                                                                                                                              |
| ---- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T01  | OTel-only application logging              | Existing behavior retained. Retest file-write inactivity after authorized adoption; collector storage is distinct.                                       |
| T02  | Native collector/backend                   | Existing deployment choice retained. Native processes still consume CPU/RAM and backend disk.                                                            |
| T03  | Stored correlation and complete accounting | Source: bounded admission-to-terminal reconciliation, explicit missing/out-of-window evidence, route attribution.                                        |
| T04  | Retry copies                               | Stable event identity deduplication retained; collector acknowledgment is not exactly-once storage.                                                      |
| T05  | Capture burst handling                     | Source: bounded shared body batching, independent metadata transport, per-capture export outcomes.                                                       |
| T06  | Persistent collector queue                 | Opt-in durable native collector profile; isolated outage/restart replay tested. Requires operator activation.                                            |
| T07  | Reasoning usage                            | Existing reasoning accounting preserved. Reasoning remains included in output totals.                                                                    |
| T08  | Capture completeness                       | Source: source/processing truncation and redaction loss distinguished; body limits/rejections remain explicit. Universal losslessness is not promised.   |
| T09  | Translation coverage                       | Source: Claude/OpenAI/Gemini streaming/buffered attempts and finals preserve requested/served models, usage and known identity.                          |
| T10  | Query and body isolation                   | Source: optional independent body endpoint/stream and bounded projected queries. Activation/retention policy remains operational.                        |
| T11  | Internal bridge duplication                | Source: authenticated parent/child linkage, one client outcome owner and one billable usage owner.                                                       |
| T12  | Validation/unknown routes                  | Source: explicit rejection and auxiliary accounting rather than unexplained missing finals.                                                              |
| T13  | Timing and aged admissions                 | Source: separate admission/worker/publication/export timings, bounded admission lookback and ingestion grace.                                            |
| R01  | Safe automatic updates                     | Source: immutable staged packages, bounded progress-aware install, atomic selection/rollback, truthful version phases.                                   |
| R02  | Rolling restart safety                     | Source: all draining generations, candidate, queued sockets and transfers block unsafe refresh.                                                          |
| R03  | Supervisor SIGHUP                          | Prior source regression retained; live signal behavior requires authorized activation evidence.                                                          |
| R04  | Shutdown ownership                         | Prior source regression retained; no production shutdown performed by these tests.                                                                       |
| R05  | Claude tool fallback                       | Existing deterministic conversion coverage retained; previously lost original request shapes cannot be reconstructed.                                    |
| R06  | Terminal/status reconciliation             | Source: one final owner survives late callbacks; unmatched history remains unknown.                                                                      |
| R07  | Availability/latency                       | Source: cancellation, deadlines, demand-driven reads and bounded queues. Internet/upstream failures and production latency still require observation.    |
| R08  | Accepted requests without endings          | Source: socket/abort terminal ownership independent of future pulls. Missing historical endings remain unrecoverable.                                    |
| R09  | Screenshot correlation                     | Request/session/trace linkage improves future diagnosis. Exact historical screenshot is unidentified.                                                    |
| R10  | Disconnect before headers                  | Source: compose client abort into provider work and settle cancellation once.                                                                            |
| R11  | Loopback abort                             | Source: propagate abort/deadline plus trace/session and internal linkage across the bridge.                                                              |
| R12  | Stream pressure/deadlines                  | Source: demand-driven provider iteration, full consumption deadline and bounded cancellation. No replay after visible output.                            |
| R13  | Structured fallback errors                 | Source: sanitized cause/code/retryability survive parent/child translation; policy denials stop fallback.                                                |
| C01  | Cheaper fallback selection                 | Existing configured policy retained. Native client selection remains distinct from fallback selection.                                                   |
| C02  | Quota scope                                | Prior structured quota regression retained; real quota recovery requires natural evidence.                                                               |
| C03  | Unknown quota                              | Prior provenance/unknown handling retained; unknown does not imply unused allowance.                                                                     |
| C04  | Context reduction                          | Source: model-aware estimated preflight, output reserve and explicit safe tool selection. Automatic history compaction requires task-quality evaluation. |
| C05  | Shared spending pressure                   | Source: atomic reservations across worker generations, provider usage reconciliation, conservative unknown usage. Optional and not durable billing.      |
| H01  | Other scanners/host load                   | Outside this repository's ownership. No unrelated process was stopped; causal attribution remains limited.                                               |
| H02  | Exact past plan burn                       | Missing historical provider allowance/billing baselines cannot be reconstructed. Token totals are not subscription invoices.                             |

Active and rollback package selections are published together in one atomic `selections.json` record. Existing `active.json` and `previous.json` files are read only when no atomic record exists; malformed committed state cannot revive stale legacy selections.

## Isolated verification

The suites use temporary HOME/config/credentials, fake providers and test-owned
loopback sockets. They do not use a live proxy as a development target.

```sh
pnpm run build
pnpm exec vitest run test/codex-quota-observability.test.ts
pnpm exec tsx test/continuous-test-suite-proxy-context-preflight.ts
pnpm exec tsx test/continuous-test-suite-proxy-fallback-errors.ts
pnpm exec tsx test/continuous-test-suite-proxy-telemetry-reconciliation.ts
pnpm exec tsx test/continuous-test-suite-proxy-request-lifecycle.ts
pnpm exec tsx test/continuous-test-suite-proxy-http-disconnect.ts
pnpm exec tsx test/continuous-test-suite-proxy-route-accounting.ts
pnpm exec tsx test/continuous-test-suite-proxy-fallback-parent.ts
pnpm exec tsx test/continuous-test-suite-proxy-update-staging.ts
pnpm exec tsx test/continuous-test-suite-proxy-token-budget.ts
pnpm exec tsx test/continuous-test-suite-proxy-capture-pipeline.ts
```

For actual collector replay, set `NEUROLINK_TEST_OTELCOL_BIN` as documented in the
collector guide. Without it that case is explicitly skipped. Production proof
requires a separately authorized rollout and observation of actual serving
versions, route coverage, stored metadata/body outcomes, latency, resource use,
and loss/retry counters during representative traffic.
