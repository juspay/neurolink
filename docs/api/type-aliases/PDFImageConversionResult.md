[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionResult

# Type Alias: PDFImageConversionResult

> **PDFImageConversionResult** = `object`

Defined in: [types/file.ts:795](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L795)

Result of PDF to image conversion.

## Properties

### images

> **images**: `string`[]

Defined in: [types/file.ts:797](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L797)

Array of base64-encoded PNG images (one per successfully converted page)

---

### pageCount

> **pageCount**: `number`

Defined in: [types/file.ts:799](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L799)

Number of pages converted

---

### conversionTimeMs

> **conversionTimeMs**: `number`

Defined in: [types/file.ts:801](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L801)

Total conversion time in milliseconds

---

### warnings?

> `optional` **warnings?**: `string`[]

Defined in: [types/file.ts:803](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L803)

Any warnings during conversion

---

### errors?

> `optional` **errors?**: `object`[]

Defined in: [types/file.ts:805](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L805)

Per-page failures — present only when some pages failed to render (#294).

#### page

> **page**: `number`

#### error

> **error**: `string`
