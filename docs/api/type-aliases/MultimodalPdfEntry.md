[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalPdfEntry

# Type Alias: MultimodalPdfEntry

> **MultimodalPdfEntry** = `object`

Defined in: [types/file.ts:754](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L754)

A single PDF queued for multimodal message building, normalised from either
submission surface — `input.pdfFiles` or `input.content` with `type: "pdf"`
— so both can share the aggregate page/size guard (#309).

## Properties

### buffer

> **buffer**: `Buffer`

Defined in: [types/file.ts:756](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L756)

Raw PDF bytes.

---

### filename

> **filename**: `string`

Defined in: [types/file.ts:758](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L758)

Display name; may be a full path, so log only its basename.

---

### pageCount?

> `optional` **pageCount?**: `number` \| `null`

Defined in: [types/file.ts:764](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L764)

Page count when known. Null/undefined on the `input.content` path whenever
the caller omitted `metadata.pages`; the aggregate guard resolves those
from `buffer` rather than treating them as zero.

---

### password?

> `optional` **password?**: `string`

Defined in: [types/file.ts:766](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L766)

Password for an encrypted PDF (#258).

---

### maxCanvasPixels?

> `optional` **maxCanvasPixels?**: `number`

Defined in: [types/file.ts:768](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L768)

Per-page pixel ceiling for the image fallback (#260).

---

### scale?

> `optional` **scale?**: `number`

Defined in: [types/file.ts:770](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L770)

Render scale for the image fallback (#297).

---

### maxPages?

> `optional` **maxPages?**: `number`

Defined in: [types/file.ts:772](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L772)

Max pages converted by the image fallback (#297).
