[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HybridSearchConfig

# Type Alias: HybridSearchConfig

> **HybridSearchConfig** = `object`

Defined in: [types/rag.ts:1319](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1319)

Hybrid search configuration

## Properties

### vectorWeight?

> `optional` **vectorWeight?**: `number`

Defined in: [types/rag.ts:1321](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1321)

Weight for vector search (0-1)

---

### bm25Weight?

> `optional` **bm25Weight?**: `number`

Defined in: [types/rag.ts:1323](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1323)

Weight for BM25 search (0-1)

---

### fusionMethod?

> `optional` **fusionMethod?**: `"rrf"` \| `"linear"`

Defined in: [types/rag.ts:1325](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1325)

Fusion method

---

### rrfK?

> `optional` **rrfK?**: `number`

Defined in: [types/rag.ts:1327](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1327)

RRF k parameter

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1329](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1329)

Number of results to return

---

### enableReranking?

> `optional` **enableReranking?**: `boolean`

Defined in: [types/rag.ts:1331](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1331)

Enable reranking

---

### reranker?

> `optional` **reranker?**: [`RerankerConfig`](RerankerConfig.md)

Defined in: [types/rag.ts:1333](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1333)

Reranker configuration
