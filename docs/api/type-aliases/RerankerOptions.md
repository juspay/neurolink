[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RerankerOptions

# Type Alias: RerankerOptions

> **RerankerOptions** = `object`

Reranker options

## Properties

### queryEmbedding?

> `optional` **queryEmbedding?**: `number`[]

Pre-computed query embedding

---

### topK?

> `optional` **topK?**: `number`

Number of results to return after reranking

---

### weights?

> `optional` **weights?**: `object`

Scoring weights (must sum to 1.0)

#### semantic?

> `optional` **semantic?**: `number`

#### vector?

> `optional` **vector?**: `number`

#### position?

> `optional` **position?**: `number`
