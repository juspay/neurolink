[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HybridSearchOptions

# Type Alias: HybridSearchOptions

> **HybridSearchOptions** = `object`

Defined in: [types/rag.ts:490](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L490)

Hybrid search configuration for creating a search function

## Properties

### vectorStore

> **vectorStore**: [`VectorStore`](VectorStore.md)

Defined in: [types/rag.ts:492](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L492)

Vector store instance

---

### bm25Index

> **bm25Index**: [`BM25Index`](BM25Index.md)

Defined in: [types/rag.ts:494](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L494)

BM25 index instance

---

### indexName

> **indexName**: `string`

Defined in: [types/rag.ts:496](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L496)

Index name for vector store

---

### embeddingModel?

> `optional` **embeddingModel?**: `object`

Defined in: [types/rag.ts:498](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L498)

Embedding model configuration (optional - uses defaults from ProviderFactory if not specified)

#### provider?

> `optional` **provider?**: `string`

#### modelName?

> `optional` **modelName?**: `string`

---

### defaultConfig?

> `optional` **defaultConfig?**: [`HybridSearchConfig`](HybridSearchConfig.md)

Defined in: [types/rag.ts:503](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L503)

Default search configuration
