[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFLoaderOptions

# Type Alias: PDFLoaderOptions

> **PDFLoaderOptions** = [`LoaderOptions`](LoaderOptions.md) & `object`

Defined in: [types/rag.ts:571](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L571)

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
