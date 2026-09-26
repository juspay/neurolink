[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionProgress

# Type Alias: PDFImageConversionProgress

> **PDFImageConversionProgress** = `object`

Defined in: [types/file.ts:714](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L714)

Progress reported per page during streaming conversion (#302).

## Properties

### pagesConverted

> **pagesConverted**: `number`

Defined in: [types/file.ts:716](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L716)

Number of pages successfully converted so far.

---

### totalPages

> **totalPages**: `number`

Defined in: [types/file.ts:718](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L718)

Total pages in the document (known up-front from the renderer).

---

### elapsedMs

> **elapsedMs**: `number`

Defined in: [types/file.ts:720](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L720)

Elapsed time since conversion started, in milliseconds.
