[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCommandArgs

# Type Alias: RAGCommandArgs

> **RAGCommandArgs** = `object`

Defined in: [types/rag.ts:1548](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1548)

RAG CLI command arguments

## Properties

### file?

> `optional` **file?**: `string`

Defined in: [types/rag.ts:1550](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1550)

Input file path

---

### query?

> `optional` **query?**: `string`

Defined in: [types/rag.ts:1552](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1552)

Query string

---

### strategy?

> `optional` **strategy?**: [`ChunkingStrategy`](ChunkingStrategy.md)

Defined in: [types/rag.ts:1554](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1554)

Chunking strategy

---

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/rag.ts:1556](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1556)

Maximum chunk size

---

### overlap?

> `optional` **overlap?**: `number`

Defined in: [types/rag.ts:1558](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1558)

Chunk overlap

---

### format?

> `optional` **format?**: `"json"` \| `"text"` \| `"table"`

Defined in: [types/rag.ts:1560](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1560)

Output format

---

### verbose?

> `optional` **verbose?**: `boolean`

Defined in: [types/rag.ts:1562](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1562)

Enable verbose output

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/rag.ts:1564](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1564)

Provider for embeddings

---

### model?

> `optional` **model?**: `string`

Defined in: [types/rag.ts:1566](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1566)

Model for embeddings

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1568](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1568)

Number of results

---

### index?

> `optional` **index?**: `string`

Defined in: [types/rag.ts:1570](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1570)

Index name

---

### hybrid?

> `optional` **hybrid?**: `boolean`

Defined in: [types/rag.ts:1572](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1572)

Enable hybrid search

---

### graph?

> `optional` **graph?**: `boolean`

Defined in: [types/rag.ts:1574](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1574)

Use Graph RAG
