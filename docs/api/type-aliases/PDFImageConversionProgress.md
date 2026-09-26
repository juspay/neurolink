[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionProgress

# Type Alias: PDFImageConversionProgress

> **PDFImageConversionProgress** = `object`

Defined in: [types/file.ts:626](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L626)

Progress reported per page during streaming conversion (#302).

## Properties

### pagesConverted

> **pagesConverted**: `number`

Defined in: [types/file.ts:628](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L628)

Number of pages successfully converted so far.

---

### totalPages

> **totalPages**: `number`

Defined in: [types/file.ts:630](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L630)

Total pages in the document (known up-front from the renderer).

---

### elapsedMs

> **elapsedMs**: `number`

Defined in: [types/file.ts:632](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L632)

Elapsed time since conversion started, in milliseconds.
