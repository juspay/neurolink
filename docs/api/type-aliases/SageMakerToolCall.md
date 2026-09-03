[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolCall

# Type Alias: SageMakerToolCall

> **SageMakerToolCall** = `object`

Defined in: [types/providers.ts:1575](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1575)

Tool call information for function calling

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1577](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1577)

Tool call identifier

---

### name

> **name**: `string`

Defined in: [types/providers.ts:1579](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1579)

Tool/function name

---

### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1581](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1581)

Tool arguments as JSON object

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1583](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1583)

Tool call type
