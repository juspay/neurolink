[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorQueryResult

# Type Alias: VectorQueryResult

> **VectorQueryResult** = `object`

Defined in: [types/rag.ts:1212](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1212)

Vector store query result

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:1214](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1214)

Unique identifier

---

### text?

> `optional` **text?**: `string`

Defined in: [types/rag.ts:1216](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1216)

Text content

---

### score?

> `optional` **score?**: `number`

Defined in: [types/rag.ts:1218](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1218)

Similarity/relevance score

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1220](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1220)

Associated metadata

---

### vector?

> `optional` **vector?**: `number`[]

Defined in: [types/rag.ts:1222](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1222)

Embedding vector (if requested)
