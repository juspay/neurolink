[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorQueryResult

# Type Alias: VectorQueryResult

> **VectorQueryResult** = `object`

Defined in: [types/rag.ts:1149](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1149)

Vector store query result

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:1151](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1151)

Unique identifier

---

### text?

> `optional` **text?**: `string`

Defined in: [types/rag.ts:1153](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1153)

Text content

---

### score?

> `optional` **score?**: `number`

Defined in: [types/rag.ts:1155](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1155)

Similarity/relevance score

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1157](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1157)

Associated metadata

---

### vector?

> `optional` **vector?**: `number`[]

Defined in: [types/rag.ts:1159](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1159)

Embedding vector (if requested)
