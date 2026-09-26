[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HybridSearchOptions

# Type Alias: HybridSearchOptions

> **HybridSearchOptions** = `object`

Hybrid search configuration for creating a search function

## Properties

### vectorStore

> **vectorStore**: [`VectorStore`](VectorStore.md)

Vector store instance

---

### bm25Index

> **bm25Index**: [`BM25Index`](BM25Index.md)

BM25 index instance

---

### indexName

> **indexName**: `string`

Index name for vector store

---

### embeddingModel?

> `optional` **embeddingModel?**: `object`

Embedding model configuration (optional - uses defaults from ProviderFactory if not specified)

#### provider?

> `optional` **provider?**: `string`

#### modelName?

> `optional` **modelName?**: `string`

---

### defaultConfig?

> `optional` **defaultConfig?**: [`HybridSearchConfig`](HybridSearchConfig.md)

Default search configuration
