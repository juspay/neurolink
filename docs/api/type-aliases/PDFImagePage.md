[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImagePage

# Type Alias: PDFImagePage

> **PDFImagePage** = `object`

Defined in: [types/file.ts:766](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L766)

A single streamed page result (#302). `error` is set when that page failed.

## Properties

### pageIndex

> **pageIndex**: `number`

Defined in: [types/file.ts:768](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L768)

1-based page index.

---

### image

> **image**: `string`

Defined in: [types/file.ts:770](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L770)

Base64-encoded PNG for the page (empty string when `error` is set).

---

### imageSizeBytes

> **imageSizeBytes**: `number`

Defined in: [types/file.ts:772](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L772)

Byte size of the rendered PNG (0 when `error` is set).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/file.ts:774](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L774)

Populated when this page failed to render (#294).
