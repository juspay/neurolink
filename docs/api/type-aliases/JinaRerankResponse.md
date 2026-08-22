[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JinaRerankResponse

# Type Alias: JinaRerankResponse

> **JinaRerankResponse** = `object`

Defined in: [types/providers.ts:256](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L256)

Jina AI /rerank response shape.

## Properties

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:257](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L257)

---

### results

> **results**: `object`[]

Defined in: [types/providers.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L258)

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

Defined in: [types/providers.ts:263](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L263)

#### total_tokens?

> `optional` **total_tokens?**: `number`
