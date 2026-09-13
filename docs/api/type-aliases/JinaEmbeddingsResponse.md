[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JinaEmbeddingsResponse

# Type Alias: JinaEmbeddingsResponse

> **JinaEmbeddingsResponse** = `object`

Defined in: [types/providers.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L258)

Jina AI /embeddings response shape (compatible with OpenAI's shape).

## Properties

### object?

> `optional` **object?**: `string`

Defined in: [types/providers.ts:259](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L259)

---

### data

> **data**: `object`[]

Defined in: [types/providers.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L260)

#### object?

> `optional` **object?**: `string`

#### embedding

> **embedding**: `number`[]

#### index

> **index**: `number`

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:261](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L261)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L262)

#### total_tokens?

> `optional` **total_tokens?**: `number`

#### prompt_tokens?

> `optional` **prompt_tokens?**: `number`
