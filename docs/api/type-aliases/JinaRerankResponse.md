[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JinaRerankResponse

# Type Alias: JinaRerankResponse

> **JinaRerankResponse** = `object`

Defined in: [types/providers.ts:306](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L306)

Jina AI /rerank response shape.

## Properties

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:307](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L307)

---

### results

> **results**: `object`[]

Defined in: [types/providers.ts:308](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L308)

#### index

> **index**: `number`

#### relevance_score

> **relevance_score**: `number`

#### document?

> `optional` **document?**: `object`

##### document.text?

> `optional` **text?**: `string`

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/providers.ts:313](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L313)

#### total_tokens?

> `optional` **total_tokens?**: `number`
