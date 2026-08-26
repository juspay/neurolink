[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolWithLegacyParams

# Type Alias: ToolWithLegacyParams

> **ToolWithLegacyParams** = `object`

Defined in: [types/providers.ts:2104](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2104)

Represents an AI SDK Tool that may carry a legacy `parameters` field
(from AI SDK v3/v4) in addition to the current `inputSchema`.

## Properties

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2105](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2105)

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/providers.ts:2106](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2106)

---

### execute?

> `optional` **execute?**: (...`args`) => `unknown`

Defined in: [types/providers.ts:2107](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2107)

#### Parameters

##### args

...`unknown`[]

#### Returns

`unknown`

---

### parameters?

> `optional` **parameters?**: `unknown`

Defined in: [types/providers.ts:2109](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2109)

Legacy field from AI SDK v3/v4
