[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRetrievalWeights

# Type Alias: ToolRetrievalWeights

> **ToolRetrievalWeights** = `object`

Defined in: [types/toolRouting.ts:52](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L52)

Weights for the hybrid scoring formula used by `ToolEmbeddingIndex.rank()`.
Scores are computed as: `cosine * cosine + bm25 * bm25Score` then
normalized before sorting.
Default: `{ cosine: 0.8, bm25: 0.2 }`.

## Properties

### cosine

> **cosine**: `number`

Defined in: [types/toolRouting.ts:54](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L54)

Weight applied to the cosine-similarity (dense) component.

---

### bm25

> **bm25**: `number`

Defined in: [types/toolRouting.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L56)

Weight applied to the BM25 (sparse/lexical) component.
