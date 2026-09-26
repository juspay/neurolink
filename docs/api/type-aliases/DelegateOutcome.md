[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegateOutcome

# Type Alias: DelegateOutcome

> **DelegateOutcome** = `object`

A settled worker, claimed exactly once.

`summary` is bounded; `report` points at the COMPLETE report on disk. The
two are not alternatives — the summary is what the conversation carries, the
report is what the evidence lives in.

## Properties

### workerId

> **workerId**: `string`

---

### label

> **label**: `string`

Human label the spawn was given (defaults to the worker id).

---

### status

> **status**: [`AgentRunStatus`](AgentRunStatus.md)

Reused from the isolated-agent runner — no parallel taxonomy.

---

### ok

> **ok**: `boolean`

True for `completed` and `partial`: the worker produced usable evidence.

---

### summary

> **summary**: `string`

Bounded narrative for the conversation. Never the whole report.

---

### report

> **report**: [`BankedArtifactRef`](BankedArtifactRef.md)

The FULL report, always banked to a file.

---

### durationMs

> **durationMs**: `number`

---

### toolCallsUsed

> **toolCallsUsed**: `number`

---

### wasteSignals?

> `optional` **wasteSignals?**: `string`[]

Mechanical waste signatures the runner tripped, if any.

---

### handle?

> `optional` **handle?**: `string`

`continueAgent()` handle when the worker was cut short mid-investigation.

---

### error?

> `optional` **error?**: `string`

Why the worker failed, when it did.
