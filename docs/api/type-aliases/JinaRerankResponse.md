[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JinaRerankResponse

# Type Alias: JinaRerankResponse

> **JinaRerankResponse** = `object`

Defined in: [types/providers.ts:324](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L324)

Jina AI /rerank response shape.

## Properties

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:325](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L325)

---

### results

> **results**: `object`[]

Defined in: [types/providers.ts:326](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L326)

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

Defined in: [types/providers.ts:331](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L331)

#### total_tokens?

> `optional` **total_tokens?**: `number`
