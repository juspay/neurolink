[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenRouterModelInfo

# Type Alias: OpenRouterModelInfo

> **OpenRouterModelInfo** = `object`

Defined in: [types/providers.ts:1971](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1971)

OpenRouter model information from /api/v1/models endpoint

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:1973](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1973)

Model ID in format 'provider/model-name'

---

### supported_parameters?

> `optional` **supported_parameters?**: `string`[]

Defined in: [types/providers.ts:1975](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1975)

Supported parameters (e.g., 'tools', 'temperature')

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:1977](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1977)

Model name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:1979](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1979)

Model description

---

### pricing?

> `optional` **pricing?**: `object`

Defined in: [types/providers.ts:1981](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1981)

Pricing information

#### prompt?

> `optional` **prompt?**: `string`

#### completion?

> `optional` **completion?**: `string`

---

### context_length?

> `optional` **context_length?**: `number`

Defined in: [types/providers.ts:1986](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1986)

Context length
