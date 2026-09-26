[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChromaVectorStoreOptions

# Type Alias: ChromaVectorStoreOptions

> **ChromaVectorStoreOptions** = `object`

## Properties

### distanceMetric?

> `optional` **distanceMetric?**: [`ChromaDistanceMetric`](ChromaDistanceMetric.md)

The distance metric configured on the underlying Chroma collection(s)
(Chroma's `hnsw:space`). Used only to convert returned distances into a
`score`; see `src/lib/rag/stores/chroma.ts` module doc comment.
Defaults to `"cosine"`.
