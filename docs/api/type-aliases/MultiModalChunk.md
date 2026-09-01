[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultiModalChunk

# Type Alias: MultiModalChunk

> **MultiModalChunk** = [`Chunk`](Chunk.md) & `object`

Defined in: [types/rag.ts:1672](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1672)

Extended chunk type for multi-modal RAG.
Contains optional image data alongside text for image+text search.

## Type Declaration

### image?

> `optional` **image?**: `Buffer` \| `string`

Image data as Buffer or base64 string (present for image chunks)

### imageMimeType?

> `optional` **imageMimeType?**: `string`

Image MIME type

### imageMeta?

> `optional` **imageMeta?**: [`ImageChunkMetadata`](ImageChunkMetadata.md)

Image-specific metadata
