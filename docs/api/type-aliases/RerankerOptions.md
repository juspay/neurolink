[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RerankerOptions

# Type Alias: RerankerOptions

> **RerankerOptions** = `object`

Defined in: [types/rag.ts:1466](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1466)

Reranker options

## Properties

### queryEmbedding?

> `optional` **queryEmbedding?**: `number`[]

Defined in: [types/rag.ts:1468](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1468)

Pre-computed query embedding

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1470](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1470)

Number of results to return after reranking

---

### weights?

> `optional` **weights?**: `object`

Defined in: [types/rag.ts:1472](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1472)

Scoring weights (must sum to 1.0)

#### semantic?

> `optional` **semantic?**: `number`

#### vector?

> `optional` **vector?**: `number`

#### position?

> `optional` **position?**: `number`
