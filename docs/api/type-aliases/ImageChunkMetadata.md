[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageChunkMetadata

# Type Alias: ImageChunkMetadata

> **ImageChunkMetadata** = `object`

Defined in: [types/rag.ts:1653](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1653)

Image metadata attached to multi-modal chunks

## Properties

### width?

> `optional` **width?**: `number`

Defined in: [types/rag.ts:1655](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1655)

Image width in pixels

---

### height?

> `optional` **height?**: `number`

Defined in: [types/rag.ts:1657](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1657)

Image height in pixels

---

### mimeType?

> `optional` **mimeType?**: `string`

Defined in: [types/rag.ts:1659](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1659)

Image MIME type

---

### format?

> `optional` **format?**: `string`

Defined in: [types/rag.ts:1661](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1661)

Image format (jpeg, png, webp, etc.)

---

### source?

> `optional` **source?**: `string`

Defined in: [types/rag.ts:1663](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1663)

Original file path or URL

---

### hasImage

> **hasImage**: `boolean`

Defined in: [types/rag.ts:1665](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1665)

Whether this chunk contains image data
