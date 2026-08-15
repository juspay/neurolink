[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCommandArgs

# Type Alias: RAGCommandArgs

> **RAGCommandArgs** = `object`

Defined in: [types/rag.ts:1510](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1510)

RAG CLI command arguments

## Properties

### file?

> `optional` **file?**: `string`

Defined in: [types/rag.ts:1512](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1512)

Input file path

---

### query?

> `optional` **query?**: `string`

Defined in: [types/rag.ts:1514](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1514)

Query string

---

### strategy?

> `optional` **strategy?**: [`ChunkingStrategy`](ChunkingStrategy.md)

Defined in: [types/rag.ts:1516](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1516)

Chunking strategy

---

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/rag.ts:1518](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1518)

Maximum chunk size

---

### overlap?

> `optional` **overlap?**: `number`

Defined in: [types/rag.ts:1520](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1520)

Chunk overlap

---

### format?

> `optional` **format?**: `"json"` \| `"text"` \| `"table"`

Defined in: [types/rag.ts:1522](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1522)

Output format

---

### verbose?

> `optional` **verbose?**: `boolean`

Defined in: [types/rag.ts:1524](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1524)

Enable verbose output

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/rag.ts:1526](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1526)

Provider for embeddings

---

### model?

> `optional` **model?**: `string`

Defined in: [types/rag.ts:1528](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1528)

Model for embeddings

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1530](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1530)

Number of results

---

### index?

> `optional` **index?**: `string`

Defined in: [types/rag.ts:1532](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1532)

Index name

---

### hybrid?

> `optional` **hybrid?**: `boolean`

Defined in: [types/rag.ts:1534](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1534)

Enable hybrid search

---

### graph?

> `optional` **graph?**: `boolean`

Defined in: [types/rag.ts:1536](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1536)

Use Graph RAG
