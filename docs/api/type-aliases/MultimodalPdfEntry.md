[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalPdfEntry

# Type Alias: MultimodalPdfEntry

> **MultimodalPdfEntry** = `object`

Defined in: [types/file.ts:633](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L633)

A single PDF queued for multimodal message building, normalised from either
submission surface — `input.pdfFiles` or `input.content` with `type: "pdf"`
— so both can share the aggregate page/size guard (#309).

## Properties

### buffer

> **buffer**: `Buffer`

Defined in: [types/file.ts:635](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L635)

Raw PDF bytes.

---

### filename

> **filename**: `string`

Defined in: [types/file.ts:637](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L637)

Display name; may be a full path, so log only its basename.

---

### pageCount?

> `optional` **pageCount?**: `number` \| `null`

Defined in: [types/file.ts:643](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L643)

Page count when known. Null/undefined on the `input.content` path whenever
the caller omitted `metadata.pages`; the aggregate guard resolves those
from `buffer` rather than treating them as zero.

---

### password?

> `optional` **password?**: `string`

Defined in: [types/file.ts:645](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L645)

Password for an encrypted PDF (#258).

---

### maxCanvasPixels?

> `optional` **maxCanvasPixels?**: `number`

Defined in: [types/file.ts:647](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L647)

Per-page pixel ceiling for the image fallback (#260).

---

### scale?

> `optional` **scale?**: `number`

Defined in: [types/file.ts:649](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L649)

Render scale for the image fallback (#297).

---

### maxPages?

> `optional` **maxPages?**: `number`

Defined in: [types/file.ts:651](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L651)

Max pages converted by the image fallback (#297).
