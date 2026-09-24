[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolCall

# Type Alias: SageMakerToolCall

> **SageMakerToolCall** = `object`

Defined in: [types/providers.ts:1648](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1648)

Tool call information for function calling

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1650](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1650)

Tool call identifier

---

### name

> **name**: `string`

Defined in: [types/providers.ts:1652](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1652)

Tool/function name

---

### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1654](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1654)

Tool arguments as JSON object

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1656](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1656)

Tool call type
