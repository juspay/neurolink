[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionProgress

# Type Alias: PDFImageConversionProgress

> **PDFImageConversionProgress** = `object`

Defined in: [types/file.ts:771](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L771)

Progress reported per page during streaming conversion (#302).

## Properties

### pagesConverted

> **pagesConverted**: `number`

Defined in: [types/file.ts:773](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L773)

Number of pages successfully converted so far.

---

### totalPages

> **totalPages**: `number`

Defined in: [types/file.ts:775](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L775)

Total pages in the document (known up-front from the renderer).

---

### elapsedMs

> **elapsedMs**: `number`

Defined in: [types/file.ts:777](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L777)

Elapsed time since conversion started, in milliseconds.
