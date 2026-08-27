[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolCall

# Type Alias: SageMakerToolCall

> **SageMakerToolCall** = `object`

Defined in: [types/providers.ts:1555](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1555)

Tool call information for function calling

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1557](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1557)

Tool call identifier

---

### name

> **name**: `string`

Defined in: [types/providers.ts:1559](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1559)

Tool/function name

---

### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1561](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1561)

Tool arguments as JSON object

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1563](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1563)

Tool call type
