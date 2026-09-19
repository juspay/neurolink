[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRunOutcome

# Type Alias: AgentRunOutcome

> **AgentRunOutcome** = `object`

Defined in: [types/isolatedAgent.ts:321](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L321)

Outcome of an isolated agent run.

Delivery guarantee: a run with a non-empty execution record never returns
an empty result — when extraction is unrecoverable, `data` carries a
mechanical digest (which tools ran, ok/failed counts, bounded excerpts of
successful payloads).

## Properties

### status

> **status**: [`AgentRunStatus`](AgentRunStatus.md)

Defined in: [types/isolatedAgent.ts:322](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L322)

---

### data?

> `optional` **data?**: `unknown`

Defined in: [types/isolatedAgent.ts:324](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L324)

Schema-valid extraction output when `extraction.schema` was given.

---

### content?

> `optional` **content?**: `string`

Defined in: [types/isolatedAgent.ts:326](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L326)

Final research-pass text (the worker's own narrative).

---

### stopReason?

> `optional` **stopReason?**: [`GenerateStopReason`](GenerateStopReason.md) \| `string`

Defined in: [types/isolatedAgent.ts:328](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L328)

Why the research turn ended (honest — see GenerateStopReason).

---

### toolExecutions

> **toolExecutions**: [`ToolExecutionRecord`](ToolExecutionRecord.md)[]

Defined in: [types/isolatedAgent.ts:334](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L334)

Real tool execution records (params/results/timing). Terminal outcomes
carry the WHOLE run's records (all legs — what `data` was built from);
`in_progress` legs carry this leg's records only.

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/isolatedAgent.ts:336](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L336)

Aggregated token usage for the run (research + extraction).

---

### durationMs

> **durationMs**: `number`

Defined in: [types/isolatedAgent.ts:338](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L338)

Wall-clock duration of this call (ms).

---

### extractionSource?

> `optional` **extractionSource?**: `string`

Defined in: [types/isolatedAgent.ts:340](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L340)

Present when extraction fell back through the recovery ladder.

---

### extractionError?

> `optional` **extractionError?**: `string`

Defined in: [types/isolatedAgent.ts:342](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L342)

Extraction/validation error summary when data is a mechanical digest.

---

### handle?

> `optional` **handle?**: `string`

Defined in: [types/isolatedAgent.ts:345](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L345)

Resume handle (status "in_progress" only).

---

### leg?

> `optional` **leg?**: [`AgentRunLegInfo`](AgentRunLegInfo.md)

Defined in: [types/isolatedAgent.ts:347](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L347)

This leg's accounting.

---

### delta?

> `optional` **delta?**: `string`[]

Defined in: [types/isolatedAgent.ts:349](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L349)

One-line query→outcome summaries for this leg.

---

### nextPlan?

> `optional` **nextPlan?**: `string`

Defined in: [types/isolatedAgent.ts:351](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L351)

The worker's own stated intent for the next leg.

---

### wasteSignals?

> `optional` **wasteSignals?**: `string`[]

Defined in: [types/isolatedAgent.ts:353](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L353)

Tripped waste signatures, if any.

---

### budget?

> `optional` **budget?**: [`AgentRunBudget`](AgentRunBudget.md)

Defined in: [types/isolatedAgent.ts:355](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L355)

Cumulative budget accounting.
