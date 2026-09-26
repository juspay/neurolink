[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionOptions

# Type Alias: PDFImageConversionOptions

> **PDFImageConversionOptions** = `object`

Defined in: [types/file.ts:736](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L736)

Options for converting PDF pages to images.

## Properties

### scale?

> `optional` **scale?**: `number`

Defined in: [types/file.ts:738](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L738)

Scale factor for image quality (1-4, default: 2)

---

### maxPages?

> `optional` **maxPages?**: `number`

Defined in: [types/file.ts:740](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L740)

Maximum number of pages to convert (default: 20 from PDF_LIMITS.DEFAULT_MAX_PAGES)

---

### format?

> `optional` **format?**: `"png"`

Defined in: [types/file.ts:742](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L742)

Output format (default: png). Only PNG is currently implemented by PDFProcessor.

---

### maxCanvasPixels?

> `optional` **maxCanvasPixels?**: `number`

Defined in: [types/file.ts:748](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L748)

Per-page pixel ceiling (#260). Any page whose width×height×scale² would
exceed this is uniformly downscaled to stay under it, preventing a huge
page from allocating gigabytes of canvas. Default: PDF_LIMITS.DEFAULT_MAX_CANVAS_PIXELS.

---

### password?

> `optional` **password?**: `string`

Defined in: [types/file.ts:750](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L750)

Password for an encrypted PDF (passed to the underlying renderer) (#258).

---

### onProgress?

> `optional` **onProgress?**: (`progress`) => `void` \| `Promise`\<`void`\>

Defined in: [types/file.ts:752](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L752)

Per-page progress callback invoked as each page is rendered (#302).

#### Parameters

##### progress

[`PDFImageConversionProgress`](PDFImageConversionProgress.md)

#### Returns

`void` \| `Promise`\<`void`\>
