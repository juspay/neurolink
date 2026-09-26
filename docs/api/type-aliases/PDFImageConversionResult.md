[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionResult

# Type Alias: PDFImageConversionResult

> **PDFImageConversionResult** = `object`

Defined in: [types/file.ts:776](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L776)

Result of PDF to image conversion.

## Properties

### images

> **images**: `string`[]

Defined in: [types/file.ts:778](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L778)

Array of base64-encoded PNG images (one per successfully converted page)

---

### pageCount

> **pageCount**: `number`

Defined in: [types/file.ts:780](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L780)

Number of pages converted

---

### conversionTimeMs

> **conversionTimeMs**: `number`

Defined in: [types/file.ts:782](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L782)

Total conversion time in milliseconds

---

### warnings?

> `optional` **warnings?**: `string`[]

Defined in: [types/file.ts:784](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L784)

Any warnings during conversion

---

### errors?

> `optional` **errors?**: `object`[]

Defined in: [types/file.ts:786](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L786)

Per-page failures — present only when some pages failed to render (#294).

#### page

> **page**: `number`

#### error

> **error**: `string`
