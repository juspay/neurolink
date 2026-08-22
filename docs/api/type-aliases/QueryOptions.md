[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueryOptions

# Type Alias: QueryOptions

> **QueryOptions** = `object`

Defined in: [types/rag.ts:301](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L301)

Query options

## Properties

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:303](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L303)

Number of chunks to retrieve

---

### hybrid?

> `optional` **hybrid?**: `boolean`

Defined in: [types/rag.ts:305](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L305)

Use hybrid search

---

### graph?

> `optional` **graph?**: `boolean`

Defined in: [types/rag.ts:307](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L307)

Use Graph RAG

---

### rerank?

> `optional` **rerank?**: `boolean`

Defined in: [types/rag.ts:309](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L309)

Enable reranking

---

### filter?

> `optional` **filter?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:311](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L311)

Metadata filter

---

### includeSources?

> `optional` **includeSources?**: `boolean`

Defined in: [types/rag.ts:313](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L313)

Include sources in response

---

### generate?

> `optional` **generate?**: `boolean`

Defined in: [types/rag.ts:315](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L315)

Generate response (vs just retrieve)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/rag.ts:317](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L317)

Custom system prompt for generation

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/rag.ts:319](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L319)

Temperature for generation
