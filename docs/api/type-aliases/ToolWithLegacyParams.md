[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolWithLegacyParams

# Type Alias: ToolWithLegacyParams

> **ToolWithLegacyParams** = `object`

Defined in: [types/providers.ts:2169](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2169)

Represents an AI SDK Tool that may carry a legacy `parameters` field
(from AI SDK v3/v4) in addition to the current `inputSchema`.

## Properties

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2170](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2170)

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/providers.ts:2171](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2171)

---

### execute?

> `optional` **execute?**: (...`args`) => `unknown`

Defined in: [types/providers.ts:2172](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2172)

#### Parameters

##### args

...`unknown`[]

#### Returns

`unknown`

---

### parameters?

> `optional` **parameters?**: `unknown`

Defined in: [types/providers.ts:2174](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2174)

Legacy field from AI SDK v3/v4
