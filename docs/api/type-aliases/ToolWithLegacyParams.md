[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolWithLegacyParams

# Type Alias: ToolWithLegacyParams

> **ToolWithLegacyParams** = `object`

Defined in: [types/providers.ts:2120](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2120)

Represents an AI SDK Tool that may carry a legacy `parameters` field
(from AI SDK v3/v4) in addition to the current `inputSchema`.

## Properties

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2121](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2121)

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/providers.ts:2122](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2122)

---

### execute?

> `optional` **execute?**: (...`args`) => `unknown`

Defined in: [types/providers.ts:2123](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2123)

#### Parameters

##### args

...`unknown`[]

#### Returns

`unknown`

---

### parameters?

> `optional` **parameters?**: `unknown`

Defined in: [types/providers.ts:2125](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2125)

Legacy field from AI SDK v3/v4
