[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorQueryResult

# Type Alias: VectorQueryResult

> **VectorQueryResult** = `object`

Defined in: [types/rag.ts:1193](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L1193)

Vector store query result

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:1195](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L1195)

Unique identifier

---

### text?

> `optional` **text?**: `string`

Defined in: [types/rag.ts:1197](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L1197)

Text content

---

### score?

> `optional` **score?**: `number`

Defined in: [types/rag.ts:1199](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L1199)

Similarity/relevance score

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1201](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L1201)

Associated metadata

---

### vector?

> `optional` **vector?**: `number`[]

Defined in: [types/rag.ts:1203](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L1203)

Embedding vector (if requested)
