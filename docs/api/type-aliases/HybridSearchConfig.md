[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / HybridSearchConfig

# Type Alias: HybridSearchConfig

> **HybridSearchConfig** = `object`

Defined in: [types/rag.ts:1256](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1256)

Hybrid search configuration

## Properties

### vectorWeight?

> `optional` **vectorWeight?**: `number`

Defined in: [types/rag.ts:1258](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1258)

Weight for vector search (0-1)

---

### bm25Weight?

> `optional` **bm25Weight?**: `number`

Defined in: [types/rag.ts:1260](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1260)

Weight for BM25 search (0-1)

---

### fusionMethod?

> `optional` **fusionMethod?**: `"rrf"` \| `"linear"`

Defined in: [types/rag.ts:1262](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1262)

Fusion method

---

### rrfK?

> `optional` **rrfK?**: `number`

Defined in: [types/rag.ts:1264](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1264)

RRF k parameter

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1266](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1266)

Number of results to return

---

### enableReranking?

> `optional` **enableReranking?**: `boolean`

Defined in: [types/rag.ts:1268](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1268)

Enable reranking

---

### reranker?

> `optional` **reranker?**: [`RerankerConfig`](RerankerConfig.md)

Defined in: [types/rag.ts:1270](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1270)

Reranker configuration
