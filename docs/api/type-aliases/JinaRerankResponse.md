[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JinaRerankResponse

# Type Alias: JinaRerankResponse

> **JinaRerankResponse** = `object`

Defined in: [types/providers.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L266)

Jina AI /rerank response shape.

## Properties

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:267](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L267)

---

### results

> **results**: `object`[]

Defined in: [types/providers.ts:268](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L268)

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

Defined in: [types/providers.ts:273](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L273)

#### total_tokens?

> `optional` **total_tokens?**: `number`
