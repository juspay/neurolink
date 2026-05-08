[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGResponse

# Type Alias: RAGResponse

> **RAGResponse** = `object`

Defined in: [types/rag.ts:323](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L323)

Query response

## Properties

### answer?

> `optional` **answer?**: `string`

Defined in: [types/rag.ts:325](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L325)

Generated answer (if generate=true)

---

### context

> **context**: `string`

Defined in: [types/rag.ts:327](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L327)

Retrieved context chunks

---

### sources

> **sources**: `object`[]

Defined in: [types/rag.ts:329](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L329)

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

Defined in: [types/rag.ts:336](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L336)

Query metadata

#### queryTime

> **queryTime**: `number`

#### retrievalMethod

> **retrievalMethod**: `string`

#### chunksRetrieved

> **chunksRetrieved**: `number`

#### reranked

> **reranked**: `boolean`
