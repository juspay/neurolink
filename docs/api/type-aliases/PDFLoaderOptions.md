[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFLoaderOptions

# Type Alias: PDFLoaderOptions

> **PDFLoaderOptions** = [`LoaderOptions`](LoaderOptions.md) & `object`

Defined in: [types/rag.ts:531](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L531)

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
