[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RerankerOptions

# Type Alias: RerankerOptions

> **RerankerOptions** = `object`

Defined in: [types/rag.ts:1485](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1485)

Reranker options

## Properties

### queryEmbedding?

> `optional` **queryEmbedding?**: `number`[]

Defined in: [types/rag.ts:1487](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1487)

Pre-computed query embedding

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1489](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1489)

Number of results to return after reranking

---

### weights?

> `optional` **weights?**: `object`

Defined in: [types/rag.ts:1491](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1491)

Scoring weights (must sum to 1.0)

#### semantic?

> `optional` **semantic?**: `number`

#### vector?

> `optional` **vector?**: `number`

#### position?

> `optional` **position?**: `number`
