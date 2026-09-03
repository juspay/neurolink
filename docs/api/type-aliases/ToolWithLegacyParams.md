[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolWithLegacyParams

# Type Alias: ToolWithLegacyParams

> **ToolWithLegacyParams** = `object`

Defined in: [types/providers.ts:2135](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2135)

Represents an AI SDK Tool that may carry a legacy `parameters` field
(from AI SDK v3/v4) in addition to the current `inputSchema`.

## Properties

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2136](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2136)

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/providers.ts:2137](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2137)

---

### execute?

> `optional` **execute?**: (...`args`) => `unknown`

Defined in: [types/providers.ts:2138](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2138)

#### Parameters

##### args

...`unknown`[]

#### Returns

`unknown`

---

### parameters?

> `optional` **parameters?**: `unknown`

Defined in: [types/providers.ts:2140](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2140)

Legacy field from AI SDK v3/v4
