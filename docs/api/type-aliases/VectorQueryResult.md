[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorQueryResult

# Type Alias: VectorQueryResult

> **VectorQueryResult** = `object`

Defined in: [types/rag.ts:1231](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1231)

Vector store query result

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:1233](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1233)

Unique identifier

---

### text?

> `optional` **text?**: `string`

Defined in: [types/rag.ts:1235](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1235)

Text content

---

### score?

> `optional` **score?**: `number`

Defined in: [types/rag.ts:1237](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1237)

Similarity/relevance score

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1239](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1239)

Associated metadata

---

### vector?

> `optional` **vector?**: `number`[]

Defined in: [types/rag.ts:1241](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1241)

Embedding vector (if requested)
