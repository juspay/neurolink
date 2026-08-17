[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IngestOptions

# Type Alias: IngestOptions

> **IngestOptions** = `object`

Defined in: [types/rag.ts:288](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L288)

Ingestion options

## Properties

### strategy?

> `optional` **strategy?**: [`ChunkingStrategy`](ChunkingStrategy.md)

Defined in: [types/rag.ts:290](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L290)

Chunking strategy override

---

### chunkSize?

> `optional` **chunkSize?**: `number`

Defined in: [types/rag.ts:292](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L292)

Chunk size override

---

### chunkOverlap?

> `optional` **chunkOverlap?**: `number`

Defined in: [types/rag.ts:294](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L294)

Chunk overlap override

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:296](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L296)

Custom metadata to add

---

### extractMetadata?

> `optional` **extractMetadata?**: `boolean`

Defined in: [types/rag.ts:298](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L298)

Extract metadata using LLM
