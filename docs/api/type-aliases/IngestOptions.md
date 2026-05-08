[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / IngestOptions

# Type Alias: IngestOptions

> **IngestOptions** = `object`

Defined in: [types/rag.ts:283](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L283)

Ingestion options

## Properties

### strategy?

> `optional` **strategy?**: [`ChunkingStrategy`](ChunkingStrategy.md)

Defined in: [types/rag.ts:285](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L285)

Chunking strategy override

---

### chunkSize?

> `optional` **chunkSize?**: `number`

Defined in: [types/rag.ts:287](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L287)

Chunk size override

---

### chunkOverlap?

> `optional` **chunkOverlap?**: `number`

Defined in: [types/rag.ts:289](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L289)

Chunk overlap override

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:291](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L291)

Custom metadata to add

---

### extractMetadata?

> `optional` **extractMetadata?**: `boolean`

Defined in: [types/rag.ts:293](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L293)

Extract metadata using LLM
