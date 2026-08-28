[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolCall

# Type Alias: SageMakerStreamingToolCall

> **SageMakerStreamingToolCall** = `object`

Defined in: [types/providers.ts:1587](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1587)

Streaming tool call information (Phase 2.3)

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1589](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1589)

Tool call identifier

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:1591](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1591)

Tool/function name

---

### arguments?

> `optional` **arguments?**: `string`

Defined in: [types/providers.ts:1593](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1593)

Partial or complete arguments as JSON string

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1595](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1595)

Tool call type

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1597](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1597)

Indicates if this tool call is complete

---

### argumentsDelta?

> `optional` **argumentsDelta?**: `string`

Defined in: [types/providers.ts:1599](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1599)

Delta text for incremental argument building
