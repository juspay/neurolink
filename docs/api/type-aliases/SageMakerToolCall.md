[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerToolCall

# Type Alias: SageMakerToolCall

> **SageMakerToolCall** = `object`

Defined in: [types/providers.ts:1572](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1572)

Tool call information for function calling

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1574](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1574)

Tool call identifier

---

### name

> **name**: `string`

Defined in: [types/providers.ts:1576](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1576)

Tool/function name

---

### arguments

> **arguments**: `Record`\<`string`, `unknown`\>

Defined in: [types/providers.ts:1578](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1578)

Tool arguments as JSON object

---

### type

> **type**: `"function"`

Defined in: [types/providers.ts:1580](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1580)

Tool call type
