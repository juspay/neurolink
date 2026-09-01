[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultiModalRAGConfig

# Type Alias: MultiModalRAGConfig

> **MultiModalRAGConfig** = `object`

Defined in: [types/rag.ts:1691](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1691)

Multi-modal RAG pipeline configuration extension.
Passed alongside RAGPipelineConfig to enable multi-modal features.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/rag.ts:1693](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1693)

Whether multi-modal RAG is enabled

---

### embeddingModel

> **embeddingModel**: [`MultiModalEmbeddingConfig`](MultiModalEmbeddingConfig.md)

Defined in: [types/rag.ts:1695](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1695)

Embedding model for multi-modal content

---

### imageTextStrategy?

> `optional` **imageTextStrategy?**: `"caption"` \| `"filename"` \| `"none"`

Defined in: [types/rag.ts:1697](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1697)

How to generate text from images for indexing: "caption" uses LLM vision, "filename" uses filename, "none" skips text

---

### maxImageSize?

> `optional` **maxImageSize?**: `number`

Defined in: [types/rag.ts:1699](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1699)

Maximum image file size in bytes (default: 10MB)

---

### supportedFormats?

> `optional` **supportedFormats?**: `string`[]

Defined in: [types/rag.ts:1701](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1701)

Supported image MIME types

---

### captionProvider?

> `optional` **captionProvider?**: `string`

Defined in: [types/rag.ts:1703](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1703)

Provider for generating image captions (used with imageTextStrategy: "caption")

---

### captionModel?

> `optional` **captionModel?**: `string`

Defined in: [types/rag.ts:1705](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1705)

Model for generating image captions
