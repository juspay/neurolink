[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JinaRerankResponse

# Type Alias: JinaRerankResponse

> **JinaRerankResponse** = `object`

Defined in: [types/providers.ts:282](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L282)

Jina AI /rerank response shape.

## Properties

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:283](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L283)

---

### results

> **results**: `object`[]

Defined in: [types/providers.ts:284](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L284)

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

Defined in: [types/providers.ts:289](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L289)

#### total_tokens?

> `optional` **total_tokens?**: `number`
