[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGResponse

# Type Alias: RAGResponse

> **RAGResponse** = `object`

Defined in: [types/rag.ts:325](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L325)

Query response

## Properties

### answer?

> `optional` **answer?**: `string`

Defined in: [types/rag.ts:327](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L327)

Generated answer (if generate=true)

---

### context

> **context**: `string`

Defined in: [types/rag.ts:329](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L329)

Retrieved context chunks

---

### sources

> **sources**: `object`[]

Defined in: [types/rag.ts:331](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L331)

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

Defined in: [types/rag.ts:338](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L338)

Query metadata

#### queryTime

> **queryTime**: `number`

#### retrievalMethod

> **retrievalMethod**: `string`

#### chunksRetrieved

> **chunksRetrieved**: `number`

#### reranked

> **reranked**: `boolean`
