[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChromaMetadataValue

# Type Alias: ChromaMetadataValue

> **ChromaMetadataValue** = `string` \| `number` \| `boolean`

Defined in: [types/vectorStoreChroma.ts:12](https://github.com/juspay/neurolink/blob/release/src/lib/types/vectorStoreChroma.ts#L12)

Structural types for the Chroma vector store adapter
(`src/lib/rag/stores/chroma.ts`).

These mirror the subset of the `chromadb` package's API the adapter
calls (`ChromaClient.getOrCreateCollection`, `Collection.upsert/query/
delete`). NeuroLink has zero runtime dependency on `chromadb` — callers
construct their own client and inject an object satisfying
`ChromaClientLike`.
