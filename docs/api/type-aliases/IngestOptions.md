[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IngestOptions

# Type Alias: IngestOptions

> **IngestOptions** = `object`

Defined in: [types/rag.ts:285](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L285)

Ingestion options

## Properties

### strategy?

> `optional` **strategy?**: [`ChunkingStrategy`](ChunkingStrategy.md)

Defined in: [types/rag.ts:287](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L287)

Chunking strategy override

---

### chunkSize?

> `optional` **chunkSize?**: `number`

Defined in: [types/rag.ts:289](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L289)

Chunk size override

---

### chunkOverlap?

> `optional` **chunkOverlap?**: `number`

Defined in: [types/rag.ts:291](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L291)

Chunk overlap override

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:293](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L293)

Custom metadata to add

---

### extractMetadata?

> `optional` **extractMetadata?**: `boolean`

Defined in: [types/rag.ts:295](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L295)

Extract metadata using LLM
