[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionResult

# Type Alias: PDFImageConversionResult

> **PDFImageConversionResult** = `object`

Defined in: [types/file.ts:818](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L818)

Result of PDF to image conversion.

## Properties

### images

> **images**: `string`[]

Defined in: [types/file.ts:820](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L820)

Array of base64-encoded PNG images (one per successfully converted page)

---

### pageCount

> **pageCount**: `number`

Defined in: [types/file.ts:822](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L822)

Number of pages converted

---

### conversionTimeMs

> **conversionTimeMs**: `number`

Defined in: [types/file.ts:824](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L824)

Total conversion time in milliseconds

---

### warnings?

> `optional` **warnings?**: `string`[]

Defined in: [types/file.ts:826](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L826)

Any warnings during conversion

---

### errors?

> `optional` **errors?**: `object`[]

Defined in: [types/file.ts:828](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L828)

Per-page failures — present only when some pages failed to render (#294).

#### page

> **page**: `number`

#### error

> **error**: `string`
