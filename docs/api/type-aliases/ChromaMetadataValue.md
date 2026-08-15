[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChromaMetadataValue

# Type Alias: ChromaMetadataValue

> **ChromaMetadataValue** = `string` \| `number` \| `boolean`

Defined in: [types/vectorStoreChroma.ts:12](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/vectorStoreChroma.ts#L12)

Structural types for the Chroma vector store adapter
(`src/lib/rag/stores/chroma.ts`).

These mirror the subset of the `chromadb` package's API the adapter
calls (`ChromaClient.getOrCreateCollection`, `Collection.upsert/query/
delete`). NeuroLink has zero runtime dependency on `chromadb` — callers
construct their own client and inject an object satisfying
`ChromaClientLike`.
