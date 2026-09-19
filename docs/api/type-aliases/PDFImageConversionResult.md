[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImageConversionResult

# Type Alias: PDFImageConversionResult

> **PDFImageConversionResult** = `object`

Defined in: [types/file.ts:710](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L710)

Result of PDF to image conversion.

## Properties

### images

> **images**: `string`[]

Defined in: [types/file.ts:712](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L712)

Array of base64-encoded PNG images (one per successfully converted page)

---

### pageCount

> **pageCount**: `number`

Defined in: [types/file.ts:714](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L714)

Number of pages converted

---

### conversionTimeMs

> **conversionTimeMs**: `number`

Defined in: [types/file.ts:716](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L716)

Total conversion time in milliseconds

---

### warnings?

> `optional` **warnings?**: `string`[]

Defined in: [types/file.ts:718](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L718)

Any warnings during conversion

---

### errors?

> `optional` **errors?**: `object`[]

Defined in: [types/file.ts:720](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L720)

Per-page failures — present only when some pages failed to render (#294).

#### page

> **page**: `number`

#### error

> **error**: `string`
