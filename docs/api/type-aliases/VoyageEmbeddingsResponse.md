[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoyageEmbeddingsResponse

# Type Alias: VoyageEmbeddingsResponse

> **VoyageEmbeddingsResponse** = `object`

Defined in: [types/providers.ts:302](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L302)

Voyage AI /embeddings response shape.

## Properties

### object

> **object**: `"list"`

Defined in: [types/providers.ts:303](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L303)

---

### data

> **data**: `object`[]

Defined in: [types/providers.ts:304](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L304)

#### object

> **object**: `"embedding"`

#### embedding

> **embedding**: `number`[]

#### index

> **index**: `number`

---

### model

> **model**: `string`

Defined in: [types/providers.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L305)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:306](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L306)

#### total_tokens?

> `optional` **total_tokens?**: `number`
