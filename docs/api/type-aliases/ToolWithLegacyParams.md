[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolWithLegacyParams

# Type Alias: ToolWithLegacyParams

> **ToolWithLegacyParams** = `object`

Defined in: [types/providers.ts:2195](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2195)

Represents an AI SDK Tool that may carry a legacy `parameters` field
(from AI SDK v3/v4) in addition to the current `inputSchema`.

## Properties

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2196](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2196)

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

Defined in: [types/providers.ts:2197](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2197)

---

### execute?

> `optional` **execute?**: (...`args`) => `unknown`

Defined in: [types/providers.ts:2198](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2198)

#### Parameters

##### args

...`unknown`[]

#### Returns

`unknown`

---

### parameters?

> `optional` **parameters?**: `unknown`

Defined in: [types/providers.ts:2200](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2200)

Legacy field from AI SDK v3/v4
