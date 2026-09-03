[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoyageEmbeddingsResponse

# Type Alias: VoyageEmbeddingsResponse

> **VoyageEmbeddingsResponse** = `object`

Defined in: [types/providers.ts:245](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L245)

Voyage AI /embeddings response shape.

## Properties

### object

> **object**: `"list"`

Defined in: [types/providers.ts:246](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L246)

---

### data

> **data**: `object`[]

Defined in: [types/providers.ts:247](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L247)

#### object

> **object**: `"embedding"`

#### embedding

> **embedding**: `number`[]

#### index

> **index**: `number`

---

### model

> **model**: `string`

Defined in: [types/providers.ts:248](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L248)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:249](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L249)

#### total_tokens?

> `optional` **total_tokens?**: `number`
