[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalPdfEntry

# Type Alias: MultimodalPdfEntry

> **MultimodalPdfEntry** = `object`

A single PDF queued for multimodal message building, normalised from either
submission surface — `input.pdfFiles` or `input.content` with `type: "pdf"`
— so both can share the aggregate page/size guard (#309).

## Properties

### buffer

> **buffer**: `Buffer`

Raw PDF bytes.

---

### filename

> **filename**: `string`

Display name; may be a full path, so log only its basename.

---

### pageCount?

> `optional` **pageCount?**: `number` \| `null`

Page count when known. Null/undefined on the `input.content` path whenever
the caller omitted `metadata.pages`; the aggregate guard resolves those
from `buffer` rather than treating them as zero.

---

### password?

> `optional` **password?**: `string`

Password for an encrypted PDF (#258).

---

### maxCanvasPixels?

> `optional` **maxCanvasPixels?**: `number`

Per-page pixel ceiling for the image fallback (#260).

---

### scale?

> `optional` **scale?**: `number`

Render scale for the image fallback (#297).

---

### maxPages?

> `optional` **maxPages?**: `number`

Max pages converted by the image fallback (#297).
