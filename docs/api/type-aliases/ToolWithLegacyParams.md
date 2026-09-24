[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolWithLegacyParams

# Type Alias: ToolWithLegacyParams

> **ToolWithLegacyParams** = `object`

Defined in: [types/providers.ts:2188](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2188)

Represents an AI SDK Tool that may carry a legacy `parameters` field
(from AI SDK v3/v4) in addition to the current `inputSchema`.

## Properties

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2189](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2189)

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/providers.ts:2190](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2190)

---

### execute?

> `optional` **execute?**: (...`args`) => `unknown`

Defined in: [types/providers.ts:2191](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2191)

#### Parameters

##### args

...`unknown`[]

#### Returns

`unknown`

---

### parameters?

> `optional` **parameters?**: `unknown`

Defined in: [types/providers.ts:2193](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2193)

Legacy field from AI SDK v3/v4
