[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolWithLegacyParams

# Type Alias: ToolWithLegacyParams

> **ToolWithLegacyParams** = `object`

Defined in: [types/providers.ts:2176](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2176)

Represents an AI SDK Tool that may carry a legacy `parameters` field
(from AI SDK v3/v4) in addition to the current `inputSchema`.

## Properties

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2177](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2177)

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/providers.ts:2178](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2178)

---

### execute?

> `optional` **execute?**: (...`args`) => `unknown`

Defined in: [types/providers.ts:2179](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2179)

#### Parameters

##### args

...`unknown`[]

#### Returns

`unknown`

---

### parameters?

> `optional` **parameters?**: `unknown`

Defined in: [types/providers.ts:2181](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2181)

Legacy field from AI SDK v3/v4
