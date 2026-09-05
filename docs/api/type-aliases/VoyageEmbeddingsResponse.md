[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VoyageEmbeddingsResponse

# Type Alias: VoyageEmbeddingsResponse

> **VoyageEmbeddingsResponse** = `object`

Defined in: [types/providers.ts:246](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L246)

Voyage AI /embeddings response shape.

## Properties

### object

> **object**: `"list"`

Defined in: [types/providers.ts:247](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L247)

---

### data

> **data**: `object`[]

Defined in: [types/providers.ts:248](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L248)

#### object

> **object**: `"embedding"`

#### embedding

> **embedding**: `number`[]

#### index

> **index**: `number`

---

### model

> **model**: `string`

Defined in: [types/providers.ts:249](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L249)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:250](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L250)

#### total_tokens?

> `optional` **total_tokens?**: `number`
