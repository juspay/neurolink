[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGResponse

# Type Alias: RAGResponse

> **RAGResponse** = `object`

Query response

## Properties

### answer?

> `optional` **answer?**: `string`

Generated answer (if generate=true)

---

### context

> **context**: `string`

Retrieved context chunks

---

### sources

> **sources**: `object`[]

Source documents/chunks

#### id

> **id**: `string`

#### text

> **text**: `string`

#### score

> **score**: `number`

#### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

---

### metadata

> **metadata**: `object`

Query metadata

#### queryTime

> **queryTime**: `number`

#### retrievalMethod

> **retrievalMethod**: `string`

#### chunksRetrieved

> **chunksRetrieved**: `number`

#### reranked

> **reranked**: `boolean`

#### plan?

> `optional` **plan?**: [`SearchPlanResult`](SearchPlanResult.md)

The per-query retrieval plan, when one was decided.
