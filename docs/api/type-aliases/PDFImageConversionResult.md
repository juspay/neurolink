[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionResult

# Type Alias: PDFImageConversionResult

> **PDFImageConversionResult** = `object`

Defined in: [types/file.ts:742](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L742)

Result of PDF to image conversion.

## Properties

### images

> **images**: `string`[]

Defined in: [types/file.ts:744](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L744)

Array of base64-encoded PNG images (one per successfully converted page)

---

### pageCount

> **pageCount**: `number`

Defined in: [types/file.ts:746](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L746)

Number of pages converted

---

### conversionTimeMs

> **conversionTimeMs**: `number`

Defined in: [types/file.ts:748](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L748)

Total conversion time in milliseconds

---

### warnings?

> `optional` **warnings?**: `string`[]

Defined in: [types/file.ts:750](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L750)

Any warnings during conversion

---

### errors?

> `optional` **errors?**: `object`[]

Defined in: [types/file.ts:752](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L752)

Per-page failures — present only when some pages failed to render (#294).

#### page

> **page**: `number`

#### error

> **error**: `string`
