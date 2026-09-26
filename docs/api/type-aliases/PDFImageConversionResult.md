[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionResult

# Type Alias: PDFImageConversionResult

> **PDFImageConversionResult** = `object`

Result of PDF to image conversion.

## Properties

### images

> **images**: `string`[]

Array of base64-encoded PNG images (one per successfully converted page)

---

### pageCount

> **pageCount**: `number`

Number of pages converted

---

### conversionTimeMs

> **conversionTimeMs**: `number`

Total conversion time in milliseconds

---

### warnings?

> `optional` **warnings?**: `string`[]

Any warnings during conversion

---

### errors?

> `optional` **errors?**: `object`[]

Per-page failures — present only when some pages failed to render (#294).

#### page

> **page**: `number`

#### error

> **error**: `string`
