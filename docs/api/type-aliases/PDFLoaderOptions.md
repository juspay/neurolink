[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFLoaderOptions

# Type Alias: PDFLoaderOptions

> **PDFLoaderOptions** = [`LoaderOptions`](LoaderOptions.md) & `object`

Defined in: [types/rag.ts:571](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L571)

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
