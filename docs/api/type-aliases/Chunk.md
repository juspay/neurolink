[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Chunk

# Type Alias: Chunk

> **Chunk** = `object`

Defined in: [types/rag.ts:806](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L806)

Base chunk result with text and metadata

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:808](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L808)

Unique identifier for the chunk

---

### text

> **text**: `string`

Defined in: [types/rag.ts:810](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L810)

The text content of the chunk

---

### metadata

> **metadata**: [`ChunkMetadata`](ChunkMetadata.md)

Defined in: [types/rag.ts:812](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L812)

Metadata associated with the chunk

---

### embedding?

> `optional` **embedding?**: `number`[]

Defined in: [types/rag.ts:814](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L814)

Optional embedding vector (populated after embedding)
