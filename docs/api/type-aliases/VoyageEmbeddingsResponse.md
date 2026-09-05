[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoyageEmbeddingsResponse

# Type Alias: VoyageEmbeddingsResponse

> **VoyageEmbeddingsResponse** = `object`

Defined in: [types/providers.ts:264](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L264)

Voyage AI /embeddings response shape.

## Properties

### object

> **object**: `"list"`

Defined in: [types/providers.ts:265](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L265)

---

### data

> **data**: `object`[]

Defined in: [types/providers.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L266)

#### object

> **object**: `"embedding"`

#### embedding

> **embedding**: `number`[]

#### index

> **index**: `number`

---

### model

> **model**: `string`

Defined in: [types/providers.ts:267](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L267)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:268](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L268)

#### total_tokens?

> `optional` **total_tokens?**: `number`
