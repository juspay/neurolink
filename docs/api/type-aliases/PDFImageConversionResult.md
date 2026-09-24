[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionResult

# Type Alias: PDFImageConversionResult

> **PDFImageConversionResult** = `object`

Defined in: [types/file.ts:669](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L669)

Result of PDF to image conversion.

## Properties

### images

> **images**: `string`[]

Defined in: [types/file.ts:671](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L671)

Array of base64-encoded PNG images (one per successfully converted page)

---

### pageCount

> **pageCount**: `number`

Defined in: [types/file.ts:673](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L673)

Number of pages converted

---

### conversionTimeMs

> **conversionTimeMs**: `number`

Defined in: [types/file.ts:675](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L675)

Total conversion time in milliseconds

---

### warnings?

> `optional` **warnings?**: `string`[]

Defined in: [types/file.ts:677](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L677)

Any warnings during conversion

---

### errors?

> `optional` **errors?**: `object`[]

Defined in: [types/file.ts:679](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L679)

Per-page failures — present only when some pages failed to render (#294).

#### page

> **page**: `number`

#### error

> **error**: `string`
