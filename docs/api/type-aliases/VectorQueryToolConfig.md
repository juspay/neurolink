[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorQueryToolConfig

# Type Alias: VectorQueryToolConfig

> **VectorQueryToolConfig** = `object`

Vector query tool configuration

## Properties

### id?

> `optional` **id?**: `string`

Tool identifier

---

### description?

> `optional` **description?**: `string`

Tool description for AI agents

---

### indexName

> **indexName**: `string`

Index name within the vector store

---

### embeddingModel

> **embeddingModel**: `object`

Embedding model specification

#### provider

> **provider**: `string`

#### modelName

> **modelName**: `string`

---

### enableFilter?

> `optional` **enableFilter?**: `boolean`

Enable metadata filtering

---

### includeVectors?

> `optional` **includeVectors?**: `boolean`

Include embedding vectors in results

---

### includeSources?

> `optional` **includeSources?**: `boolean`

Include full source objects in results

---

### topK?

> `optional` **topK?**: `number`

Number of results to return

---

### reranker?

> `optional` **reranker?**: [`RerankerConfig`](RerankerConfig.md)

Reranker configuration

---

### providerOptions?

> `optional` **providerOptions?**: [`VectorProviderOptions`](VectorProviderOptions.md)

Provider-specific options
