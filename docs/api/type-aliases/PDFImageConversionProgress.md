[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionProgress

# Type Alias: PDFImageConversionProgress

> **PDFImageConversionProgress** = `object`

Defined in: [types/file.ts:694](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L694)

Progress reported per page during streaming conversion (#302).

## Properties

### pagesConverted

> **pagesConverted**: `number`

Defined in: [types/file.ts:696](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L696)

Number of pages successfully converted so far.

---

### totalPages

> **totalPages**: `number`

Defined in: [types/file.ts:698](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L698)

Total pages in the document (known up-front from the renderer).

---

### elapsedMs

> **elapsedMs**: `number`

Defined in: [types/file.ts:700](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L700)

Elapsed time since conversion started, in milliseconds.
