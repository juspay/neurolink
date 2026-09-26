[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionResult

# Type Alias: PDFImageConversionResult

> **PDFImageConversionResult** = `object`

Defined in: [types/file.ts:833](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L833)

Result of PDF to image conversion.

## Properties

### images

> **images**: `string`[]

Defined in: [types/file.ts:835](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L835)

Array of base64-encoded PNG images (one per successfully converted page)

---

### pageCount

> **pageCount**: `number`

Defined in: [types/file.ts:837](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L837)

Number of pages converted

---

### conversionTimeMs

> **conversionTimeMs**: `number`

Defined in: [types/file.ts:839](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L839)

Total conversion time in milliseconds

---

### warnings?

> `optional` **warnings?**: `string`[]

Defined in: [types/file.ts:841](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L841)

Any warnings during conversion

---

### errors?

> `optional` **errors?**: `object`[]

Defined in: [types/file.ts:843](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L843)

Per-page failures — present only when some pages failed to render (#294).

#### page

> **page**: `number`

#### error

> **error**: `string`
