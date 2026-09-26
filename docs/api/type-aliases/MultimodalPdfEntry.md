[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalPdfEntry

# Type Alias: MultimodalPdfEntry

> **MultimodalPdfEntry** = `object`

Defined in: [types/file.ts:773](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L773)

A single PDF queued for multimodal message building, normalised from either
submission surface — `input.pdfFiles` or `input.content` with `type: "pdf"`
— so both can share the aggregate page/size guard (#309).

## Properties

### buffer

> **buffer**: `Buffer`

Defined in: [types/file.ts:775](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L775)

Raw PDF bytes.

---

### filename

> **filename**: `string`

Defined in: [types/file.ts:777](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L777)

Display name; may be a full path, so log only its basename.

---

### pageCount?

> `optional` **pageCount?**: `number` \| `null`

Defined in: [types/file.ts:783](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L783)

Page count when known. Null/undefined on the `input.content` path whenever
the caller omitted `metadata.pages`; the aggregate guard resolves those
from `buffer` rather than treating them as zero.

---

### password?

> `optional` **password?**: `string`

Defined in: [types/file.ts:785](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L785)

Password for an encrypted PDF (#258).

---

### maxCanvasPixels?

> `optional` **maxCanvasPixels?**: `number`

Defined in: [types/file.ts:787](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L787)

Per-page pixel ceiling for the image fallback (#260).

---

### scale?

> `optional` **scale?**: `number`

Defined in: [types/file.ts:789](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L789)

Render scale for the image fallback (#297).

---

### maxPages?

> `optional` **maxPages?**: `number`

Defined in: [types/file.ts:791](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L791)

Max pages converted by the image fallback (#297).
