[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueryOptions

# Type Alias: QueryOptions

> **QueryOptions** = `object`

Defined in: [types/rag.ts:299](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L299)

Query options

## Properties

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:301](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L301)

Number of chunks to retrieve

---

### hybrid?

> `optional` **hybrid?**: `boolean`

Defined in: [types/rag.ts:303](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L303)

Use hybrid search

---

### graph?

> `optional` **graph?**: `boolean`

Defined in: [types/rag.ts:305](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L305)

Use Graph RAG

---

### rerank?

> `optional` **rerank?**: `boolean`

Defined in: [types/rag.ts:307](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L307)

Enable reranking

---

### filter?

> `optional` **filter?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:309](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L309)

Metadata filter

---

### includeSources?

> `optional` **includeSources?**: `boolean`

Defined in: [types/rag.ts:311](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L311)

Include sources in response

---

### generate?

> `optional` **generate?**: `boolean`

Defined in: [types/rag.ts:313](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L313)

Generate response (vs just retrieve)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/rag.ts:315](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L315)

Custom system prompt for generation

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/rag.ts:317](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L317)

Temperature for generation
