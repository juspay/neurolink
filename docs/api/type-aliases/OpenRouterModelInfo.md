[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenRouterModelInfo

# Type Alias: OpenRouterModelInfo

> **OpenRouterModelInfo** = `object`

Defined in: [types/providers.ts:1989](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1989)

OpenRouter model information from /api/v1/models endpoint

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1991](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1991)

Model ID in format 'provider/model-name'

---

### supported_parameters?

> `optional` **supported_parameters?**: `string`[]

Defined in: [types/providers.ts:1993](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1993)

Supported parameters (e.g., 'tools', 'temperature')

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:1995](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1995)

Model name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:1997](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1997)

Model description

---

### pricing?

> `optional` **pricing?**: `object`

Defined in: [types/providers.ts:1999](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1999)

Pricing information

#### prompt?

> `optional` **prompt?**: `string`

#### completion?

> `optional` **completion?**: `string`

---

### context_length?

> `optional` **context_length?**: `number`

Defined in: [types/providers.ts:2004](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2004)

Context length
