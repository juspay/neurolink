[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionProgress

# Type Alias: PDFImageConversionProgress

> **PDFImageConversionProgress** = `object`

Defined in: [types/file.ts:607](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L607)

Progress reported per page during streaming conversion (#302).

## Properties

### pagesConverted

> **pagesConverted**: `number`

Defined in: [types/file.ts:609](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L609)

Number of pages successfully converted so far.

---

### totalPages

> **totalPages**: `number`

Defined in: [types/file.ts:611](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L611)

Total pages in the document (known up-front from the renderer).

---

### elapsedMs

> **elapsedMs**: `number`

Defined in: [types/file.ts:613](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L613)

Elapsed time since conversion started, in milliseconds.
