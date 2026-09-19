[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalPdfEntry

# Type Alias: MultimodalPdfEntry

> **MultimodalPdfEntry** = `object`

Defined in: [types/file.ts:637](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L637)

A single PDF queued for multimodal message building, normalised from either
submission surface — `input.pdfFiles` or `input.content` with `type: "pdf"`
— so both can share the aggregate page/size guard (#309).

## Properties

### buffer

> **buffer**: `Buffer`

Defined in: [types/file.ts:639](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L639)

Raw PDF bytes.

---

### filename

> **filename**: `string`

Defined in: [types/file.ts:641](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L641)

Display name; may be a full path, so log only its basename.

---

### pageCount?

> `optional` **pageCount?**: `number` \| `null`

Defined in: [types/file.ts:647](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L647)

Page count when known. Null/undefined on the `input.content` path whenever
the caller omitted `metadata.pages`; the aggregate guard resolves those
from `buffer` rather than treating them as zero.

---

### password?

> `optional` **password?**: `string`

Defined in: [types/file.ts:649](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L649)

Password for an encrypted PDF (#258).

---

### maxCanvasPixels?

> `optional` **maxCanvasPixels?**: `number`

Defined in: [types/file.ts:651](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L651)

Per-page pixel ceiling for the image fallback (#260).

---

### scale?

> `optional` **scale?**: `number`

Defined in: [types/file.ts:653](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L653)

Render scale for the image fallback (#297).

---

### maxPages?

> `optional` **maxPages?**: `number`

Defined in: [types/file.ts:655](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L655)

Max pages converted by the image fallback (#297).
