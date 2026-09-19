[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JinaEmbeddingsResponse

# Type Alias: JinaEmbeddingsResponse

> **JinaEmbeddingsResponse** = `object`

Defined in: [types/providers.ts:296](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L296)

Jina AI /embeddings response shape (compatible with OpenAI's shape).

## Properties

### object?

> `optional` **object?**: `string`

Defined in: [types/providers.ts:297](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L297)

---

### data

> **data**: `object`[]

Defined in: [types/providers.ts:298](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L298)

#### object?

> `optional` **object?**: `string`

#### embedding

> **embedding**: `number`[]

#### index

> **index**: `number`

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:299](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L299)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:300](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L300)

#### total_tokens?

> `optional` **total_tokens?**: `number`

#### prompt_tokens?

> `optional` **prompt_tokens?**: `number`
