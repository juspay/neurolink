[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionOptions

# Type Alias: PDFImageConversionOptions

> **PDFImageConversionOptions** = `object`

Options for converting PDF pages to images.

## Properties

### scale?

> `optional` **scale?**: `number`

Scale factor for image quality (1-4, default: 2)

---

### maxPages?

> `optional` **maxPages?**: `number`

Maximum number of pages to convert (default: 20 from PDF_LIMITS.DEFAULT_MAX_PAGES)

---

### format?

> `optional` **format?**: `"png"`

Output format (default: png). Only PNG is currently implemented by PDFProcessor.

---

### maxCanvasPixels?

> `optional` **maxCanvasPixels?**: `number`

Per-page pixel ceiling (#260). Any page whose width×height×scale² would
exceed this is uniformly downscaled to stay under it, preventing a huge
page from allocating gigabytes of canvas. Default: PDF_LIMITS.DEFAULT_MAX_CANVAS_PIXELS.

---

### password?

> `optional` **password?**: `string`

Password for an encrypted PDF (passed to the underlying renderer) (#258).

---

### onProgress?

> `optional` **onProgress?**: (`progress`) => `void` \| `Promise`\<`void`\>

Per-page progress callback invoked as each page is rendered (#302).

#### Parameters

##### progress

[`PDFImageConversionProgress`](PDFImageConversionProgress.md)

#### Returns

`void` \| `Promise`\<`void`\>
