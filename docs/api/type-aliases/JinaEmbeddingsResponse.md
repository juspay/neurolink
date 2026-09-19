[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JinaEmbeddingsResponse

# Type Alias: JinaEmbeddingsResponse

> **JinaEmbeddingsResponse** = `object`

Defined in: [types/providers.ts:276](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L276)

Jina AI /embeddings response shape (compatible with OpenAI's shape).

## Properties

### object?

> `optional` **object?**: `string`

Defined in: [types/providers.ts:277](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L277)

---

### data

> **data**: `object`[]

Defined in: [types/providers.ts:278](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L278)

#### object?

> `optional` **object?**: `string`

#### embedding

> **embedding**: `number`[]

#### index

> **index**: `number`

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:279](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L279)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:280](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L280)

#### total_tokens?

> `optional` **total_tokens?**: `number`

#### prompt_tokens?

> `optional` **prompt_tokens?**: `number`
