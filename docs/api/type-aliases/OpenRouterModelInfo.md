[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenRouterModelInfo

# Type Alias: OpenRouterModelInfo

> **OpenRouterModelInfo** = `object`

Defined in: [types/providers.ts:2065](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2065)

OpenRouter model information from /api/v1/models endpoint

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:2067](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2067)

Model ID in format 'provider/model-name'

---

### supported_parameters?

> `optional` **supported_parameters?**: `string`[]

Defined in: [types/providers.ts:2069](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2069)

Supported parameters (e.g., 'tools', 'temperature')

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:2071](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2071)

Model name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2073](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2073)

Model description

---

### pricing?

> `optional` **pricing?**: `object`

Defined in: [types/providers.ts:2075](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2075)

Pricing information

#### prompt?

> `optional` **prompt?**: `string`

#### completion?

> `optional` **completion?**: `string`

---

### context_length?

> `optional` **context_length?**: `number`

Defined in: [types/providers.ts:2080](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2080)

Context length
