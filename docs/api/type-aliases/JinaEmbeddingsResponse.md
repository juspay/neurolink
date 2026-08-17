[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JinaEmbeddingsResponse

# Type Alias: JinaEmbeddingsResponse

> **JinaEmbeddingsResponse** = `object`

Defined in: [types/providers.ts:267](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L267)

Jina AI /embeddings response shape (compatible with OpenAI's shape).

## Properties

### object?

> `optional` **object?**: `string`

Defined in: [types/providers.ts:268](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L268)

---

### data

> **data**: `object`[]

Defined in: [types/providers.ts:269](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L269)

#### object?

> `optional` **object?**: `string`

#### embedding

> **embedding**: `number`[]

#### index

> **index**: `number`

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:270](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L270)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:271](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L271)

#### total_tokens?

> `optional` **total_tokens?**: `number`

#### prompt_tokens?

> `optional` **prompt_tokens?**: `number`
