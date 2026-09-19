[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionProgress

# Type Alias: PDFImageConversionProgress

> **PDFImageConversionProgress** = `object`

Defined in: [types/file.ts:611](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L611)

Progress reported per page during streaming conversion (#302).

## Properties

### pagesConverted

> **pagesConverted**: `number`

Defined in: [types/file.ts:613](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L613)

Number of pages successfully converted so far.

---

### totalPages

> **totalPages**: `number`

Defined in: [types/file.ts:615](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L615)

Total pages in the document (known up-front from the renderer).

---

### elapsedMs

> **elapsedMs**: `number`

Defined in: [types/file.ts:617](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L617)

Elapsed time since conversion started, in milliseconds.
