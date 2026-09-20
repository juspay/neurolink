[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageDocument

# Type Alias: ImageDocument

> **ImageDocument** = `object`

Defined in: [types/rag.ts:1768](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1768)

Image document loaded for RAG ingestion

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:1770](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1770)

Unique identifier for this image document

---

### text

> **text**: `string`

Defined in: [types/rag.ts:1772](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1772)

Text representation (filename, alt text, or caption)

---

### image

> **image**: `Buffer`

Defined in: [types/rag.ts:1774](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1774)

Raw image data

---

### mimeType

> **mimeType**: `string`

Defined in: [types/rag.ts:1776](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1776)

Image MIME type

---

### metadata

> **metadata**: `object`

Defined in: [types/rag.ts:1778](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1778)

Metadata about the image

#### source

> **source**: `string`

Original file path or URL

#### width?

> `optional` **width?**: `number`

Image width in pixels (if detectable)

#### height?

> `optional` **height?**: `number`

Image height in pixels (if detectable)

#### format?

> `optional` **format?**: `string`

Image format (jpeg, png, webp, etc.)

#### size

> **size**: `number`

File size in bytes
