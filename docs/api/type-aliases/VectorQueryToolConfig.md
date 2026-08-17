[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorQueryToolConfig

# Type Alias: VectorQueryToolConfig

> **VectorQueryToolConfig** = `object`

Defined in: [types/rag.ts:1254](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1254)

Vector query tool configuration

## Properties

### id?

> `optional` **id?**: `string`

Defined in: [types/rag.ts:1256](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1256)

Tool identifier

---

### description?

> `optional` **description?**: `string`

Defined in: [types/rag.ts:1258](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1258)

Tool description for AI agents

---

### indexName

> **indexName**: `string`

Defined in: [types/rag.ts:1260](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1260)

Index name within the vector store

---

### embeddingModel

> **embeddingModel**: `object`

Defined in: [types/rag.ts:1262](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1262)

Embedding model specification

#### provider

> **provider**: `string`

#### modelName

> **modelName**: `string`

---

### enableFilter?

> `optional` **enableFilter?**: `boolean`

Defined in: [types/rag.ts:1267](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1267)

Enable metadata filtering

---

### includeVectors?

> `optional` **includeVectors?**: `boolean`

Defined in: [types/rag.ts:1269](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1269)

Include embedding vectors in results

---

### includeSources?

> `optional` **includeSources?**: `boolean`

Defined in: [types/rag.ts:1271](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1271)

Include full source objects in results

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1273](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1273)

Number of results to return

---

### reranker?

> `optional` **reranker?**: [`RerankerConfig`](RerankerConfig.md)

Defined in: [types/rag.ts:1275](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1275)

Reranker configuration

---

### providerOptions?

> `optional` **providerOptions?**: [`VectorProviderOptions`](VectorProviderOptions.md)

Defined in: [types/rag.ts:1277](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1277)

Provider-specific options
