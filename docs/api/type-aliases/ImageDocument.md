[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageDocument

# Type Alias: ImageDocument

> **ImageDocument** = `object`

Defined in: [types/rag.ts:1749](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1749)

Image document loaded for RAG ingestion

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:1751](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1751)

Unique identifier for this image document

---

### text

> **text**: `string`

Defined in: [types/rag.ts:1753](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1753)

Text representation (filename, alt text, or caption)

---

### image

> **image**: `Buffer`

Defined in: [types/rag.ts:1755](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1755)

Raw image data

---

### mimeType

> **mimeType**: `string`

Defined in: [types/rag.ts:1757](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1757)

Image MIME type

---

### metadata

> **metadata**: `object`

Defined in: [types/rag.ts:1759](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1759)

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
