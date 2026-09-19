[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenRouterModelInfo

# Type Alias: OpenRouterModelInfo

> **OpenRouterModelInfo** = `object`

Defined in: [types/providers.ts:2046](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2046)

OpenRouter model information from /api/v1/models endpoint

## Properties

### id

> **id**: `string`

Defined in: [types/providers.ts:2048](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2048)

Model ID in format 'provider/model-name'

---

### supported_parameters?

> `optional` **supported_parameters?**: `string`[]

Defined in: [types/providers.ts:2050](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2050)

Supported parameters (e.g., 'tools', 'temperature')

---

### name?

> `optional` **name?**: `string`

Defined in: [types/providers.ts:2052](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2052)

Model name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/providers.ts:2054](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2054)

Model description

---

### pricing?

> `optional` **pricing?**: `object`

Defined in: [types/providers.ts:2056](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2056)

Pricing information

#### prompt?

> `optional` **prompt?**: `string`

#### completion?

> `optional` **completion?**: `string`

---

### context_length?

> `optional` **context_length?**: `number`

Defined in: [types/providers.ts:2061](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2061)

Context length
