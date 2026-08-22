[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorQueryToolConfig

# Type Alias: VectorQueryToolConfig

> **VectorQueryToolConfig** = `object`

Defined in: [types/rag.ts:1235](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1235)

Vector query tool configuration

## Properties

### id?

> `optional` **id?**: `string`

Defined in: [types/rag.ts:1237](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1237)

Tool identifier

---

### description?

> `optional` **description?**: `string`

Defined in: [types/rag.ts:1239](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1239)

Tool description for AI agents

---

### indexName

> **indexName**: `string`

Defined in: [types/rag.ts:1241](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1241)

Index name within the vector store

---

### embeddingModel

> **embeddingModel**: `object`

Defined in: [types/rag.ts:1243](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1243)

Embedding model specification

#### provider

> **provider**: `string`

#### modelName

> **modelName**: `string`

---

### enableFilter?

> `optional` **enableFilter?**: `boolean`

Defined in: [types/rag.ts:1248](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1248)

Enable metadata filtering

---

### includeVectors?

> `optional` **includeVectors?**: `boolean`

Defined in: [types/rag.ts:1250](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1250)

Include embedding vectors in results

---

### includeSources?

> `optional` **includeSources?**: `boolean`

Defined in: [types/rag.ts:1252](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1252)

Include full source objects in results

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1254](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1254)

Number of results to return

---

### reranker?

> `optional` **reranker?**: [`RerankerConfig`](RerankerConfig.md)

Defined in: [types/rag.ts:1256](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1256)

Reranker configuration

---

### providerOptions?

> `optional` **providerOptions?**: [`VectorProviderOptions`](VectorProviderOptions.md)

Defined in: [types/rag.ts:1258](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1258)

Provider-specific options
