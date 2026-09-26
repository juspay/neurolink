[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JinaRerankResponse

# Type Alias: JinaRerankResponse

> **JinaRerankResponse** = `object`

Defined in: [types/providers.ts:322](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L322)

Jina AI /rerank response shape.

## Properties

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:323](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L323)

---

### results

> **results**: `object`[]

Defined in: [types/providers.ts:324](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L324)

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

Defined in: [types/providers.ts:329](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L329)

#### total_tokens?

> `optional` **total_tokens?**: `number`
