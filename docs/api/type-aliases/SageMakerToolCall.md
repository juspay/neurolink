[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolCall

# Type Alias: SageMakerToolCall

> **SageMakerToolCall** = `object`

Defined in: [types/providers.ts:1585](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1585)

Tool call information for function calling

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1587](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1587)

Tool call identifier

---

### name

> **name**: `string`

Defined in: [types/providers.ts:1589](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1589)

Tool/function name

---

### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1591](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1591)

Tool arguments as JSON object

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1593](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1593)

Tool call type
