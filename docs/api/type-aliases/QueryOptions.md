[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueryOptions

# Type Alias: QueryOptions

> **QueryOptions** = `object`

Defined in: [types/rag.ts:315](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L315)

Query options

## Properties

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:317](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L317)

Number of chunks to retrieve

---

### hybrid?

> `optional` **hybrid?**: `boolean`

Defined in: [types/rag.ts:319](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L319)

Use hybrid search

---

### graph?

> `optional` **graph?**: `boolean`

Defined in: [types/rag.ts:321](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L321)

Use Graph RAG

---

### rerank?

> `optional` **rerank?**: `boolean`

Defined in: [types/rag.ts:323](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L323)

Enable reranking

---

### filter?

> `optional` **filter?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:325](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L325)

Metadata filter

---

### includeSources?

> `optional` **includeSources?**: `boolean`

Defined in: [types/rag.ts:327](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L327)

Include sources in response

---

### generate?

> `optional` **generate?**: `boolean`

Defined in: [types/rag.ts:329](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L329)

Generate response (vs just retrieve)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/rag.ts:331](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L331)

Custom system prompt for generation

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/rag.ts:333](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L333)

Temperature for generation

---

### plan?

> `optional` **plan?**: `boolean`

Defined in: [types/rag.ts:339](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L339)

Set false to skip per-query retrieval planning even when a decision
provider is configured. Fields passed explicitly here already override
the plan, so this is for turning the extra round trip off entirely.
