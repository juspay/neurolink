[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JinaRerankResponse

# Type Alias: JinaRerankResponse

> **JinaRerankResponse** = `object`

Defined in: [types/providers.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L260)

Jina AI /rerank response shape.

## Properties

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:261](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L261)

---

### results

> **results**: `object`[]

Defined in: [types/providers.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L262)

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

Defined in: [types/providers.ts:267](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L267)

#### total_tokens?

> `optional` **total_tokens?**: `number`
