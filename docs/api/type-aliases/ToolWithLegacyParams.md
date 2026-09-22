[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolWithLegacyParams

# Type Alias: ToolWithLegacyParams

> **ToolWithLegacyParams** = `object`

Defined in: [types/providers.ts:2173](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2173)

Represents an AI SDK Tool that may carry a legacy `parameters` field
(from AI SDK v3/v4) in addition to the current `inputSchema`.

## Properties

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2174](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2174)

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/providers.ts:2175](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2175)

---

### execute?

> `optional` **execute?**: (...`args`) => `unknown`

Defined in: [types/providers.ts:2176](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2176)

#### Parameters

##### args

...`unknown`[]

#### Returns

`unknown`

---

### parameters?

> `optional` **parameters?**: `unknown`

Defined in: [types/providers.ts:2178](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2178)

Legacy field from AI SDK v3/v4
