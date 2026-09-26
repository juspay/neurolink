[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JinaEmbeddingsResponse

# Type Alias: JinaEmbeddingsResponse

> **JinaEmbeddingsResponse** = `object`

Defined in: [types/providers.ts:312](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L312)

Jina AI /embeddings response shape (compatible with OpenAI's shape).

## Properties

### object?

> `optional` **object?**: `string`

Defined in: [types/providers.ts:313](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L313)

---

### data

> **data**: `object`[]

Defined in: [types/providers.ts:314](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L314)

#### object?

> `optional` **object?**: `string`

#### embedding

> **embedding**: `number`[]

#### index

> **index**: `number`

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:315](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L315)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:316](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L316)

#### total_tokens?

> `optional` **total_tokens?**: `number`

#### prompt_tokens?

> `optional` **prompt_tokens?**: `number`
