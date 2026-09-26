[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionProgress

# Type Alias: PDFImageConversionProgress

> **PDFImageConversionProgress** = `object`

Defined in: [types/file.ts:733](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L733)

Progress reported per page during streaming conversion (#302).

## Properties

### pagesConverted

> **pagesConverted**: `number`

Defined in: [types/file.ts:735](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L735)

Number of pages successfully converted so far.

---

### totalPages

> **totalPages**: `number`

Defined in: [types/file.ts:737](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L737)

Total pages in the document (known up-front from the renderer).

---

### elapsedMs

> **elapsedMs**: `number`

Defined in: [types/file.ts:739](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L739)

Elapsed time since conversion started, in milliseconds.
