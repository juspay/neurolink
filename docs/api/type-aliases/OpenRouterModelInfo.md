[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenRouterModelInfo

# Type Alias: OpenRouterModelInfo

> **OpenRouterModelInfo** = `object`

Defined in: [types/providers.ts:1988](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1988)

OpenRouter model information from /api/v1/models endpoint

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1990](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1990)

Model ID in format 'provider/model-name'

---

### supported_parameters?

> `optional` **supported_parameters?**: `string`[]

Defined in: [types/providers.ts:1992](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1992)

Supported parameters (e.g., 'tools', 'temperature')

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:1994](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1994)

Model name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:1996](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1996)

Model description

---

### pricing?

> `optional` **pricing?**: `object`

Defined in: [types/providers.ts:1998](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1998)

Pricing information

#### prompt?

> `optional` **prompt?**: `string`

#### completion?

> `optional` **completion?**: `string`

---

### context_length?

> `optional` **context_length?**: `number`

Defined in: [types/providers.ts:2003](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2003)

Context length
