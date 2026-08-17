[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolCall

# Type Alias: SageMakerStreamingToolCall

> **SageMakerStreamingToolCall** = `object`

Defined in: [types/providers.ts:1622](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1622)

Streaming tool call information (Phase 2.3)

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1624](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1624)

Tool call identifier

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:1626](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1626)

Tool/function name

---

### arguments?

> `optional` **arguments?**: `string`

Defined in: [types/providers.ts:1628](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1628)

Partial or complete arguments as JSON string

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1630](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1630)

Tool call type

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1632](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1632)

Indicates if this tool call is complete

---

### argumentsDelta?

> `optional` **argumentsDelta?**: `string`

Defined in: [types/providers.ts:1634](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1634)

Delta text for incremental argument building
