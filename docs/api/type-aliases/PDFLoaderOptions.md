[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFLoaderOptions

# Type Alias: PDFLoaderOptions

> **PDFLoaderOptions** = [`LoaderOptions`](LoaderOptions.md) & `object`

Defined in: [types/rag.ts:590](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L590)

PDF loader options

## Type Declaration

### pageRange?

> `optional` **pageRange?**: `string`

Page range to extract (e.g., "1-5" or "1,3,5")

### extractImages?

> `optional` **extractImages?**: `boolean`

Extract images as base64

### enableOCR?

> `optional` **enableOCR?**: `boolean`

OCR for scanned documents

### preserveLayout?

> `optional` **preserveLayout?**: `boolean`

Preserve layout formatting
