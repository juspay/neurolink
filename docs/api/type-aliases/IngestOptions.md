[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IngestOptions

# Type Alias: IngestOptions

> **IngestOptions** = `object`

Ingestion options

## Properties

### strategy?

> `optional` **strategy?**: [`ChunkingStrategy`](ChunkingStrategy.md)

Chunking strategy override

---

### chunkSize?

> `optional` **chunkSize?**: `number`

Chunk size override

---

### chunkOverlap?

> `optional` **chunkOverlap?**: `number`

Chunk overlap override

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Custom metadata to add

---

### extractMetadata?

> `optional` **extractMetadata?**: `boolean`

Extract metadata using LLM
