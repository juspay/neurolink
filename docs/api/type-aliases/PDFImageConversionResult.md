[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionResult

# Type Alias: PDFImageConversionResult

> **PDFImageConversionResult** = `object`

Defined in: [types/file.ts:682](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L682)

Result of PDF to image conversion.

## Properties

### images

> **images**: `string`[]

Defined in: [types/file.ts:684](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L684)

Array of base64-encoded PNG images (one per successfully converted page)

---

### pageCount

> **pageCount**: `number`

Defined in: [types/file.ts:686](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L686)

Number of pages converted

---

### conversionTimeMs

> **conversionTimeMs**: `number`

Defined in: [types/file.ts:688](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L688)

Total conversion time in milliseconds

---

### warnings?

> `optional` **warnings?**: `string`[]

Defined in: [types/file.ts:690](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L690)

Any warnings during conversion

---

### errors?

> `optional` **errors?**: `object`[]

Defined in: [types/file.ts:692](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L692)

Per-page failures — present only when some pages failed to render (#294).

#### page

> **page**: `number`

#### error

> **error**: `string`
