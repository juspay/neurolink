[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoyageEmbeddingsResponse

# Type Alias: VoyageEmbeddingsResponse

> **VoyageEmbeddingsResponse** = `object`

Defined in: [types/providers.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L262)

Voyage AI /embeddings response shape.

## Properties

### object

> **object**: `"list"`

Defined in: [types/providers.ts:263](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L263)

---

### data

> **data**: `object`[]

Defined in: [types/providers.ts:264](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L264)

#### object

> **object**: `"embedding"`

#### embedding

> **embedding**: `number`[]

#### index

> **index**: `number`

---

### model

> **model**: `string`

Defined in: [types/providers.ts:265](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L265)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L266)

#### total_tokens?

> `optional` **total_tokens?**: `number`
