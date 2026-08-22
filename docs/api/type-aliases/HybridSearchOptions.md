[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / HybridSearchOptions

# Type Alias: HybridSearchOptions

> **HybridSearchOptions** = `object`

Defined in: [types/rag.ts:468](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L468)

Hybrid search configuration for creating a search function

## Properties

### vectorStore

> **vectorStore**: [`VectorStore`](VectorStore.md)

Defined in: [types/rag.ts:470](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L470)

Vector store instance

---

### bm25Index

> **bm25Index**: [`BM25Index`](BM25Index.md)

Defined in: [types/rag.ts:472](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L472)

BM25 index instance

---

### indexName

> **indexName**: `string`

Defined in: [types/rag.ts:474](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L474)

Index name for vector store

---

### embeddingModel?

> `optional` **embeddingModel?**: `object`

Defined in: [types/rag.ts:476](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L476)

Embedding model configuration (optional - uses defaults from ProviderFactory if not specified)

#### provider?

> `optional` **provider?**: `string`

#### modelName?

> `optional` **modelName?**: `string`

---

### defaultConfig?

> `optional` **defaultConfig?**: [`HybridSearchConfig`](HybridSearchConfig.md)

Defined in: [types/rag.ts:481](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L481)

Default search configuration
