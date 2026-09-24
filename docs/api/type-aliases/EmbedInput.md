[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EmbedInput

# Type Alias: EmbedInput

> **EmbedInput** = `object`

Defined in: [types/providers.ts:113](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L113)

Multi-modal embedding input — accepts text, image, or both.
Used by providers that support multi-modal embeddings (e.g. Bedrock Titan Image, Nova Multimodal).

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:115](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L115)

Text content to embed

---

### image?

> `optional` **image?**: `Buffer` \| `string`

Defined in: [types/providers.ts:117](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L117)

Image data as Buffer or base64 string

---

### mimeType?

> `optional` **mimeType?**: `string`

Defined in: [types/providers.ts:119](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L119)

MIME type of the image (e.g. "image/png", "image/jpeg")
