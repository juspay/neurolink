[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenRouterModelInfo

# Type Alias: OpenRouterModelInfo

> **OpenRouterModelInfo** = `object`

Defined in: [types/providers.ts:1974](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1974)

OpenRouter model information from /api/v1/models endpoint

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1976](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1976)

Model ID in format 'provider/model-name'

---

### supported_parameters?

> `optional` **supported_parameters?**: `string`[]

Defined in: [types/providers.ts:1978](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1978)

Supported parameters (e.g., 'tools', 'temperature')

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:1980](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1980)

Model name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:1982](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1982)

Model description

---

### pricing?

> `optional` **pricing?**: `object`

Defined in: [types/providers.ts:1984](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1984)

Pricing information

#### prompt?

> `optional` **prompt?**: `string`

#### completion?

> `optional` **completion?**: `string`

---

### context_length?

> `optional` **context_length?**: `number`

Defined in: [types/providers.ts:1989](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1989)

Context length
