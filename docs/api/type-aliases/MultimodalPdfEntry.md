[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalPdfEntry

# Type Alias: MultimodalPdfEntry

> **MultimodalPdfEntry** = `object`

Defined in: [types/file.ts:796](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L796)

A single PDF queued for multimodal message building, normalised from either
submission surface — `input.pdfFiles` or `input.content` with `type: "pdf"`
— so both can share the aggregate page/size guard (#309).

## Properties

### buffer

> **buffer**: `Buffer`

Defined in: [types/file.ts:798](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L798)

Raw PDF bytes.

---

### filename

> **filename**: `string`

Defined in: [types/file.ts:800](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L800)

Display name; may be a full path, so log only its basename.

---

### pageCount?

> `optional` **pageCount?**: `number` \| `null`

Defined in: [types/file.ts:806](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L806)

Page count when known. Null/undefined on the `input.content` path whenever
the caller omitted `metadata.pages`; the aggregate guard resolves those
from `buffer` rather than treating them as zero.

---

### password?

> `optional` **password?**: `string`

Defined in: [types/file.ts:808](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L808)

Password for an encrypted PDF (#258).

---

### maxCanvasPixels?

> `optional` **maxCanvasPixels?**: `number`

Defined in: [types/file.ts:810](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L810)

Per-page pixel ceiling for the image fallback (#260).

---

### scale?

> `optional` **scale?**: `number`

Defined in: [types/file.ts:812](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L812)

Render scale for the image fallback (#297).

---

### maxPages?

> `optional` **maxPages?**: `number`

Defined in: [types/file.ts:814](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L814)

Max pages converted by the image fallback (#297).
