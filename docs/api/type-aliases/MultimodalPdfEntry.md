[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalPdfEntry

# Type Alias: MultimodalPdfEntry

> **MultimodalPdfEntry** = `object`

Defined in: [types/file.ts:862](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L862)

A single PDF queued for multimodal message building, normalised from either
submission surface — `input.pdfFiles` or `input.content` with `type: "pdf"`
— so both can share the aggregate page/size guard (#309).

## Properties

### buffer

> **buffer**: `Buffer`

Defined in: [types/file.ts:864](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L864)

Raw PDF bytes.

---

### filename

> **filename**: `string`

Defined in: [types/file.ts:866](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L866)

Display name; may be a full path, so log only its basename.

---

### pageCount?

> `optional` **pageCount?**: `number` \| `null`

Defined in: [types/file.ts:872](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L872)

Page count when known. Null/undefined on the `input.content` path whenever
the caller omitted `metadata.pages`; the aggregate guard resolves those
from `buffer` rather than treating them as zero.

---

### password?

> `optional` **password?**: `string`

Defined in: [types/file.ts:874](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L874)

Password for an encrypted PDF (#258).

---

### maxCanvasPixels?

> `optional` **maxCanvasPixels?**: `number`

Defined in: [types/file.ts:876](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L876)

Per-page pixel ceiling for the image fallback (#260).

---

### scale?

> `optional` **scale?**: `number`

Defined in: [types/file.ts:878](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L878)

Render scale for the image fallback (#297).

---

### maxPages?

> `optional` **maxPages?**: `number`

Defined in: [types/file.ts:880](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L880)

Max pages converted by the image fallback (#297).
