[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionOptions

# Type Alias: PDFImageConversionOptions

> **PDFImageConversionOptions** = `object`

Defined in: [types/file.ts:802](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L802)

Options for converting PDF pages to images.

## Properties

### scale?

> `optional` **scale?**: `number`

Defined in: [types/file.ts:804](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L804)

Scale factor for image quality (1-4, default: 2)

---

### maxPages?

> `optional` **maxPages?**: `number`

Defined in: [types/file.ts:806](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L806)

Maximum number of pages to convert (default: 20 from PDF_LIMITS.DEFAULT_MAX_PAGES)

---

### format?

> `optional` **format?**: `"png"`

Defined in: [types/file.ts:808](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L808)

Output format (default: png). Only PNG is currently implemented by PDFProcessor.

---

### maxCanvasPixels?

> `optional` **maxCanvasPixels?**: `number`

Defined in: [types/file.ts:814](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L814)

Per-page pixel ceiling (#260). Any page whose width×height×scale² would
exceed this is uniformly downscaled to stay under it, preventing a huge
page from allocating gigabytes of canvas. Default: PDF_LIMITS.DEFAULT_MAX_CANVAS_PIXELS.

---

### password?

> `optional` **password?**: `string`

Defined in: [types/file.ts:816](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L816)

Password for an encrypted PDF (passed to the underlying renderer) (#258).

---

### onProgress?

> `optional` **onProgress?**: (`progress`) => `void` \| `Promise`\<`void`\>

Defined in: [types/file.ts:818](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L818)

Per-page progress callback invoked as each page is rendered (#302).

#### Parameters

##### progress

[`PDFImageConversionProgress`](PDFImageConversionProgress.md)

#### Returns

`void` \| `Promise`\<`void`\>
