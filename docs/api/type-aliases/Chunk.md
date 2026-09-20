[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Chunk

# Type Alias: Chunk

> **Chunk** = `object`

Defined in: [types/rag.ts:844](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L844)

Base chunk result with text and metadata

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:846](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L846)

Unique identifier for the chunk

---

### text

> **text**: `string`

Defined in: [types/rag.ts:848](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L848)

The text content of the chunk

---

### metadata

> **metadata**: [`ChunkMetadata`](ChunkMetadata.md)

Defined in: [types/rag.ts:850](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L850)

Metadata associated with the chunk

---

### embedding?

> `optional` **embedding?**: `number`[]

Defined in: [types/rag.ts:852](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L852)

Optional embedding vector (populated after embedding)
