[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolWithLegacyParams

# Type Alias: ToolWithLegacyParams

> **ToolWithLegacyParams** = `object`

Defined in: [types/providers.ts:2219](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2219)

Represents an AI SDK Tool that may carry a legacy `parameters` field
(from AI SDK v3/v4) in addition to the current `inputSchema`.

## Properties

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2220](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2220)

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/providers.ts:2221](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2221)

---

### execute?

> `optional` **execute?**: (...`args`) => `unknown`

Defined in: [types/providers.ts:2222](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2222)

#### Parameters

##### args

...`unknown`[]

#### Returns

`unknown`

---

### parameters?

> `optional` **parameters?**: `unknown`

Defined in: [types/providers.ts:2224](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2224)

Legacy field from AI SDK v3/v4
