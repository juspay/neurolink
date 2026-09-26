[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRunOutcome

# Type Alias: AgentRunOutcome

> **AgentRunOutcome** = `object`

Outcome of an isolated agent run.

Delivery guarantee: a run with a non-empty execution record never returns
an empty result — when extraction is unrecoverable, `data` carries a
mechanical digest (which tools ran, ok/failed counts, bounded excerpts of
successful payloads).

## Properties

### status

> **status**: [`AgentRunStatus`](AgentRunStatus.md)

---

### data?

> `optional` **data?**: `unknown`

Schema-valid extraction output when `extraction.schema` was given.

---

### content?

> `optional` **content?**: `string`

Final research-pass text (the worker's own narrative).

---

### stopReason?

> `optional` **stopReason?**: [`GenerateStopReason`](GenerateStopReason.md) \| `string`

Why the research turn ended (honest — see GenerateStopReason).

---

### toolExecutions

> **toolExecutions**: [`ToolExecutionRecord`](ToolExecutionRecord.md)[]

Real tool execution records (params/results/timing). Terminal outcomes
carry the WHOLE run's records (all legs — what `data` was built from);
`in_progress` legs carry this leg's records only.

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Aggregated token usage for the run (research + extraction).

---

### durationMs

> **durationMs**: `number`

Wall-clock duration of this call (ms).

---

### extractionSource?

> `optional` **extractionSource?**: `string`

Present when extraction fell back through the recovery ladder.

---

### extractionError?

> `optional` **extractionError?**: `string`

Extraction/validation error summary when data is a mechanical digest.

---

### handle?

> `optional` **handle?**: `string`

Resume handle (status "in_progress" only).

---

### leg?

> `optional` **leg?**: [`AgentRunLegInfo`](AgentRunLegInfo.md)

This leg's accounting.

---

### delta?

> `optional` **delta?**: `string`[]

One-line query→outcome summaries for this leg.

---

### nextPlan?

> `optional` **nextPlan?**: `string`

The worker's own stated intent for the next leg.

---

### wasteSignals?

> `optional` **wasteSignals?**: `string`[]

Tripped waste signatures, if any.

---

### budget?

> `optional` **budget?**: [`AgentRunBudget`](AgentRunBudget.md)

Cumulative budget accounting.
