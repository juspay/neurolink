[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolWithLegacyParams

# Type Alias: ToolWithLegacyParams

> **ToolWithLegacyParams** = `object`

Represents an AI SDK Tool that may carry a legacy `parameters` field
(from AI SDK v3/v4) in addition to the current `inputSchema`.

## Properties

### description?

> `optional` **description?**: `string`

---

### inputSchema?

> `optional` **inputSchema?**: `unknown`

---

### execute?

> `optional` **execute?**: (...`args`) => `unknown`

#### Parameters

##### args

...`unknown`[]

#### Returns

`unknown`

---

### parameters?

> `optional` **parameters?**: `unknown`

Legacy field from AI SDK v3/v4
