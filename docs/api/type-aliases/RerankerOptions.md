[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RerankerOptions

# Type Alias: RerankerOptions

> **RerankerOptions** = `object`

Defined in: [types/rag.ts:1447](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1447)

Reranker options

## Properties

### queryEmbedding?

> `optional` **queryEmbedding?**: `number`[]

Defined in: [types/rag.ts:1449](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1449)

Pre-computed query embedding

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1451](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1451)

Number of results to return after reranking

---

### weights?

> `optional` **weights?**: `object`

Defined in: [types/rag.ts:1453](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1453)

Scoring weights (must sum to 1.0)

#### semantic?

> `optional` **semantic?**: `number`

#### vector?

> `optional` **vector?**: `number`

#### position?

> `optional` **position?**: `number`
