[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolCall

# Type Alias: SageMakerStreamingToolCall

> **SageMakerStreamingToolCall** = `object`

Defined in: [types/providers.ts:1685](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1685)

Streaming tool call information (Phase 2.3)

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1687](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1687)

Tool call identifier

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:1689](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1689)

Tool/function name

---

### arguments?

> `optional` **arguments?**: `string`

Defined in: [types/providers.ts:1691](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1691)

Partial or complete arguments as JSON string

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1693](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1693)

Tool call type

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1695](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1695)

Indicates if this tool call is complete

---

### argumentsDelta?

> `optional` **argumentsDelta?**: `string`

Defined in: [types/providers.ts:1697](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1697)

Delta text for incremental argument building
