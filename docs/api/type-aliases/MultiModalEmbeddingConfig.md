[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultiModalEmbeddingConfig

# Type Alias: MultiModalEmbeddingConfig

> **MultiModalEmbeddingConfig** = `object`

Defined in: [types/rag.ts:1658](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1658)

Multi-modal embedding model configuration

## Properties

### provider

> **provider**: `string`

Defined in: [types/rag.ts:1660](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1660)

Provider name (e.g. "bedrock")

---

### modelName

> **modelName**: `string`

Defined in: [types/rag.ts:1662](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1662)

Model name (e.g. "amazon.titan-embed-image-v1")

---

### modality

> **modality**: [`EmbeddingModality`](EmbeddingModality.md)

Defined in: [types/rag.ts:1664](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1664)

What modalities this model supports

---

### dimensions?

> `optional` **dimensions?**: `number`

Defined in: [types/rag.ts:1666](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1666)

Embedding dimension (e.g. 1024 for Titan Image)
