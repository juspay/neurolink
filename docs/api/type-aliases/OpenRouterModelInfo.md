[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenRouterModelInfo

# Type Alias: OpenRouterModelInfo

> **OpenRouterModelInfo** = `object`

Defined in: [types/providers.ts:2002](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2002)

OpenRouter model information from /api/v1/models endpoint

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:2004](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2004)

Model ID in format 'provider/model-name'

---

### supported_parameters?

> `optional` **supported_parameters?**: `string`[]

Defined in: [types/providers.ts:2006](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2006)

Supported parameters (e.g., 'tools', 'temperature')

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:2008](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2008)

Model name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2010](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2010)

Model description

---

### pricing?

> `optional` **pricing?**: `object`

Defined in: [types/providers.ts:2012](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2012)

Pricing information

#### prompt?

> `optional` **prompt?**: `string`

#### completion?

> `optional` **completion?**: `string`

---

### context_length?

> `optional` **context_length?**: `number`

Defined in: [types/providers.ts:2017](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2017)

Context length
