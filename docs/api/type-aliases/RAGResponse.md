[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGResponse

# Type Alias: RAGResponse

> **RAGResponse** = `object`

Defined in: [types/rag.ts:345](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L345)

Query response

## Properties

### answer?

> `optional` **answer?**: `string`

Defined in: [types/rag.ts:347](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L347)

Generated answer (if generate=true)

---

### context

> **context**: `string`

Defined in: [types/rag.ts:349](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L349)

Retrieved context chunks

---

### sources

> **sources**: `object`[]

Defined in: [types/rag.ts:351](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L351)

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

Defined in: [types/rag.ts:358](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L358)

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
