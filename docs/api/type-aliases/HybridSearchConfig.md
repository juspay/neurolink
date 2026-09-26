[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HybridSearchConfig

# Type Alias: HybridSearchConfig

> **HybridSearchConfig** = `object`

Hybrid search configuration

## Properties

### vectorWeight?

> `optional` **vectorWeight?**: `number`

Weight for vector search (0-1)

---

### bm25Weight?

> `optional` **bm25Weight?**: `number`

Weight for BM25 search (0-1)

---

### fusionMethod?

> `optional` **fusionMethod?**: `"rrf"` \| `"linear"`

Fusion method

---

### rrfK?

> `optional` **rrfK?**: `number`

RRF k parameter

---

### topK?

> `optional` **topK?**: `number`

Number of results to return

---

### enableReranking?

> `optional` **enableReranking?**: `boolean`

Enable reranking

---

### reranker?

> `optional` **reranker?**: [`RerankerConfig`](RerankerConfig.md)

Reranker configuration
