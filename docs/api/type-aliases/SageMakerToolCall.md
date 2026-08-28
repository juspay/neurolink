[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolCall

# Type Alias: SageMakerToolCall

> **SageMakerToolCall** = `object`

Defined in: [types/providers.ts:1557](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1557)

Tool call information for function calling

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1559](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1559)

Tool call identifier

---

### name

> **name**: `string`

Defined in: [types/providers.ts:1561](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1561)

Tool/function name

---

### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1563](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1563)

Tool arguments as JSON object

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1565](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1565)

Tool call type
