[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RerankerOptions

# Type Alias: RerankerOptions

> **RerankerOptions** = `object`

Defined in: [types/rag.ts:1403](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1403)

Reranker options

## Properties

### queryEmbedding?

> `optional` **queryEmbedding?**: `number`[]

Defined in: [types/rag.ts:1405](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1405)

Pre-computed query embedding

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1407](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1407)

Number of results to return after reranking

---

### weights?

> `optional` **weights?**: `object`

Defined in: [types/rag.ts:1409](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1409)

Scoring weights (must sum to 1.0)

#### semantic?

> `optional` **semantic?**: `number`

#### vector?

> `optional` **vector?**: `number`

#### position?

> `optional` **position?**: `number`
