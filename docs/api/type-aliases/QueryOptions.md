[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueryOptions

# Type Alias: QueryOptions

> **QueryOptions** = `object`

Query options

## Properties

### topK?

> `optional` **topK?**: `number`

Number of chunks to retrieve

---

### hybrid?

> `optional` **hybrid?**: `boolean`

Use hybrid search

---

### graph?

> `optional` **graph?**: `boolean`

Use Graph RAG

---

### rerank?

> `optional` **rerank?**: `boolean`

Enable reranking

---

### filter?

> `optional` **filter?**: `Record`\<`string`, `unknown`\>

Metadata filter

---

### includeSources?

> `optional` **includeSources?**: `boolean`

Include sources in response

---

### generate?

> `optional` **generate?**: `boolean`

Generate response (vs just retrieve)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Custom system prompt for generation

---

### temperature?

> `optional` **temperature?**: `number`

Temperature for generation

---

### plan?

> `optional` **plan?**: `boolean`

Set false to skip per-query retrieval planning even when a decision
provider is configured. Fields passed explicitly here already override
the plan, so this is for turning the extra round trip off entirely.
