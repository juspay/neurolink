[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoyageEmbeddingsResponse

# Type Alias: VoyageEmbeddingsResponse

> **VoyageEmbeddingsResponse** = `object`

Defined in: [types/providers.ts:240](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L240)

Voyage AI /embeddings response shape.

## Properties

### object

> **object**: `"list"`

Defined in: [types/providers.ts:241](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L241)

---

### data

> **data**: `object`[]

Defined in: [types/providers.ts:242](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L242)

#### object

> **object**: `"embedding"`

#### embedding

> **embedding**: `number`[]

#### index

> **index**: `number`

---

### model

> **model**: `string`

Defined in: [types/providers.ts:243](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L243)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:244](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L244)

#### total_tokens?

> `optional` **total_tokens?**: `number`
