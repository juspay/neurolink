[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolCall

# Type Alias: SageMakerStreamingToolCall

> **SageMakerStreamingToolCall** = `object`

Defined in: [types/providers.ts:1658](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1658)

Streaming tool call information (Phase 2.3)

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1660](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1660)

Tool call identifier

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:1662](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1662)

Tool/function name

---

### arguments?

> `optional` **arguments?**: `string`

Defined in: [types/providers.ts:1664](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1664)

Partial or complete arguments as JSON string

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1666](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1666)

Tool call type

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1668](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1668)

Indicates if this tool call is complete

---

### argumentsDelta?

> `optional` **argumentsDelta?**: `string`

Defined in: [types/providers.ts:1670](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1670)

Delta text for incremental argument building
