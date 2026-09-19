[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolCall

# Type Alias: SageMakerStreamingToolCall

> **SageMakerStreamingToolCall** = `object`

Defined in: [types/providers.ts:1659](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1659)

Streaming tool call information (Phase 2.3)

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1661](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1661)

Tool call identifier

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:1663](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1663)

Tool/function name

---

### arguments?

> `optional` **arguments?**: `string`

Defined in: [types/providers.ts:1665](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1665)

Partial or complete arguments as JSON string

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1667](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1667)

Tool call type

---

### complete?

> `optional` **complete?**: `boolean`

Defined in: [types/providers.ts:1669](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1669)

Indicates if this tool call is complete

---

### argumentsDelta?

> `optional` **argumentsDelta?**: `string`

Defined in: [types/providers.ts:1671](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1671)

Delta text for incremental argument building
