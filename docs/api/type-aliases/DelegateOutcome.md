[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegateOutcome

# Type Alias: DelegateOutcome

> **DelegateOutcome** = `object`

Defined in: [types/delegation.ts:72](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L72)

A settled worker, claimed exactly once.

`summary` is bounded; `report` points at the COMPLETE report on disk. The
two are not alternatives — the summary is what the conversation carries, the
report is what the evidence lives in.

## Properties

### workerId

> **workerId**: `string`

Defined in: [types/delegation.ts:73](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L73)

---

### label

> **label**: `string`

Defined in: [types/delegation.ts:75](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L75)

Human label the spawn was given (defaults to the worker id).

---

### status

> **status**: [`AgentRunStatus`](AgentRunStatus.md)

Defined in: [types/delegation.ts:77](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L77)

Reused from the isolated-agent runner — no parallel taxonomy.

---

### ok

> **ok**: `boolean`

Defined in: [types/delegation.ts:79](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L79)

True for `completed` and `partial`: the worker produced usable evidence.

---

### summary

> **summary**: `string`

Defined in: [types/delegation.ts:81](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L81)

Bounded narrative for the conversation. Never the whole report.

---

### report

> **report**: [`BankedArtifactRef`](BankedArtifactRef.md)

Defined in: [types/delegation.ts:83](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L83)

The FULL report, always banked to a file.

---

### durationMs

> **durationMs**: `number`

Defined in: [types/delegation.ts:84](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L84)

---

### toolCallsUsed

> **toolCallsUsed**: `number`

Defined in: [types/delegation.ts:85](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L85)

---

### wasteSignals?

> `optional` **wasteSignals?**: `string`[]

Defined in: [types/delegation.ts:87](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L87)

Mechanical waste signatures the runner tripped, if any.

---

### handle?

> `optional` **handle?**: `string`

Defined in: [types/delegation.ts:89](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L89)

`continueAgent()` handle when the worker was cut short mid-investigation.

---

### error?

> `optional` **error?**: `string`

Defined in: [types/delegation.ts:91](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L91)

Why the worker failed, when it did.
