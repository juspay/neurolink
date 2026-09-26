[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RawFileInput

# Type Alias: RawFileInput

> **RawFileInput** = `object`

Raw file input before text extraction.

## Properties

### content

> **content**: `string` \| `Buffer`

File content -- either a UTF-8 string or a raw Buffer

---

### mimeType

> **mimeType**: `string`

MIME type (e.g. "application/pdf", "text/plain")

---

### fileName

> **fileName**: `string`

Display file name

---

### originalSize?

> `optional` **originalSize?**: `number`

Original byte size on disk (optional)
