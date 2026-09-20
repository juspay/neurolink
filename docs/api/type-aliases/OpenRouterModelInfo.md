[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenRouterModelInfo

# Type Alias: OpenRouterModelInfo

> **OpenRouterModelInfo** = `object`

Defined in: [types/providers.ts:2045](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2045)

OpenRouter model information from /api/v1/models endpoint

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:2047](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2047)

Model ID in format 'provider/model-name'

---

### supported_parameters?

> `optional` **supported_parameters?**: `string`[]

Defined in: [types/providers.ts:2049](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2049)

Supported parameters (e.g., 'tools', 'temperature')

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:2051](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2051)

Model name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2053](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2053)

Model description

---

### pricing?

> `optional` **pricing?**: `object`

Defined in: [types/providers.ts:2055](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2055)

Pricing information

#### prompt?

> `optional` **prompt?**: `string`

#### completion?

> `optional` **completion?**: `string`

---

### context_length?

> `optional` **context_length?**: `number`

Defined in: [types/providers.ts:2060](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2060)

Context length
