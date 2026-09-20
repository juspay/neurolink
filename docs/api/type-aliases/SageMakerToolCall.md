[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolCall

# Type Alias: SageMakerToolCall

> **SageMakerToolCall** = `object`

Defined in: [types/providers.ts:1628](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1628)

Tool call information for function calling

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1630](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1630)

Tool call identifier

---

### name

> **name**: `string`

Defined in: [types/providers.ts:1632](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1632)

Tool/function name

---

### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1634](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1634)

Tool arguments as JSON object

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1636](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1636)

Tool call type
