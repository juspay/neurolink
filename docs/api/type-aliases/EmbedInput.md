[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EmbedInput

# Type Alias: EmbedInput

> **EmbedInput** = `object`

Multi-modal embedding input — accepts text, image, or both.
Used by providers that support multi-modal embeddings (e.g. Bedrock Titan Image, Nova Multimodal).

## Properties

### text?

> `optional` **text?**: `string`

Text content to embed

---

### image?

> `optional` **image?**: `Buffer` \| `string`

Image data as Buffer or base64 string

---

### mimeType?

> `optional` **mimeType?**: `string`

MIME type of the image (e.g. "image/png", "image/jpeg")
