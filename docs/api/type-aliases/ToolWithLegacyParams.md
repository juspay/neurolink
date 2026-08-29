[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolWithLegacyParams

# Type Alias: ToolWithLegacyParams

> **ToolWithLegacyParams** = `object`

Defined in: [types/providers.ts:2117](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2117)

Represents an AI SDK Tool that may carry a legacy `parameters` field
(from AI SDK v3/v4) in addition to the current `inputSchema`.

## Properties

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2118](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2118)

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/providers.ts:2119](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2119)

---

### execute?

> `optional` **execute?**: (...`args`) => `unknown`

Defined in: [types/providers.ts:2120](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2120)

#### Parameters

##### args

...`unknown`[]

#### Returns

`unknown`

---

### parameters?

> `optional` **parameters?**: `unknown`

Defined in: [types/providers.ts:2122](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2122)

Legacy field from AI SDK v3/v4
