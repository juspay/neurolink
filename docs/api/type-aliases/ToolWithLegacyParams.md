[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolWithLegacyParams

# Type Alias: ToolWithLegacyParams

> **ToolWithLegacyParams** = `object`

Defined in: [types/providers.ts:2112](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2112)

Represents an AI SDK Tool that may carry a legacy `parameters` field
(from AI SDK v3/v4) in addition to the current `inputSchema`.

## Properties

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2113](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2113)

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/providers.ts:2114](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2114)

---

### execute?

> `optional` **execute?**: (...`args`) => `unknown`

Defined in: [types/providers.ts:2115](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2115)

#### Parameters

##### args

...`unknown`[]

#### Returns

`unknown`

---

### parameters?

> `optional` **parameters?**: `unknown`

Defined in: [types/providers.ts:2117](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2117)

Legacy field from AI SDK v3/v4
