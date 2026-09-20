[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IngestOptions

# Type Alias: IngestOptions

> **IngestOptions** = `object`

Defined in: [types/rag.ts:299](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L299)

Ingestion options

## Properties

### strategy?

> `optional` **strategy?**: [`ChunkingStrategy`](ChunkingStrategy.md)

Defined in: [types/rag.ts:301](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L301)

Chunking strategy override

---

### chunkSize?

> `optional` **chunkSize?**: `number`

Defined in: [types/rag.ts:303](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L303)

Chunk size override

---

### chunkOverlap?

> `optional` **chunkOverlap?**: `number`

Defined in: [types/rag.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L305)

Chunk overlap override

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:307](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L307)

Custom metadata to add

---

### extractMetadata?

> `optional` **extractMetadata?**: `boolean`

Defined in: [types/rag.ts:309](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L309)

Extract metadata using LLM
