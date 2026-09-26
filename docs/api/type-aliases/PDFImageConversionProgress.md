[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionProgress

# Type Alias: PDFImageConversionProgress

> **PDFImageConversionProgress** = `object`

Progress reported per page during streaming conversion (#302).

## Properties

### pagesConverted

> **pagesConverted**: `number`

Number of pages successfully converted so far.

---

### totalPages

> **totalPages**: `number`

Total pages in the document (known up-front from the renderer).

---

### elapsedMs

> **elapsedMs**: `number`

Elapsed time since conversion started, in milliseconds.
