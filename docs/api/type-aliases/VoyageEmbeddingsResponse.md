[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoyageEmbeddingsResponse

# Type Alias: VoyageEmbeddingsResponse

> **VoyageEmbeddingsResponse** = `object`

Defined in: [types/providers.ts:257](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L257)

Voyage AI /embeddings response shape.

## Properties

### object

> **object**: `"list"`

Defined in: [types/providers.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L258)

---

### data

> **data**: `object`[]

Defined in: [types/providers.ts:259](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L259)

#### object

> **object**: `"embedding"`

#### embedding

> **embedding**: `number`[]

#### index

> **index**: `number`

---

### model

> **model**: `string`

Defined in: [types/providers.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L260)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:261](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L261)

#### total_tokens?

> `optional` **total_tokens?**: `number`
