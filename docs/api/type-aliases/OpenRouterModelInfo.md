[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenRouterModelInfo

# Type Alias: OpenRouterModelInfo

> **OpenRouterModelInfo** = `object`

Defined in: [types/providers.ts:2009](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2009)

OpenRouter model information from /api/v1/models endpoint

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:2011](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2011)

Model ID in format 'provider/model-name'

---

### supported_parameters?

> `optional` **supported_parameters?**: `string`[]

Defined in: [types/providers.ts:2013](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2013)

Supported parameters (e.g., 'tools', 'temperature')

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:2015](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2015)

Model name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2017](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2017)

Model description

---

### pricing?

> `optional` **pricing?**: `object`

Defined in: [types/providers.ts:2019](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2019)

Pricing information

#### prompt?

> `optional` **prompt?**: `string`

#### completion?

> `optional` **completion?**: `string`

---

### context_length?

> `optional` **context_length?**: `number`

Defined in: [types/providers.ts:2024](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2024)

Context length
