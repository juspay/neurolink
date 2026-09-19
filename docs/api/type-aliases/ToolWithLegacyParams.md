[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolWithLegacyParams

# Type Alias: ToolWithLegacyParams

> **ToolWithLegacyParams** = `object`

Defined in: [types/providers.ts:2138](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2138)

Represents an AI SDK Tool that may carry a legacy `parameters` field
(from AI SDK v3/v4) in addition to the current `inputSchema`.

## Properties

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2139](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2139)

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/providers.ts:2140](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2140)

---

### execute?

> `optional` **execute?**: (...`args`) => `unknown`

Defined in: [types/providers.ts:2141](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2141)

#### Parameters

##### args

...`unknown`[]

#### Returns

`unknown`

---

### parameters?

> `optional` **parameters?**: `unknown`

Defined in: [types/providers.ts:2143](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2143)

Legacy field from AI SDK v3/v4
