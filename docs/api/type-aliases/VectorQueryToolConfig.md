[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorQueryToolConfig

# Type Alias: VectorQueryToolConfig

> **VectorQueryToolConfig** = `object`

Defined in: [types/rag.ts:1273](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1273)

Vector query tool configuration

## Properties

### id?

> `optional` **id?**: `string`

Defined in: [types/rag.ts:1275](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1275)

Tool identifier

---

### description?

> `optional` **description?**: `string`

Defined in: [types/rag.ts:1277](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1277)

Tool description for AI agents

---

### indexName

> **indexName**: `string`

Defined in: [types/rag.ts:1279](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1279)

Index name within the vector store

---

### embeddingModel

> **embeddingModel**: `object`

Defined in: [types/rag.ts:1281](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1281)

Embedding model specification

#### provider

> **provider**: `string`

#### modelName

> **modelName**: `string`

---

### enableFilter?

> `optional` **enableFilter?**: `boolean`

Defined in: [types/rag.ts:1286](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1286)

Enable metadata filtering

---

### includeVectors?

> `optional` **includeVectors?**: `boolean`

Defined in: [types/rag.ts:1288](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1288)

Include embedding vectors in results

---

### includeSources?

> `optional` **includeSources?**: `boolean`

Defined in: [types/rag.ts:1290](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1290)

Include full source objects in results

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1292](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1292)

Number of results to return

---

### reranker?

> `optional` **reranker?**: [`RerankerConfig`](RerankerConfig.md)

Defined in: [types/rag.ts:1294](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1294)

Reranker configuration

---

### providerOptions?

> `optional` **providerOptions?**: [`VectorProviderOptions`](VectorProviderOptions.md)

Defined in: [types/rag.ts:1296](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1296)

Provider-specific options
