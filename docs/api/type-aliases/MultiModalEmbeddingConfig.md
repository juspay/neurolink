[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultiModalEmbeddingConfig

# Type Alias: MultiModalEmbeddingConfig

> **MultiModalEmbeddingConfig** = `object`

Defined in: [types/rag.ts:1639](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1639)

Multi-modal embedding model configuration

## Properties

### provider

> **provider**: `string`

Defined in: [types/rag.ts:1641](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1641)

Provider name (e.g. "bedrock")

---

### modelName

> **modelName**: `string`

Defined in: [types/rag.ts:1643](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1643)

Model name (e.g. "amazon.titan-embed-image-v1")

---

### modality

> **modality**: [`EmbeddingModality`](EmbeddingModality.md)

Defined in: [types/rag.ts:1645](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1645)

What modalities this model supports

---

### dimensions?

> `optional` **dimensions?**: `number`

Defined in: [types/rag.ts:1647](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1647)

Embedding dimension (e.g. 1024 for Titan Image)
