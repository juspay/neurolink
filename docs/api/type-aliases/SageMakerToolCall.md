[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolCall

# Type Alias: SageMakerToolCall

> **SageMakerToolCall** = `object`

Defined in: [types/providers.ts:1629](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1629)

Tool call information for function calling

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1631](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1631)

Tool call identifier

---

### name

> **name**: `string`

Defined in: [types/providers.ts:1633](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1633)

Tool/function name

---

### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1635](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1635)

Tool arguments as JSON object

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1637](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1637)

Tool call type
