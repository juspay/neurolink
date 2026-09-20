[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextRelevanceResult

# Type Alias: ContextRelevanceResult

> **ContextRelevanceResult** = `object`

Defined in: [types/context.ts:1062](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1062)

What the relevance stage concluded.

## Properties

### messages

> **messages**: [`ChatMessage`](ChatMessage.md)[]

Defined in: [types/context.ts:1064](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1064)

The surviving messages, in their original order.

---

### droppedIndices

> **droppedIndices**: `number`[]

Defined in: [types/context.ts:1066](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1066)

Indices into the ORIGINAL array that were dropped.

---

### askedCount

> **askedCount**: `number`

Defined in: [types/context.ts:1068](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1068)

How many messages were asked about.

---

### answeredCount

> **answeredCount**: `number`

Defined in: [types/context.ts:1070](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1070)

How many came back with a usable, confident answer.

---

### model

> **model**: `string`

Defined in: [types/context.ts:1072](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1072)

Resolved decision model id, for telemetry.

---

### latencyMs

> **latencyMs**: `number`

Defined in: [types/context.ts:1074](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1074)

Round trip in milliseconds.
