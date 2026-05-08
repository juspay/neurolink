[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGPipelineConfig

# Type Alias: RAGPipelineConfig

> **RAGPipelineConfig** = `object`

Defined in: [types/rag.ts:247](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L247)

RAG pipeline configuration

## Properties

### id?

> `optional` **id?**: `string`

Defined in: [types/rag.ts:249](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L249)

Pipeline identifier

---

### vectorStore?

> `optional` **vectorStore?**: [`VectorStore`](VectorStore.md)

Defined in: [types/rag.ts:251](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L251)

Vector store instance (defaults to in-memory)

---

### bm25Index?

> `optional` **bm25Index?**: [`BM25Index`](BM25Index.md)

Defined in: [types/rag.ts:253](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L253)

BM25 index for hybrid search (defaults to in-memory)

---

### indexName?

> `optional` **indexName?**: `string`

Defined in: [types/rag.ts:255](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L255)

Index name for vector store

---

### embeddingModel

> **embeddingModel**: [`EmbeddingModelConfig`](EmbeddingModelConfig.md)

Defined in: [types/rag.ts:257](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L257)

Embedding model configuration

---

### generationModel?

> `optional` **generationModel?**: [`GenerationModelConfig`](GenerationModelConfig.md)

Defined in: [types/rag.ts:259](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L259)

Generation model configuration (for RAG responses)

---

### defaultChunkingStrategy?

> `optional` **defaultChunkingStrategy?**: [`ChunkingStrategy`](ChunkingStrategy.md)

Defined in: [types/rag.ts:261](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L261)

Default chunking strategy

---

### defaultChunkSize?

> `optional` **defaultChunkSize?**: `number`

Defined in: [types/rag.ts:263](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L263)

Default chunk size

---

### defaultChunkOverlap?

> `optional` **defaultChunkOverlap?**: `number`

Defined in: [types/rag.ts:265](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L265)

Default chunk overlap

---

### enableHybridSearch?

> `optional` **enableHybridSearch?**: `boolean`

Defined in: [types/rag.ts:267](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L267)

Enable hybrid search (vector + BM25)

---

### enableGraphRAG?

> `optional` **enableGraphRAG?**: `boolean`

Defined in: [types/rag.ts:269](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L269)

Enable Graph RAG

---

### graphThreshold?

> `optional` **graphThreshold?**: `number`

Defined in: [types/rag.ts:271](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L271)

Graph RAG similarity threshold

---

### defaultTopK?

> `optional` **defaultTopK?**: `number`

Defined in: [types/rag.ts:273](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L273)

Default number of results to retrieve

---

### enableReranking?

> `optional` **enableReranking?**: `boolean`

Defined in: [types/rag.ts:275](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L275)

Enable reranking

---

### rerankingModel?

> `optional` **rerankingModel?**: [`EmbeddingModelConfig`](EmbeddingModelConfig.md)

Defined in: [types/rag.ts:277](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L277)

Reranking model configuration
