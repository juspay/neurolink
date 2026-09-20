[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultiModalRAGConfig

# Type Alias: MultiModalRAGConfig

> **MultiModalRAGConfig** = `object`

Defined in: [types/rag.ts:1710](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1710)

Multi-modal RAG pipeline configuration extension.
Passed alongside RAGPipelineConfig to enable multi-modal features.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/rag.ts:1712](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1712)

Whether multi-modal RAG is enabled

---

### embeddingModel

> **embeddingModel**: [`MultiModalEmbeddingConfig`](MultiModalEmbeddingConfig.md)

Defined in: [types/rag.ts:1714](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1714)

Embedding model for multi-modal content

---

### imageTextStrategy?

> `optional` **imageTextStrategy?**: `"caption"` \| `"filename"` \| `"none"`

Defined in: [types/rag.ts:1716](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1716)

How to generate text from images for indexing: "caption" uses LLM vision, "filename" uses filename, "none" skips text

---

### maxImageSize?

> `optional` **maxImageSize?**: `number`

Defined in: [types/rag.ts:1718](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1718)

Maximum image file size in bytes (default: 10MB)

---

### supportedFormats?

> `optional` **supportedFormats?**: `string`[]

Defined in: [types/rag.ts:1720](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1720)

Supported image MIME types

---

### captionProvider?

> `optional` **captionProvider?**: `string`

Defined in: [types/rag.ts:1722](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1722)

Provider for generating image captions (used with imageTextStrategy: "caption")

---

### captionModel?

> `optional` **captionModel?**: `string`

Defined in: [types/rag.ts:1724](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1724)

Model for generating image captions
