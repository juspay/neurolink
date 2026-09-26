[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCommandArgs

# Type Alias: RAGCommandArgs

> **RAGCommandArgs** = `object`

RAG CLI command arguments

## Properties

### file?

> `optional` **file?**: `string`

Input file path

---

### query?

> `optional` **query?**: `string`

Query string

---

### strategy?

> `optional` **strategy?**: [`ChunkingStrategy`](ChunkingStrategy.md)

Chunking strategy

---

### maxSize?

> `optional` **maxSize?**: `number`

Maximum chunk size

---

### overlap?

> `optional` **overlap?**: `number`

Chunk overlap

---

### format?

> `optional` **format?**: `"json"` \| `"text"` \| `"table"`

Output format

---

### verbose?

> `optional` **verbose?**: `boolean`

Enable verbose output

---

### provider?

> `optional` **provider?**: `string`

Provider for embeddings

---

### model?

> `optional` **model?**: `string`

Model for embeddings

---

### topK?

> `optional` **topK?**: `number`

Number of results

---

### index?

> `optional` **index?**: `string`

Index name

---

### hybrid?

> `optional` **hybrid?**: `boolean`

Enable hybrid search

---

### graph?

> `optional` **graph?**: `boolean`

Use Graph RAG
