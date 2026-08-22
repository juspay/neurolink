[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoyageEmbeddingsResponse

# Type Alias: VoyageEmbeddingsResponse

> **VoyageEmbeddingsResponse** = `object`

Defined in: [types/providers.ts:236](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L236)

Voyage AI /embeddings response shape.

## Properties

### object

> **object**: `"list"`

Defined in: [types/providers.ts:237](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L237)

---

### data

> **data**: `object`[]

Defined in: [types/providers.ts:238](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L238)

#### object

> **object**: `"embedding"`

#### embedding

> **embedding**: `number`[]

#### index

> **index**: `number`

---

### model

> **model**: `string`

Defined in: [types/providers.ts:239](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L239)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:240](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L240)

#### total_tokens?

> `optional` **total_tokens?**: `number`
