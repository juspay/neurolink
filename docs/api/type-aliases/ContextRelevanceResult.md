[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextRelevanceResult

# Type Alias: ContextRelevanceResult

> **ContextRelevanceResult** = `object`

What the relevance stage concluded.

## Properties

### messages

> **messages**: [`ChatMessage`](ChatMessage.md)[]

The surviving messages, in their original order.

---

### droppedIndices

> **droppedIndices**: `number`[]

Indices into the ORIGINAL array that were dropped.

---

### askedCount

> **askedCount**: `number`

How many messages were asked about.

---

### answeredCount

> **answeredCount**: `number`

How many came back with a usable, confident answer.

---

### model

> **model**: `string`

Resolved decision model id, for telemetry.

---

### latencyMs

> **latencyMs**: `number`

Round trip in milliseconds.
