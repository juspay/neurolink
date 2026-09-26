[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRetrievalWeights

# Type Alias: ToolRetrievalWeights

> **ToolRetrievalWeights** = `object`

Weights for the hybrid scoring formula used by `ToolEmbeddingIndex.rank()`.
Scores are computed as: `cosine * cosine + bm25 * bm25Score` then
normalized before sorting.
Default: `{ cosine: 0.8, bm25: 0.2 }`.

## Properties

### cosine

> **cosine**: `number`

Weight applied to the cosine-similarity (dense) component.

---

### bm25

> **bm25**: `number`

Weight applied to the BM25 (sparse/lexical) component.
