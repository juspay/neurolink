[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileExtractionResult

# Type Alias: FileExtractionResult

> **FileExtractionResult** = `object`

Result of targeted content extraction.
May contain text, images, or both depending on the extraction type.

## Properties

### success

> **success**: `boolean`

Whether the extraction succeeded

---

### text?

> `optional` **text?**: `string`

Extracted text content

---

### images?

> `optional` **images?**: `Buffer`[]

Extracted images as JPEG buffers (e.g., video frames, slide renders)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Metadata about the extraction

---

### error?

> `optional` **error?**: `string`

Error message if extraction failed
