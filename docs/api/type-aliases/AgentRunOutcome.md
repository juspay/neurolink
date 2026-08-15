[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRunOutcome

# Type Alias: AgentRunOutcome

> **AgentRunOutcome** = `object`

Defined in: [types/isolatedAgent.ts:312](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L312)

Outcome of an isolated agent run.

Delivery guarantee: a run with a non-empty execution record never returns
an empty result — when extraction is unrecoverable, `data` carries a
mechanical digest (which tools ran, ok/failed counts, bounded excerpts of
successful payloads).

## Properties

### status

> **status**: [`AgentRunStatus`](AgentRunStatus.md)

Defined in: [types/isolatedAgent.ts:313](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L313)

---

### data?

> `optional` **data?**: `unknown`

Defined in: [types/isolatedAgent.ts:315](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L315)

Schema-valid extraction output when `extraction.schema` was given.

---

### content?

> `optional` **content?**: `string`

Defined in: [types/isolatedAgent.ts:317](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L317)

Final research-pass text (the worker's own narrative).

---

### stopReason?

> `optional` **stopReason?**: [`GenerateStopReason`](GenerateStopReason.md) \| `string`

Defined in: [types/isolatedAgent.ts:319](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L319)

Why the research turn ended (honest — see GenerateStopReason).

---

### toolExecutions

> **toolExecutions**: [`ToolExecutionRecord`](ToolExecutionRecord.md)[]

Defined in: [types/isolatedAgent.ts:325](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L325)

Real tool execution records (params/results/timing). Terminal outcomes
carry the WHOLE run's records (all legs — what `data` was built from);
`in_progress` legs carry this leg's records only.

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/isolatedAgent.ts:327](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L327)

Aggregated token usage for the run (research + extraction).

---

### durationMs

> **durationMs**: `number`

Defined in: [types/isolatedAgent.ts:329](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L329)

Wall-clock duration of this call (ms).

---

### extractionSource?

> `optional` **extractionSource?**: `string`

Defined in: [types/isolatedAgent.ts:331](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L331)

Present when extraction fell back through the recovery ladder.

---

### extractionError?

> `optional` **extractionError?**: `string`

Defined in: [types/isolatedAgent.ts:333](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L333)

Extraction/validation error summary when data is a mechanical digest.

---

### handle?

> `optional` **handle?**: `string`

Defined in: [types/isolatedAgent.ts:336](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L336)

Resume handle (status "in_progress" only).

---

### leg?

> `optional` **leg?**: [`AgentRunLegInfo`](AgentRunLegInfo.md)

Defined in: [types/isolatedAgent.ts:338](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L338)

This leg's accounting.

---

### delta?

> `optional` **delta?**: `string`[]

Defined in: [types/isolatedAgent.ts:340](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L340)

One-line query→outcome summaries for this leg.

---

### nextPlan?

> `optional` **nextPlan?**: `string`

Defined in: [types/isolatedAgent.ts:342](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L342)

The worker's own stated intent for the next leg.

---

### wasteSignals?

> `optional` **wasteSignals?**: `string`[]

Defined in: [types/isolatedAgent.ts:344](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L344)

Tripped waste signatures, if any.

---

### budget?

> `optional` **budget?**: [`AgentRunBudget`](AgentRunBudget.md)

Defined in: [types/isolatedAgent.ts:346](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L346)

Cumulative budget accounting.
