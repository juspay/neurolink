[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolCall

# Type Alias: SageMakerToolCall

> **SageMakerToolCall** = `object`

Defined in: [types/providers.ts:1592](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1592)

Tool call information for function calling

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1594](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1594)

Tool call identifier

---

### name

> **name**: `string`

Defined in: [types/providers.ts:1596](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1596)

Tool/function name

---

### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1598](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1598)

Tool arguments as JSON object

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1600](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1600)

Tool call type
