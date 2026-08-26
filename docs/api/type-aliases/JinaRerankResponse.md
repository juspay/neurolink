[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JinaRerankResponse

# Type Alias: JinaRerankResponse

> **JinaRerankResponse** = `object`

Defined in: [types/providers.ts:257](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L257)

Jina AI /rerank response shape.

## Properties

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L258)

---

### results

> **results**: `object`[]

Defined in: [types/providers.ts:259](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L259)

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

Defined in: [types/providers.ts:264](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L264)

#### total_tokens?

> `optional` **total_tokens?**: `number`
