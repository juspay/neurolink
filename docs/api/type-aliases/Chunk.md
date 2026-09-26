[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Chunk

# Type Alias: Chunk

> **Chunk** = `object`

Base chunk result with text and metadata

## Properties

### id

> **id**: `string`

Unique identifier for the chunk

---

### text

> **text**: `string`

The text content of the chunk

---

### metadata

> **metadata**: [`ChunkMetadata`](ChunkMetadata.md)

Metadata associated with the chunk

---

### embedding?

> `optional` **embedding?**: `number`[]

Optional embedding vector (populated after embedding)
