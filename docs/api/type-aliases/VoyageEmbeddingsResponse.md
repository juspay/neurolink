[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoyageEmbeddingsResponse

# Type Alias: VoyageEmbeddingsResponse

> **VoyageEmbeddingsResponse** = `object`

Defined in: [types/providers.ts:304](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L304)

Voyage AI /embeddings response shape.

## Properties

### object

> **object**: `"list"`

Defined in: [types/providers.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L305)

---

### data

> **data**: `object`[]

Defined in: [types/providers.ts:306](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L306)

#### object

> **object**: `"embedding"`

#### embedding

> **embedding**: `number`[]

#### index

> **index**: `number`

---

### model

> **model**: `string`

Defined in: [types/providers.ts:307](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L307)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:308](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L308)

#### total_tokens?

> `optional` **total_tokens?**: `number`
