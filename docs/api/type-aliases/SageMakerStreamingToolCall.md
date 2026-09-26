[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolCall

# Type Alias: SageMakerStreamingToolCall

> **SageMakerStreamingToolCall** = `object`

Defined in: [types/providers.ts:1666](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1666)

Streaming tool call information (Phase 2.3)

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1668](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1668)

Tool call identifier

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:1670](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1670)

Tool/function name

---

### arguments?

> `optional` **arguments?**: `string`

Defined in: [types/providers.ts:1672](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1672)

Partial or complete arguments as JSON string

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1674](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1674)

Tool call type

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1676](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1676)

Indicates if this tool call is complete

---

### argumentsDelta?

> `optional` **argumentsDelta?**: `string`

Defined in: [types/providers.ts:1678](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1678)

Delta text for incremental argument building
