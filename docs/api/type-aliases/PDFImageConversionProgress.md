[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionProgress

# Type Alias: PDFImageConversionProgress

> **PDFImageConversionProgress** = `object`

Defined in: [types/file.ts:596](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L596)

Progress reported per page during streaming conversion (#302).

## Properties

### pagesConverted

> **pagesConverted**: `number`

Defined in: [types/file.ts:598](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L598)

Number of pages successfully converted so far.

---

### totalPages

> **totalPages**: `number`

Defined in: [types/file.ts:600](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L600)

Total pages in the document (known up-front from the renderer).

---

### elapsedMs

> **elapsedMs**: `number`

Defined in: [types/file.ts:602](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L602)

Elapsed time since conversion started, in milliseconds.
