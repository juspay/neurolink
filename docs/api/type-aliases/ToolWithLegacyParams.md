[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolWithLegacyParams

# Type Alias: ToolWithLegacyParams

> **ToolWithLegacyParams** = `object`

Defined in: [types/providers.ts:2142](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2142)

Represents an AI SDK Tool that may carry a legacy `parameters` field
(from AI SDK v3/v4) in addition to the current `inputSchema`.

## Properties

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2143](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2143)

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/providers.ts:2144](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2144)

---

### execute?

> `optional` **execute?**: (...`args`) => `unknown`

Defined in: [types/providers.ts:2145](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2145)

#### Parameters

##### args

...`unknown`[]

#### Returns

`unknown`

---

### parameters?

> `optional` **parameters?**: `unknown`

Defined in: [types/providers.ts:2147](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2147)

Legacy field from AI SDK v3/v4
