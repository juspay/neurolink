[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGPipelineConfig

# Type Alias: RAGPipelineConfig

> **RAGPipelineConfig** = `object`

Defined in: [types/rag.ts:251](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L251)

RAG pipeline configuration

## Properties

### id?

> `optional` **id?**: `string`

Defined in: [types/rag.ts:253](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L253)

Pipeline identifier

---

### vectorStore?

> `optional` **vectorStore?**: [`VectorStore`](VectorStore.md)

Defined in: [types/rag.ts:255](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L255)

Vector store instance (defaults to in-memory)

---

### bm25Index?

> `optional` **bm25Index?**: [`BM25Index`](BM25Index.md)

Defined in: [types/rag.ts:257](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L257)

BM25 index for hybrid search (defaults to in-memory)

---

### indexName?

> `optional` **indexName?**: `string`

Defined in: [types/rag.ts:259](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L259)

Index name for vector store

---

### embeddingModel

> **embeddingModel**: [`EmbeddingModelConfig`](EmbeddingModelConfig.md)

Defined in: [types/rag.ts:261](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L261)

Embedding model configuration

---

### generationModel?

> `optional` **generationModel?**: [`GenerationModelConfig`](GenerationModelConfig.md)

Defined in: [types/rag.ts:263](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L263)

Generation model configuration (for RAG responses)

---

### defaultChunkingStrategy?

> `optional` **defaultChunkingStrategy?**: [`ChunkingStrategy`](ChunkingStrategy.md)

Defined in: [types/rag.ts:265](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L265)

Default chunking strategy

---

### defaultChunkSize?

> `optional` **defaultChunkSize?**: `number`

Defined in: [types/rag.ts:267](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L267)

Default chunk size

---

### defaultChunkOverlap?

> `optional` **defaultChunkOverlap?**: `number`

Defined in: [types/rag.ts:269](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L269)

Default chunk overlap

---

### enableHybridSearch?

> `optional` **enableHybridSearch?**: `boolean`

Defined in: [types/rag.ts:271](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L271)

Enable hybrid search (vector + BM25)

---

### enableGraphRAG?

> `optional` **enableGraphRAG?**: `boolean`

Defined in: [types/rag.ts:273](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L273)

Enable Graph RAG

---

### graphThreshold?

> `optional` **graphThreshold?**: `number`

Defined in: [types/rag.ts:275](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L275)

Graph RAG similarity threshold

---

### defaultTopK?

> `optional` **defaultTopK?**: `number`

Defined in: [types/rag.ts:277](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L277)

Default number of results to retrieve

---

### enableReranking?

> `optional` **enableReranking?**: `boolean`

Defined in: [types/rag.ts:279](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L279)

Enable reranking

---

### rerankingModel?

> `optional` **rerankingModel?**: [`EmbeddingModelConfig`](EmbeddingModelConfig.md)

Defined in: [types/rag.ts:281](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L281)

Reranking model configuration

---

### multiModal?

> `optional` **multiModal?**: [`MultiModalRAGConfig`](MultiModalRAGConfig.md)

Defined in: [types/rag.ts:283](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L283)

Multi-modal RAG configuration (image + text embeddings)

---

### decide?

> `optional` **decide?**: [`DecisionCallerFn`](DecisionCallerFn.md)

Defined in: [types/rag.ts:293](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L293)

Fail-open decision caller — typically a bound `NeuroLink.tryDecide`.

When supplied AND a decision provider is configured, each query gets its
own retrieval plan (`topK`, `hybrid`, `graph`, `rerank`) instead of the
four static config values. An explicit per-call `QueryOptions` field
always wins, and a capability this config did not enable can never be
turned on by the plan.
