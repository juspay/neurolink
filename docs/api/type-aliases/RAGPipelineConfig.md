[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGPipelineConfig

# Type Alias: RAGPipelineConfig

> **RAGPipelineConfig** = `object`

RAG pipeline configuration

## Properties

### id?

> `optional` **id?**: `string`

Pipeline identifier

---

### vectorStore?

> `optional` **vectorStore?**: [`VectorStore`](VectorStore.md)

Vector store instance (defaults to in-memory)

---

### bm25Index?

> `optional` **bm25Index?**: [`BM25Index`](BM25Index.md)

BM25 index for hybrid search (defaults to in-memory)

---

### indexName?

> `optional` **indexName?**: `string`

Index name for vector store

---

### embeddingModel

> **embeddingModel**: [`EmbeddingModelConfig`](EmbeddingModelConfig.md)

Embedding model configuration

---

### generationModel?

> `optional` **generationModel?**: [`GenerationModelConfig`](GenerationModelConfig.md)

Generation model configuration (for RAG responses)

---

### defaultChunkingStrategy?

> `optional` **defaultChunkingStrategy?**: [`ChunkingStrategy`](ChunkingStrategy.md)

Default chunking strategy

---

### defaultChunkSize?

> `optional` **defaultChunkSize?**: `number`

Default chunk size

---

### defaultChunkOverlap?

> `optional` **defaultChunkOverlap?**: `number`

Default chunk overlap

---

### enableHybridSearch?

> `optional` **enableHybridSearch?**: `boolean`

Enable hybrid search (vector + BM25)

---

### enableGraphRAG?

> `optional` **enableGraphRAG?**: `boolean`

Enable Graph RAG

---

### graphThreshold?

> `optional` **graphThreshold?**: `number`

Graph RAG similarity threshold

---

### defaultTopK?

> `optional` **defaultTopK?**: `number`

Default number of results to retrieve

---

### enableReranking?

> `optional` **enableReranking?**: `boolean`

Enable reranking

---

### rerankingModel?

> `optional` **rerankingModel?**: [`EmbeddingModelConfig`](EmbeddingModelConfig.md)

Reranking model configuration

---

### multiModal?

> `optional` **multiModal?**: [`MultiModalRAGConfig`](MultiModalRAGConfig.md)

Multi-modal RAG configuration (image + text embeddings)

---

### decide?

> `optional` **decide?**: [`DecisionCallerFn`](DecisionCallerFn.md)

Fail-open decision caller — typically a bound `NeuroLink.tryDecide`.

When supplied AND a decision provider is configured, each query gets its
own retrieval plan (`topK`, `hybrid`, `graph`, `rerank`) instead of the
four static config values. An explicit per-call `QueryOptions` field
always wins, and a capability this config did not enable can never be
turned on by the plan.
