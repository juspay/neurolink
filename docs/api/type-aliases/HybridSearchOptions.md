[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / HybridSearchOptions

# Type Alias: HybridSearchOptions

> **HybridSearchOptions** = `object`

Defined in: [types/rag.ts:466](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L466)

Hybrid search configuration for creating a search function

## Properties

### vectorStore

> **vectorStore**: [`VectorStore`](VectorStore.md)

Defined in: [types/rag.ts:468](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L468)

Vector store instance

---

### bm25Index

> **bm25Index**: [`BM25Index`](BM25Index.md)

Defined in: [types/rag.ts:470](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L470)

BM25 index instance

---

### indexName

> **indexName**: `string`

Defined in: [types/rag.ts:472](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L472)

Index name for vector store

---

### embeddingModel?

> `optional` **embeddingModel?**: `object`

Defined in: [types/rag.ts:474](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L474)

Embedding model configuration (optional - uses defaults from ProviderFactory if not specified)

#### provider?

> `optional` **provider?**: `string`

#### modelName?

> `optional` **modelName?**: `string`

---

### defaultConfig?

> `optional` **defaultConfig?**: [`HybridSearchConfig`](HybridSearchConfig.md)

Defined in: [types/rag.ts:479](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L479)

Default search configuration
