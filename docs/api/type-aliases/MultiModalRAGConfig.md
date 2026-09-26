[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultiModalRAGConfig

# Type Alias: MultiModalRAGConfig

> **MultiModalRAGConfig** = `object`

Multi-modal RAG pipeline configuration extension.
Passed alongside RAGPipelineConfig to enable multi-modal features.

## Properties

### enabled

> **enabled**: `boolean`

Whether multi-modal RAG is enabled

---

### embeddingModel

> **embeddingModel**: [`MultiModalEmbeddingConfig`](MultiModalEmbeddingConfig.md)

Embedding model for multi-modal content

---

### imageTextStrategy?

> `optional` **imageTextStrategy?**: `"caption"` \| `"filename"` \| `"none"`

How to generate text from images for indexing: "caption" uses LLM vision, "filename" uses filename, "none" skips text

---

### maxImageSize?

> `optional` **maxImageSize?**: `number`

Maximum image file size in bytes (default: 10MB)

---

### supportedFormats?

> `optional` **supportedFormats?**: `string`[]

Supported image MIME types

---

### captionProvider?

> `optional` **captionProvider?**: `string`

Provider for generating image captions (used with imageTextStrategy: "caption")

---

### captionModel?

> `optional` **captionModel?**: `string`

Model for generating image captions
