[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenRouterModelInfo

# Type Alias: OpenRouterModelInfo

> **OpenRouterModelInfo** = `object`

Defined in: [types/providers.ts:2096](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2096)

OpenRouter model information from /api/v1/models endpoint

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:2098](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2098)

Model ID in format 'provider/model-name'

---

### supported_parameters?

> `optional` **supported_parameters?**: `string`[]

Defined in: [types/providers.ts:2100](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2100)

Supported parameters (e.g., 'tools', 'temperature')

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:2102](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2102)

Model name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2104](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2104)

Model description

---

### pricing?

> `optional` **pricing?**: `object`

Defined in: [types/providers.ts:2106](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2106)

Pricing information

#### prompt?

> `optional` **prompt?**: `string`

#### completion?

> `optional` **completion?**: `string`

---

### context_length?

> `optional` **context_length?**: `number`

Defined in: [types/providers.ts:2111](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2111)

Context length
