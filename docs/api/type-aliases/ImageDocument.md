[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageDocument

# Type Alias: ImageDocument

> **ImageDocument** = `object`

Image document loaded for RAG ingestion

## Properties

### id

> **id**: `string`

Unique identifier for this image document

---

### text

> **text**: `string`

Text representation (filename, alt text, or caption)

---

### image

> **image**: `Buffer`

Raw image data

---

### mimeType

> **mimeType**: `string`

Image MIME type

---

### metadata

> **metadata**: `object`

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
