[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCommandArgs

# Type Alias: RAGCommandArgs

> **RAGCommandArgs** = `object`

Defined in: [types/rag.ts:1466](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1466)

RAG CLI command arguments

## Properties

### file?

> `optional` **file?**: `string`

Defined in: [types/rag.ts:1468](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1468)

Input file path

---

### query?

> `optional` **query?**: `string`

Defined in: [types/rag.ts:1470](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1470)

Query string

---

### strategy?

> `optional` **strategy?**: [`ChunkingStrategy`](ChunkingStrategy.md)

Defined in: [types/rag.ts:1472](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1472)

Chunking strategy

---

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/rag.ts:1474](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1474)

Maximum chunk size

---

### overlap?

> `optional` **overlap?**: `number`

Defined in: [types/rag.ts:1476](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1476)

Chunk overlap

---

### format?

> `optional` **format?**: `"json"` \| `"text"` \| `"table"`

Defined in: [types/rag.ts:1478](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1478)

Output format

---

### verbose?

> `optional` **verbose?**: `boolean`

Defined in: [types/rag.ts:1480](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1480)

Enable verbose output

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/rag.ts:1482](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1482)

Provider for embeddings

---

### model?

> `optional` **model?**: `string`

Defined in: [types/rag.ts:1484](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1484)

Model for embeddings

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1486](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1486)

Number of results

---

### index?

> `optional` **index?**: `string`

Defined in: [types/rag.ts:1488](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1488)

Index name

---

### hybrid?

> `optional` **hybrid?**: `boolean`

Defined in: [types/rag.ts:1490](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1490)

Enable hybrid search

---

### graph?

> `optional` **graph?**: `boolean`

Defined in: [types/rag.ts:1492](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1492)

Use Graph RAG
