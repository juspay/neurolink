[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolWithLegacyParams

# Type Alias: ToolWithLegacyParams

> **ToolWithLegacyParams** = `object`

Defined in: [types/providers.ts:2125](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2125)

Represents an AI SDK Tool that may carry a legacy `parameters` field
(from AI SDK v3/v4) in addition to the current `inputSchema`.

## Properties

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2126](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2126)

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/providers.ts:2127](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2127)

---

### execute?

> `optional` **execute?**: (...`args`) => `unknown`

Defined in: [types/providers.ts:2128](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2128)

#### Parameters

##### args

...`unknown`[]

#### Returns

`unknown`

---

### parameters?

> `optional` **parameters?**: `unknown`

Defined in: [types/providers.ts:2130](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2130)

Legacy field from AI SDK v3/v4
