[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JinaEmbeddingsResponse

# Type Alias: JinaEmbeddingsResponse

> **JinaEmbeddingsResponse** = `object`

Defined in: [types/providers.ts:314](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L314)

Jina AI /embeddings response shape (compatible with OpenAI's shape).

## Properties

### object?

> `optional` **object?**: `string`

Defined in: [types/providers.ts:315](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L315)

---

### data

> **data**: `object`[]

Defined in: [types/providers.ts:316](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L316)

#### object?

> `optional` **object?**: `string`

#### embedding

> **embedding**: `number`[]

#### index

> **index**: `number`

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:317](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L317)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:318](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L318)

#### total_tokens?

> `optional` **total_tokens?**: `number`

#### prompt_tokens?

> `optional` **prompt_tokens?**: `number`
