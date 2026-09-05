[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolCall

# Type Alias: SageMakerStreamingToolCall

> **SageMakerStreamingToolCall** = `object`

Defined in: [types/providers.ts:1600](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1600)

Streaming tool call information (Phase 2.3)

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1602](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1602)

Tool call identifier

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:1604](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1604)

Tool/function name

---

### arguments?

> `optional` **arguments?**: `string`

Defined in: [types/providers.ts:1606](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1606)

Partial or complete arguments as JSON string

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1608](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1608)

Tool call type

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1610](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1610)

Indicates if this tool call is complete

---

### argumentsDelta?

> `optional` **argumentsDelta?**: `string`

Defined in: [types/providers.ts:1612](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1612)

Delta text for incremental argument building
