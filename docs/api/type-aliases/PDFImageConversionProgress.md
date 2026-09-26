[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionProgress

# Type Alias: PDFImageConversionProgress

> **PDFImageConversionProgress** = `object`

Defined in: [types/file.ts:756](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L756)

Progress reported per page during streaming conversion (#302).

## Properties

### pagesConverted

> **pagesConverted**: `number`

Defined in: [types/file.ts:758](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L758)

Number of pages successfully converted so far.

---

### totalPages

> **totalPages**: `number`

Defined in: [types/file.ts:760](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L760)

Total pages in the document (known up-front from the renderer).

---

### elapsedMs

> **elapsedMs**: `number`

Defined in: [types/file.ts:762](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L762)

Elapsed time since conversion started, in milliseconds.
