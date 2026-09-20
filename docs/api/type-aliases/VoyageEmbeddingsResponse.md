[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoyageEmbeddingsResponse

# Type Alias: VoyageEmbeddingsResponse

> **VoyageEmbeddingsResponse** = `object`

Defined in: [types/providers.ts:285](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L285)

Voyage AI /embeddings response shape.

## Properties

### object

> **object**: `"list"`

Defined in: [types/providers.ts:286](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L286)

---

### data

> **data**: `object`[]

Defined in: [types/providers.ts:287](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L287)

#### object

> **object**: `"embedding"`

#### embedding

> **embedding**: `number`[]

#### index

> **index**: `number`

---

### model

> **model**: `string`

Defined in: [types/providers.ts:288](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L288)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:289](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L289)

#### total_tokens?

> `optional` **total_tokens?**: `number`
