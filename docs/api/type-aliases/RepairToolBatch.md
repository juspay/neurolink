[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RepairToolBatch

# Type Alias: RepairToolBatch

> **RepairToolBatch** = `object`

One contiguous tool batch: the run of `tool_call` messages emitted by a
single agent step, plus the run of `tool_result` messages that follows it.
A step with parallel tool calls writes every call before any result, so the
batch — not adjacency — is the unit that pairing and truncation operate on.
`endIndex` is exclusive.

## Properties

### calls

> **calls**: [`ChatMessage`](ChatMessage.md)[]

---

### results

> **results**: [`ChatMessage`](ChatMessage.md)[]

---

### endIndex

> **endIndex**: `number`
