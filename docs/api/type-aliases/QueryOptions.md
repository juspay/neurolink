[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueryOptions

# Type Alias: QueryOptions

> **QueryOptions** = `object`

Defined in: [types/rag.ts:304](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L304)

Query options

## Properties

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:306](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L306)

Number of chunks to retrieve

---

### hybrid?

> `optional` **hybrid?**: `boolean`

Defined in: [types/rag.ts:308](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L308)

Use hybrid search

---

### graph?

> `optional` **graph?**: `boolean`

Defined in: [types/rag.ts:310](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L310)

Use Graph RAG

---

### rerank?

> `optional` **rerank?**: `boolean`

Defined in: [types/rag.ts:312](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L312)

Enable reranking

---

### filter?

> `optional` **filter?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:314](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L314)

Metadata filter

---

### includeSources?

> `optional` **includeSources?**: `boolean`

Defined in: [types/rag.ts:316](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L316)

Include sources in response

---

### generate?

> `optional` **generate?**: `boolean`

Defined in: [types/rag.ts:318](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L318)

Generate response (vs just retrieve)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/rag.ts:320](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L320)

Custom system prompt for generation

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/rag.ts:322](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L322)

Temperature for generation
