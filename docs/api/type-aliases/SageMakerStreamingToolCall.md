[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolCall

# Type Alias: SageMakerStreamingToolCall

> **SageMakerStreamingToolCall** = `object`

Defined in: [types/providers.ts:1597](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1597)

Streaming tool call information (Phase 2.3)

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1599](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1599)

Tool call identifier

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:1601](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1601)

Tool/function name

---

### arguments?

> `optional` **arguments?**: `string`

Defined in: [types/providers.ts:1603](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1603)

Partial or complete arguments as JSON string

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1605](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1605)

Tool call type

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1607](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1607)

Indicates if this tool call is complete

---

### argumentsDelta?

> `optional` **argumentsDelta?**: `string`

Defined in: [types/providers.ts:1609](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1609)

Delta text for incremental argument building
