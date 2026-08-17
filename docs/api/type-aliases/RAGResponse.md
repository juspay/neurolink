[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGResponse

# Type Alias: RAGResponse

> **RAGResponse** = `object`

Defined in: [types/rag.ts:328](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L328)

Query response

## Properties

### answer?

> `optional` **answer?**: `string`

Defined in: [types/rag.ts:330](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L330)

Generated answer (if generate=true)

---

### context

> **context**: `string`

Defined in: [types/rag.ts:332](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L332)

Retrieved context chunks

---

### sources

> **sources**: `object`[]

Defined in: [types/rag.ts:334](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L334)

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

Defined in: [types/rag.ts:341](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L341)

Query metadata

#### queryTime

> **queryTime**: `number`

#### retrievalMethod

> **retrievalMethod**: `string`

#### chunksRetrieved

> **chunksRetrieved**: `number`

#### reranked

> **reranked**: `boolean`
