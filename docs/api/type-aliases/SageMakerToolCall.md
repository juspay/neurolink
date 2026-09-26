[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolCall

# Type Alias: SageMakerToolCall

> **SageMakerToolCall** = `object`

Defined in: [types/providers.ts:1655](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1655)

Tool call information for function calling

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1657](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1657)

Tool call identifier

---

### name

> **name**: `string`

Defined in: [types/providers.ts:1659](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1659)

Tool/function name

---

### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1661](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1661)

Tool arguments as JSON object

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1663](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1663)

Tool call type
