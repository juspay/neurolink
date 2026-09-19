[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolCall

# Type Alias: SageMakerToolCall

> **SageMakerToolCall** = `object`

Defined in: [types/providers.ts:1597](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1597)

Tool call information for function calling

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1599](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1599)

Tool call identifier

---

### name

> **name**: `string`

Defined in: [types/providers.ts:1601](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1601)

Tool/function name

---

### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1603](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1603)

Tool arguments as JSON object

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1605](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1605)

Tool call type
