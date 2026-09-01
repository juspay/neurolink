[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HybridSearchOptions

# Type Alias: HybridSearchOptions

> **HybridSearchOptions** = `object`

Defined in: [types/rag.ts:471](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L471)

Hybrid search configuration for creating a search function

## Properties

### vectorStore

> **vectorStore**: [`VectorStore`](VectorStore.md)

Defined in: [types/rag.ts:473](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L473)

Vector store instance

---

### bm25Index

> **bm25Index**: [`BM25Index`](BM25Index.md)

Defined in: [types/rag.ts:475](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L475)

BM25 index instance

---

### indexName

> **indexName**: `string`

Defined in: [types/rag.ts:477](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L477)

Index name for vector store

---

### embeddingModel?

> `optional` **embeddingModel?**: `object`

Defined in: [types/rag.ts:479](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L479)

Embedding model configuration (optional - uses defaults from ProviderFactory if not specified)

#### provider?

> `optional` **provider?**: `string`

#### modelName?

> `optional` **modelName?**: `string`

---

### defaultConfig?

> `optional` **defaultConfig?**: [`HybridSearchConfig`](HybridSearchConfig.md)

Defined in: [types/rag.ts:484](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L484)

Default search configuration
