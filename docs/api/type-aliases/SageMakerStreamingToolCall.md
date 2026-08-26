[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolCall

# Type Alias: SageMakerStreamingToolCall

> **SageMakerStreamingToolCall** = `object`

Defined in: [types/providers.ts:1584](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1584)

Streaming tool call information (Phase 2.3)

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1586](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1586)

Tool call identifier

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:1588](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1588)

Tool/function name

---

### arguments?

> `optional` **arguments?**: `string`

Defined in: [types/providers.ts:1590](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1590)

Partial or complete arguments as JSON string

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1592](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1592)

Tool call type

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1594](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1594)

Indicates if this tool call is complete

---

### argumentsDelta?

> `optional` **argumentsDelta?**: `string`

Defined in: [types/providers.ts:1596](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1596)

Delta text for incremental argument building
