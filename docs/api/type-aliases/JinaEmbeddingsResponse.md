[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JinaEmbeddingsResponse

# Type Alias: JinaEmbeddingsResponse

> **JinaEmbeddingsResponse** = `object`

Defined in: [types/providers.ts:250](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L250)

Jina AI /embeddings response shape (compatible with OpenAI's shape).

## Properties

### object?

> `optional` **object?**: `string`

Defined in: [types/providers.ts:251](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L251)

---

### data

> **data**: `object`[]

Defined in: [types/providers.ts:252](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L252)

#### object?

> `optional` **object?**: `string`

#### embedding

> **embedding**: `number`[]

#### index

> **index**: `number`

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:253](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L253)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:254](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L254)

#### total_tokens?

> `optional` **total_tokens?**: `number`

#### prompt_tokens?

> `optional` **prompt_tokens?**: `number`
