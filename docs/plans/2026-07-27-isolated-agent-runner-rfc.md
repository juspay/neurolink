# RFC: `runIsolatedAgent()` — production sub-agent runner + host-loop delegation

- **Status:** Accepted (implemented alongside this RFC)
- **Scope:** work items N4 (isolated agent runner) and N5 (host-loop delegation)
- **Depends on:** N1 (agent plumbing), N2 (real `toolExecutions` records), N3 (worker-mode factory + sampling strip)

## 1. Problem

Both production consumers of NeuroLink (Curator and Yama) hand-roll the same "worker
sub-agent" machinery on top of `generate()`:

- a second NeuroLink instance configured as a worker — memory off, orchestration off,
  observability inherited (`autoDetectExternalProvider` + `skipLangfuseSpanProcessor`),
  log bridge attached — a 10-line config block copied in ~10 files;
- a proxy "recorder" wrapped around every tool to capture real params/results, because
  `GenerateResult.toolExecutions` was a stub;
- a two-pass run shape: a tool-using research pass under a turn budget, then a tool-free
  extraction pass with structured-output recovery (candidate ladder + corrective re-asks);
- a `samplingTemperatureOption()` hack spread across 12 call sites because some models
  (Sonnet 5, Opus 4.7+, Fable 5 — notably on Vertex) reject `temperature`/`topP`.

This RFC moves that machinery into the framework. The behavioral contract below is the
acceptance spec — it encodes what Curator's production-hardened O2 worker does today, and
every item has an incident behind it.

## 2. Reference implementations (validation targets)

- **(a) Curator O2 research worker** — two-pass extraction over code-search MCP tools with
  evidence normalization.
- **(b) Curator log-analysis worker** — pre-injected catalog context, internal-caller
  overrides (`maxSteps`/`timeoutMs`/bypass flags in tool context), and evidence
  verification done by the CALLER from `toolExecutions` (raw result texts must be
  available up to the cap).
- **(c) Yama `ContextExplorerService`** — same two-pass shape as (a).

## 3. Non-goals / ground rules

- **No product imports.** Nothing from Slack, Superposition, or any consumer domain. All
  tunables are constructor/options parameters with sane defaults.
- **Host-loop preserving.** The delegation primitive runs inside a HOST instance's existing
  `generate()` tool loop. A consumer is never required to hand its conversation over to a
  separate router `generate()` — that is `AgentNetwork.execute()`'s flaw, and it stays as a
  standalone-mode convenience only.
- **Backward compatible.** New fields optional; the existing `AgentNetwork` API keeps
  working with field-compatible exports.

## 4. API

All types live in `src/lib/types/isolatedAgent.ts` and export through the central barrel.

### 4.1 `NeuroLink.createWorkerInstance(opts?)` (N3)

Worker mode as a factory: conversation memory off, orchestration off, observability
inherited with `autoDetectExternalProvider: true` + `skipLangfuseSpanProcessor: true`,
credentials inherited, the host's tool registry shared by default (worker tool calls reuse
the host's connections — this is how the research worker reaches its code-search MCP tools
without reconnecting), and an internal log bridge attached with a caller-supplied tag
(`WorkerInstanceOptions.logTag` + `onLog`).

Because the underlying logger is process-global, constructing any instance rebinds the log
sink; `createWorkerInstance` restores the host as the active sink, and `dispose()` only
clears the sink it actually owns (`logger.clearEventEmitter(ifEmitter)`), so worker
churn never silences a host's log bridge.

### 4.2 `NeuroLink.runIsolatedAgent(def, input, opts)` (N4)

```ts
const outcome = await neurolink.runIsolatedAgent(def, input, opts);
```

- `def: IsolatedAgentDefinition` — `AgentDefinition` plus optional `extraction`
  (`schema` local/lenient validator, `wireSchema` strict provider-attached schema,
  `shapeDoc` for corrective retries, `coerce` candidate normalizer, `maxRetries`,
  per-attempt `timeoutMs`, and `totalTimeoutMs` — the phase-level deadline bounding
  ALL extraction attempts, default `(maxRetries + 1) × timeoutMs`; the one number
  callers need for outer-ceiling arithmetic).
- `opts: AgentRunOptions` — `abortSignal`, `overrides` (`turnTimeoutMs`, `stallTimeoutMs`,
  `wrapupTimeLeadMs`, `maxSteps`, `maxTokens`, `model`, `provider`), `toolContext`
  (set on the worker for EVERY tool call, incl. a caller-supplied `sessionId`; the run id
  is the default), `onEvent` lifecycle stream, `leg` (leashed mode), `handleTtlMs`
  (default 10 min), `waste` thresholds, and `capture` bounds for the run's execution
  records.
- Returns `AgentRunOutcome` — `status` (`completed | partial | in_progress |
insufficient_data | error`), `data` (schema-valid when `extraction.schema` given, or a
  mechanical digest under the delivery guarantee), `content` (research narrative),
  `stopReason` (honest), `toolExecutions` (`ToolExecutionRecord[]` — the WHOLE run's
  records on terminal outcomes, this leg's records on `in_progress`), `usage`,
  `durationMs`, `extractionSource`/`extractionError` diagnostics, and in leashed mode
  `handle`, `leg`, `delta`, `nextPlan`, `wasteSignals`, `budget`.

### 4.3 Leashed mode: `continueAgent(handle, guidance?)` / `stopAgent(handle)`

When `opts.leg` is set, a leg that exhausts its budget returns
`status: 'in_progress'` with a `handle`; the worker stays alive in a TTL registry with its
full conversation history. `continueAgent` resumes the next leg — `guidance` is appended
as a user turn (the supervisor's re-steering channel). `stopAgent` disposes and returns a
final mechanical-digest outcome. On TTL expiry the worker is auto-disposed and the final
outcome is tombstoned, retrievable exactly once — an abandoned leg is never silently lost.

### 4.4 `NeuroLink.registerAgentTool(def, opts)` (N5)

Wraps N4 as a tool on the HOST instance so its existing generate loop delegates:

- `name` (default: agent id), `maxDelegationsPerTurn` (counted per top-level generate, in
  the loop itself, via an AsyncLocalStorage turn scope entered at `generate()`),
  `maxDepth` (via tool context `agentDepth`; at the limit the tool is **withheld** from the
  request through `excludeTools`), `maxConcurrent` (process-wide pool with queue timeout;
  the pool is shared with `AgentNetwork` standalone delegations), `leg` (leashed by default
  for this tool), plus `handleTtlMs`, `waste`, `overrides` pass-through.
- Every refusal carries the recovery instruction in the error text:
  - cap hit → _"Do not call `<tool>` again this turn; synthesize from the investigations
    you already have."_
  - open-handle conflict → _"continue it via its handle instead of delegating anew."_
  - pool timeout / depth limit → analogous instructions.

## 5. Behavioral contract (acceptance spec)

1. **Lifecycle** — worker instance from N3, disposed in `finally` — including on the leg
   path when the handle expires (TTL) or is stopped.
2. **Research pass** runs with tools under the turn budget (`turnTimeoutMs` + wrap-up nudge
   - stall watchdog — the machinery from `generate()`, not a reimplementation). NEVER a
     bare wall-clock abort: a budget-capped run ends with the model consolidating, an honest
     `stopReason`, and `status: 'partial'`. (Leashed `budgetMs` is fed in as `turnTimeoutMs`
     so leg ends are consolidations too; only `budgetToolCalls` and waste trips end a leg by
     abort, and both preserve the records.)
3. **Extraction pass always runs** (when `extraction` is configured), tools disabled, on
   its OWN timeout — never carved out of the research budget — fed from the tool-execution
   records, so a research generate that _died_ on a provider error still extracts from the
   records instead of losing the run. In leashed mode extraction runs on terminal legs;
   intermediate `in_progress` legs return `delta` summaries instead (per the O2 pattern —
   extracting every leg would burn the budget the leash exists to protect).
4. **Structured recovery built in** — candidates in order: provider `structuredData` → raw
   JSON object → ```json fence → first/last-brace span → top-level array; each through
`coerce`; each validated against `schema`; on failure up to `maxRetries`corrective
re-asks carrying the validation errors and`shapeDoc`; wire schema attached unless the
   provider rejected it (one automatic schema-less retry).
5. **Delivery guarantee** — a non-empty execution record can never produce an empty
   result. Unrecoverable extraction returns a mechanical digest (which tools ran, ok/failed
   counts, bounded excerpts of successful payloads) with `status: 'error' | 'partial'`.
6. **Abort chaining** — the parent `abortSignal` stops research AND extraction cleanly; the
   outcome reports the run was cancelled (`stopReason: "aborted"`); no ghost workers.
7. **Events** via `onEvent`: `start`, `tool_call`, `tool_result` (bounded summary),
   `phase` (research|extraction), `wrapup`, `leg_end`, `waste`, `complete`, `error`.
   Fire-and-forget; listener errors never break the run. Tool events are driven by the N2
   capture callback (`toolExecutionCapture.onRecord`), so they reflect real executions.
8. **Leashed mode** — see §4.3. `nextPlan` is the worker's own 1–2 sentence next-step
   statement, asked as part of the leg wrap (tools off, small timeout, failure tolerated).
9. **Waste signatures**, mechanical, checked per tool call: duplicate call hash (same tool
   - same normalized params seen before in this run), N consecutive empty/zero-result
     calls, error streaks, budget burn with no new distinct results. A tripped signature
     ends the leg EARLY with `wasteSignals` populated. Thresholds are options with defaults
     (`duplicateCallLimit: 2`, `emptyResultStreakLimit: 3`, `errorStreakLimit: 3`,
     `noNewResultsLimit: 8`).

## 6. Field validation matrix

Every public field mapped against the three reference implementations; fields that don't
map to all three are justified below the table.

| Field                                                   | (a) research worker                                | (b) log-analysis worker                                                                         | (c) Yama ContextExplorer |
| ------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------ |
| `def.instructions/tools/model/provider`                 | persona + code-search MCP filter                   | persona + log tools                                                                             | persona + repo tools     |
| `def.extraction.schema` (lenient)                       | evidence list validator                            | findings validator                                                                              | context-pack validator   |
| `def.extraction.wireSchema` (strict)                    | provider-attached; no defaults/catch               | same                                                                                            | same                     |
| `def.extraction.shapeDoc`                               | corrective re-ask shape doc                        | same                                                                                            | same                     |
| `def.extraction.coerce`                                 | wraps bare top-level arrays                        | normalizes evidence rows                                                                        | wraps arrays             |
| `opts.abortSignal`                                      | parent turn cancels worker                         | same                                                                                            | same                     |
| `opts.overrides.maxSteps/turnTimeoutMs`                 | O2 defaults                                        | **internal-caller overrides** (the named consumer)                                              | service defaults         |
| `opts.overrides.model/provider/maxTokens`               | cheap-model routing                                | same                                                                                            | same                     |
| `opts.toolContext` (+`sessionId`)                       | session for MCP auth/caching                       | **bypass flags ride here** (the named consumer)                                                 | session propagation      |
| `opts.onEvent`                                          | progress surfacing to Slack thread                 | ops logging                                                                                     | progress logging         |
| `opts.leg` / `handle` / `delta` / `nextPlan` / `budget` | leashed O2 supervisor loop (the named consumer)    | optional                                                                                        | optional                 |
| `opts.waste`                                            | duplicate-search/empty-result trips                | error-streak trips                                                                              | duplicate-read trips     |
| `opts.capture.maxResultChars`                           | evidence normalization needs full texts            | **caller-side evidence verification** needs raw result texts up to the cap (the named consumer) | full texts               |
| `outcome.toolExecutions`                                | evidence normalization input                       | caller-side verification input                                                                  | context assembly input   |
| `outcome.status/stopReason`                             | partial-vs-complete branching                      | same                                                                                            | same                     |
| `outcome.data` / digest                                 | extracted evidence                                 | extracted findings                                                                              | context pack             |
| `outcome.content`                                       | researcher narrative kept when extraction degrades | same                                                                                            | same                     |
| `outcome.usage/durationMs`                              | cost accounting                                    | same                                                                                            | same                     |

Justified extras (not in the original sketch):

- **`capture.onRecord` on `ToolExecutionCaptureOptions` (N2)** — the mechanism that powers
  per-call events and waste checks; also lets consumer (b) stream evidence as gathered.
- **`extraction.maxRetries` / `extraction.timeoutMs` on the definition** — both consumers
  configure these per-worker, not per-run; definition-level matches their shapes.
- **`outcome.extractionSource` / `extractionError`** — observability for which ladder rung
  fired; consumer (a) logs this today.
- **`WorkerInstanceOptions.shareToolRegistry`** — how a fresh worker reaches the host's MCP
  tools without reconnecting; all three consumers need worker tool access.

Cut from consideration:

- A per-run `configureWorker` callback (worker mutation hook) — covered by
  `shareToolRegistry` + `toolContext` + per-call `tools`; a mutation hook invites product
  policy into the worker.
- Per-leg extraction in leashed mode — burns exactly the budget the leash protects; `delta`
  covers the supervisor's needs (O2-proven).

## 6b. Migration note — `GenerateResult.toolExecutions` shape change

The historical stub entries were `{name, input, output}` (with fabricated
`duration: 0`). They are replaced by real `ToolExecutionRecord`s. Consumers
reading the old fields get `undefined` — update reads as follows:

| Old field  | New field    | Notes                                             |
| ---------- | ------------ | ------------------------------------------------- |
| `name`     | `toolName`   |                                                   |
| `input`    | `params`     | as parsed by the loop                             |
| `output`   | `resultText` | serialized + bounded (~8KB default; cap raisable) |
| `duration` | `durationMs` | real wall-clock, no longer always 0               |
| —          | `isError`    | new: thrown errors AND error-shaped results       |
| —          | `startedAt`  | new: epoch ms                                     |

`StreamResult.toolExecutions` is deliberately unchanged (legacy
`{name, input, output, duration}` summaries) — the stream-side contract is a
separate surface and migrating it is out of scope here.

## 6c. Known limitations (follow-up work)

- **Log-bridge attribution**: the NeuroLink logger is process-global with a
  single active emitter, so a worker's `onLog` bridge receives all NeuroLink
  log events in the process, stamped with the bridge's tag. Per-instance
  attribution requires per-instance logger routing.
- **`tool_call`/`tool_result` events fire post-execution** (driven by the
  capture record) — a pre-execution hook on the recorder wrapper is the
  natural extension when live in-flight status is needed.
- **Nested delegations bypass the concurrency pool** (the outer delegation
  already holds a slot; queueing nested work behind a full pool would
  deadlock it). Nested fan-out is therefore bounded by the outer slots ×
  per-run step caps, not by the pool directly. `AgentNetwork` standalone
  delegations are always top-level and stay pooled.

## 7. Implementation notes

- **N2 capture** rides a per-call `ToolExecutionRecorder`
  (`src/lib/core/toolExecutionRecorder.ts`) attached to the request options and wrapped at
  the two central tool-assembly points (`prepareGenerationContext`, `getToolsForStream`) —
  BEFORE tool discovery, so `search_tools` mid-turn hydration inserts wrapped tools. All
  loops (AI-SDK, native Vertex Gemini/Claude, AI Studio) obtain tools through those
  points, so one wrapper covers every path with no per-loop double-recording.
- **N3 sampling strip** is registry-driven (`modelSupportsSamplingParams` /
  `resolveSamplingParams` in `src/lib/models/modelRegistry.ts`): an explicit
  `capabilities.samplingParams` on a registry entry wins; otherwise known rejecting-family
  patterns (Sonnet 5, Opus 4.7+, Opus 5, Fable/Mythos) decide. Applied at every
  request-build site whose object retry paths spread (`requestParams` on both Vertex
  Claude loops, `buildBody` on the OpenAI-compatible path, both direct-Anthropic builders),
  so retries/fallbacks inherit the strip; the reactive
  `isTemperatureDeprecatedError` retry remains as the safety net. A debug log is emitted
  whenever params are stripped.
- **N5 turn counting** uses AsyncLocalStorage entered at the public `generate()` when
  agent tools are registered; nested/internal generates share the top-level turn's
  counters (`beginDelegationTurn` returns null inside an active scope).
- The stretch item (neutralizing instruction-shaped patterns in agent reports) is NOT part
  of this change, per the work plan (separate optional PR).

## 8. PR slicing

The work lands as one PR per work item: N1 (agent plumbing), N2 (toolExecutions records),
N3 (worker factory + sampling strip), N4 (runIsolatedAgent + this RFC), N5 (host-loop
delegation + AgentNetwork composition). N4/N5 ship with this RFC in-tree.
