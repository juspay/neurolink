[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HybridSearchConfig

# Type Alias: HybridSearchConfig

> **HybridSearchConfig** = `object`

Defined in: [types/rag.ts:1338](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1338)

Hybrid search configuration

## Properties

### vectorWeight?

> `optional` **vectorWeight?**: `number`

Defined in: [types/rag.ts:1340](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1340)

Weight for vector search (0-1)

---

### bm25Weight?

> `optional` **bm25Weight?**: `number`

Defined in: [types/rag.ts:1342](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1342)

Weight for BM25 search (0-1)

---

### fusionMethod?

> `optional` **fusionMethod?**: `"rrf"` \| `"linear"`

Defined in: [types/rag.ts:1344](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1344)

Fusion method

---

### rrfK?

> `optional` **rrfK?**: `number`

Defined in: [types/rag.ts:1346](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1346)

RRF k parameter

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1348](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1348)

Number of results to return

---

### enableReranking?

> `optional` **enableReranking?**: `boolean`

Defined in: [types/rag.ts:1350](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1350)

Enable reranking

---

### reranker?

> `optional` **reranker?**: [`RerankerConfig`](RerankerConfig.md)

Defined in: [types/rag.ts:1352](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1352)

Reranker configuration
