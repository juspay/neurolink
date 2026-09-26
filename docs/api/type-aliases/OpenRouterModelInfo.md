[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenRouterModelInfo

# Type Alias: OpenRouterModelInfo

> **OpenRouterModelInfo** = `object`

Defined in: [types/providers.ts:2074](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2074)

OpenRouter model information from /api/v1/models endpoint

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:2076](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2076)

Model ID in format 'provider/model-name'

---

### supported_parameters?

> `optional` **supported_parameters?**: `string`[]

Defined in: [types/providers.ts:2078](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2078)

Supported parameters (e.g., 'tools', 'temperature')

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:2080](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2080)

Model name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2082](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2082)

Model description

---

### pricing?

> `optional` **pricing?**: `object`

Defined in: [types/providers.ts:2084](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2084)

Pricing information

#### prompt?

> `optional` **prompt?**: `string`

#### completion?

> `optional` **completion?**: `string`

---

### context_length?

> `optional` **context_length?**: `number`

Defined in: [types/providers.ts:2089](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2089)

Context length
