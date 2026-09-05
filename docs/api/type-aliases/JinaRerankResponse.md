[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JinaRerankResponse

# Type Alias: JinaRerankResponse

> **JinaRerankResponse** = `object`

Defined in: [types/providers.ts:284](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L284)

Jina AI /rerank response shape.

## Properties

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:285](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L285)

---

### results

> **results**: `object`[]

Defined in: [types/providers.ts:286](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L286)

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

Defined in: [types/providers.ts:291](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L291)

#### total_tokens?

> `optional` **total_tokens?**: `number`
