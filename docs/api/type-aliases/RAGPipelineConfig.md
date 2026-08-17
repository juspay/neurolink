[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGPipelineConfig

# Type Alias: RAGPipelineConfig

> **RAGPipelineConfig** = `object`

Defined in: [types/rag.ts:250](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L250)

RAG pipeline configuration

## Properties

### id?

> `optional` **id?**: `string`

Defined in: [types/rag.ts:252](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L252)

Pipeline identifier

---

### vectorStore?

> `optional` **vectorStore?**: [`VectorStore`](VectorStore.md)

Defined in: [types/rag.ts:254](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L254)

Vector store instance (defaults to in-memory)

---

### bm25Index?

> `optional` **bm25Index?**: [`BM25Index`](BM25Index.md)

Defined in: [types/rag.ts:256](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L256)

BM25 index for hybrid search (defaults to in-memory)

---

### indexName?

> `optional` **indexName?**: `string`

Defined in: [types/rag.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L258)

Index name for vector store

---

### embeddingModel

> **embeddingModel**: [`EmbeddingModelConfig`](EmbeddingModelConfig.md)

Defined in: [types/rag.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L260)

Embedding model configuration

---

### generationModel?

> `optional` **generationModel?**: [`GenerationModelConfig`](GenerationModelConfig.md)

Defined in: [types/rag.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L262)

Generation model configuration (for RAG responses)

---

### defaultChunkingStrategy?

> `optional` **defaultChunkingStrategy?**: [`ChunkingStrategy`](ChunkingStrategy.md)

Defined in: [types/rag.ts:264](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L264)

Default chunking strategy

---

### defaultChunkSize?

> `optional` **defaultChunkSize?**: `number`

Defined in: [types/rag.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L266)

Default chunk size

---

### defaultChunkOverlap?

> `optional` **defaultChunkOverlap?**: `number`

Defined in: [types/rag.ts:268](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L268)

Default chunk overlap

---

### enableHybridSearch?

> `optional` **enableHybridSearch?**: `boolean`

Defined in: [types/rag.ts:270](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L270)

Enable hybrid search (vector + BM25)

---

### enableGraphRAG?

> `optional` **enableGraphRAG?**: `boolean`

Defined in: [types/rag.ts:272](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L272)

Enable Graph RAG

---

### graphThreshold?

> `optional` **graphThreshold?**: `number`

Defined in: [types/rag.ts:274](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L274)

Graph RAG similarity threshold

---

### defaultTopK?

> `optional` **defaultTopK?**: `number`

Defined in: [types/rag.ts:276](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L276)

Default number of results to retrieve

---

### enableReranking?

> `optional` **enableReranking?**: `boolean`

Defined in: [types/rag.ts:278](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L278)

Enable reranking

---

### rerankingModel?

> `optional` **rerankingModel?**: [`EmbeddingModelConfig`](EmbeddingModelConfig.md)

Defined in: [types/rag.ts:280](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L280)

Reranking model configuration

---

### multiModal?

> `optional` **multiModal?**: [`MultiModalRAGConfig`](MultiModalRAGConfig.md)

Defined in: [types/rag.ts:282](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L282)

Multi-modal RAG configuration (image + text embeddings)
