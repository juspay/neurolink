[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionResult

# Type Alias: PDFImageConversionResult

> **PDFImageConversionResult** = `object`

Defined in: [types/file.ts:884](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L884)

Result of PDF to image conversion.

## Properties

### images

> **images**: `string`[]

Defined in: [types/file.ts:886](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L886)

Array of base64-encoded PNG images (one per successfully converted page)

---

### pageCount

> **pageCount**: `number`

Defined in: [types/file.ts:888](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L888)

Number of pages converted

---

### conversionTimeMs

> **conversionTimeMs**: `number`

Defined in: [types/file.ts:890](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L890)

Total conversion time in milliseconds

---

### warnings?

> `optional` **warnings?**: `string`[]

Defined in: [types/file.ts:892](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L892)

Any warnings during conversion

---

### errors?

> `optional` **errors?**: `object`[]

Defined in: [types/file.ts:894](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L894)

Per-page failures — present only when some pages failed to render (#294).

#### page

> **page**: `number`

#### error

> **error**: `string`
