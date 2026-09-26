[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolCall

# Type Alias: SageMakerToolCall

> **SageMakerToolCall** = `object`

Defined in: [types/providers.ts:1636](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1636)

Tool call information for function calling

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1638](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1638)

Tool call identifier

---

### name

> **name**: `string`

Defined in: [types/providers.ts:1640](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1640)

Tool/function name

---

### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1642](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1642)

Tool arguments as JSON object

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1644](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1644)

Tool call type
