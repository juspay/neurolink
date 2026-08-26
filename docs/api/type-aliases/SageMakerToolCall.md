[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolCall

# Type Alias: SageMakerToolCall

> **SageMakerToolCall** = `object`

Defined in: [types/providers.ts:1554](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1554)

Tool call information for function calling

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1556](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1556)

Tool call identifier

---

### name

> **name**: `string`

Defined in: [types/providers.ts:1558](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1558)

Tool/function name

---

### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1560](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1560)

Tool arguments as JSON object

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1562](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1562)

Tool call type
