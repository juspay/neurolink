[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCommandArgs

# Type Alias: RAGCommandArgs

> **RAGCommandArgs** = `object`

Defined in: [types/rag.ts:1529](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1529)

RAG CLI command arguments

## Properties

### file?

> `optional` **file?**: `string`

Defined in: [types/rag.ts:1531](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1531)

Input file path

---

### query?

> `optional` **query?**: `string`

Defined in: [types/rag.ts:1533](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1533)

Query string

---

### strategy?

> `optional` **strategy?**: [`ChunkingStrategy`](ChunkingStrategy.md)

Defined in: [types/rag.ts:1535](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1535)

Chunking strategy

---

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/rag.ts:1537](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1537)

Maximum chunk size

---

### overlap?

> `optional` **overlap?**: `number`

Defined in: [types/rag.ts:1539](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1539)

Chunk overlap

---

### format?

> `optional` **format?**: `"json"` \| `"text"` \| `"table"`

Defined in: [types/rag.ts:1541](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1541)

Output format

---

### verbose?

> `optional` **verbose?**: `boolean`

Defined in: [types/rag.ts:1543](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1543)

Enable verbose output

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/rag.ts:1545](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1545)

Provider for embeddings

---

### model?

> `optional` **model?**: `string`

Defined in: [types/rag.ts:1547](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1547)

Model for embeddings

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1549](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1549)

Number of results

---

### index?

> `optional` **index?**: `string`

Defined in: [types/rag.ts:1551](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1551)

Index name

---

### hybrid?

> `optional` **hybrid?**: `boolean`

Defined in: [types/rag.ts:1553](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1553)

Enable hybrid search

---

### graph?

> `optional` **graph?**: `boolean`

Defined in: [types/rag.ts:1555](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1555)

Use Graph RAG
