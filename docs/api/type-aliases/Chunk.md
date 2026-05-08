[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / Chunk

# Type Alias: Chunk

> **Chunk** = `object`

Defined in: [types/rag.ts:762](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L762)

Base chunk result with text and metadata

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:764](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L764)

Unique identifier for the chunk

---

### text

> **text**: `string`

Defined in: [types/rag.ts:766](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L766)

The text content of the chunk

---

### metadata

> **metadata**: [`ChunkMetadata`](ChunkMetadata.md)

Defined in: [types/rag.ts:768](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L768)

Metadata associated with the chunk

---

### embedding?

> `optional` **embedding?**: `number`[]

Defined in: [types/rag.ts:770](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L770)

Optional embedding vector (populated after embedding)
