[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Chunk

# Type Alias: Chunk

> **Chunk** = `object`

Defined in: [types/rag.ts:825](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L825)

Base chunk result with text and metadata

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:827](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L827)

Unique identifier for the chunk

---

### text

> **text**: `string`

Defined in: [types/rag.ts:829](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L829)

The text content of the chunk

---

### metadata

> **metadata**: [`ChunkMetadata`](ChunkMetadata.md)

Defined in: [types/rag.ts:831](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L831)

Metadata associated with the chunk

---

### embedding?

> `optional` **embedding?**: `number`[]

Defined in: [types/rag.ts:833](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L833)

Optional embedding vector (populated after embedding)
