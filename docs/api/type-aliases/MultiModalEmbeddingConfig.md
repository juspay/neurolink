[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultiModalEmbeddingConfig

# Type Alias: MultiModalEmbeddingConfig

> **MultiModalEmbeddingConfig** = `object`

Multi-modal embedding model configuration

## Properties

### provider

> **provider**: `string`

Provider name (e.g. "bedrock")

---

### modelName

> **modelName**: `string`

Model name (e.g. "amazon.titan-embed-image-v1")

---

### modality

> **modality**: [`EmbeddingModality`](EmbeddingModality.md)

What modalities this model supports

---

### dimensions?

> `optional` **dimensions?**: `number`

Embedding dimension (e.g. 1024 for Titan Image)
