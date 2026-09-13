[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolCall

# Type Alias: SageMakerStreamingToolCall

> **SageMakerStreamingToolCall** = `object`

Defined in: [types/providers.ts:1602](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1602)

Streaming tool call information (Phase 2.3)

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1604](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1604)

Tool call identifier

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:1606](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1606)

Tool/function name

---

### arguments?

> `optional` **arguments?**: `string`

Defined in: [types/providers.ts:1608](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1608)

Partial or complete arguments as JSON string

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1610](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1610)

Tool call type

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1612](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1612)

Indicates if this tool call is complete

---

### argumentsDelta?

> `optional` **argumentsDelta?**: `string`

Defined in: [types/providers.ts:1614](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1614)

Delta text for incremental argument building
