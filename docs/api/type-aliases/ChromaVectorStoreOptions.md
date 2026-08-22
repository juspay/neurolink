[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChromaVectorStoreOptions

# Type Alias: ChromaVectorStoreOptions

> **ChromaVectorStoreOptions** = `object`

Defined in: [types/vectorStoreChroma.ts:74](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/vectorStoreChroma.ts#L74)

## Properties

### distanceMetric?

> `optional` **distanceMetric?**: [`ChromaDistanceMetric`](ChromaDistanceMetric.md)

Defined in: [types/vectorStoreChroma.ts:81](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/vectorStoreChroma.ts#L81)

The distance metric configured on the underlying Chroma collection(s)
(Chroma's `hnsw:space`). Used only to convert returned distances into a
`score`; see `src/lib/rag/stores/chroma.ts` module doc comment.
Defaults to `"cosine"`.
