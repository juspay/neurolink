[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolCall

# Type Alias: SageMakerStreamingToolCall

> **SageMakerStreamingToolCall** = `object`

Defined in: [types/providers.ts:1605](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1605)

Streaming tool call information (Phase 2.3)

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1607](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1607)

Tool call identifier

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:1609](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1609)

Tool/function name

---

### arguments?

> `optional` **arguments?**: `string`

Defined in: [types/providers.ts:1611](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1611)

Partial or complete arguments as JSON string

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1613](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1613)

Tool call type

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1615](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1615)

Indicates if this tool call is complete

---

### argumentsDelta?

> `optional` **argumentsDelta?**: `string`

Defined in: [types/providers.ts:1617](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1617)

Delta text for incremental argument building
