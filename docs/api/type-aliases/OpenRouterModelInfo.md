[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenRouterModelInfo

# Type Alias: OpenRouterModelInfo

> **OpenRouterModelInfo** = `object`

Defined in: [types/providers.ts:2014](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2014)

OpenRouter model information from /api/v1/models endpoint

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:2016](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2016)

Model ID in format 'provider/model-name'

---

### supported_parameters?

> `optional` **supported_parameters?**: `string`[]

Defined in: [types/providers.ts:2018](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2018)

Supported parameters (e.g., 'tools', 'temperature')

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:2020](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2020)

Model name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2022](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2022)

Model description

---

### pricing?

> `optional` **pricing?**: `object`

Defined in: [types/providers.ts:2024](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2024)

Pricing information

#### prompt?

> `optional` **prompt?**: `string`

#### completion?

> `optional` **completion?**: `string`

---

### context_length?

> `optional` **context_length?**: `number`

Defined in: [types/providers.ts:2029](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2029)

Context length
