[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionResult

# Type Alias: PDFImageConversionResult

> **PDFImageConversionResult** = `object`

Defined in: [types/file.ts:655](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L655)

Result of PDF to image conversion.

## Properties

### images

> **images**: `string`[]

Defined in: [types/file.ts:657](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L657)

Array of base64-encoded PNG images (one per successfully converted page)

---

### pageCount

> **pageCount**: `number`

Defined in: [types/file.ts:659](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L659)

Number of pages converted

---

### conversionTimeMs

> **conversionTimeMs**: `number`

Defined in: [types/file.ts:661](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L661)

Total conversion time in milliseconds

---

### warnings?

> `optional` **warnings?**: `string`[]

Defined in: [types/file.ts:663](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L663)

Any warnings during conversion

---

### errors?

> `optional` **errors?**: `object`[]

Defined in: [types/file.ts:665](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L665)

Per-page failures — present only when some pages failed to render (#294).

#### page

> **page**: `number`

#### error

> **error**: `string`
