[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HybridSearchConfig

# Type Alias: HybridSearchConfig

> **HybridSearchConfig** = `object`

Defined in: [types/rag.ts:1300](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1300)

Hybrid search configuration

## Properties

### vectorWeight?

> `optional` **vectorWeight?**: `number`

Defined in: [types/rag.ts:1302](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1302)

Weight for vector search (0-1)

---

### bm25Weight?

> `optional` **bm25Weight?**: `number`

Defined in: [types/rag.ts:1304](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1304)

Weight for BM25 search (0-1)

---

### fusionMethod?

> `optional` **fusionMethod?**: `"rrf"` \| `"linear"`

Defined in: [types/rag.ts:1306](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1306)

Fusion method

---

### rrfK?

> `optional` **rrfK?**: `number`

Defined in: [types/rag.ts:1308](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1308)

RRF k parameter

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1310](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1310)

Number of results to return

---

### enableReranking?

> `optional` **enableReranking?**: `boolean`

Defined in: [types/rag.ts:1312](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1312)

Enable reranking

---

### reranker?

> `optional` **reranker?**: [`RerankerConfig`](RerankerConfig.md)

Defined in: [types/rag.ts:1314](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1314)

Reranker configuration
