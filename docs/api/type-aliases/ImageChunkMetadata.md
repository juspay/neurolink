[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageChunkMetadata

# Type Alias: ImageChunkMetadata

> **ImageChunkMetadata** = `object`

Defined in: [types/rag.ts:1672](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1672)

Image metadata attached to multi-modal chunks

## Properties

### width?

> `optional` **width?**: `number`

Defined in: [types/rag.ts:1674](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1674)

Image width in pixels

---

### height?

> `optional` **height?**: `number`

Defined in: [types/rag.ts:1676](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1676)

Image height in pixels

---

### mimeType?

> `optional` **mimeType?**: `string`

Defined in: [types/rag.ts:1678](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1678)

Image MIME type

---

### format?

> `optional` **format?**: `string`

Defined in: [types/rag.ts:1680](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1680)

Image format (jpeg, png, webp, etc.)

---

### source?

> `optional` **source?**: `string`

Defined in: [types/rag.ts:1682](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1682)

Original file path or URL

---

### hasImage

> **hasImage**: `boolean`

Defined in: [types/rag.ts:1684](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1684)

Whether this chunk contains image data
