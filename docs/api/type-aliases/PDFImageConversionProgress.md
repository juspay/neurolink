[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionProgress

# Type Alias: PDFImageConversionProgress

> **PDFImageConversionProgress** = `object`

Defined in: [types/file.ts:634](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L634)

Progress reported per page during streaming conversion (#302).

## Properties

### pagesConverted

> **pagesConverted**: `number`

Defined in: [types/file.ts:636](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L636)

Number of pages successfully converted so far.

---

### totalPages

> **totalPages**: `number`

Defined in: [types/file.ts:638](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L638)

Total pages in the document (known up-front from the renderer).

---

### elapsedMs

> **elapsedMs**: `number`

Defined in: [types/file.ts:640](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L640)

Elapsed time since conversion started, in milliseconds.
