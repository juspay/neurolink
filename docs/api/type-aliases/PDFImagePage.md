[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImagePage

# Type Alias: PDFImagePage

> **PDFImagePage** = `object`

Defined in: [types/file.ts:606](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L606)

A single streamed page result (#302). `error` is set when that page failed.

## Properties

### pageIndex

> **pageIndex**: `number`

Defined in: [types/file.ts:608](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L608)

1-based page index.

---

### image

> **image**: `string`

Defined in: [types/file.ts:610](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L610)

Base64-encoded PNG for the page (empty string when `error` is set).

---

### imageSizeBytes

> **imageSizeBytes**: `number`

Defined in: [types/file.ts:612](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L612)

Byte size of the rendered PNG (0 when `error` is set).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/file.ts:614](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L614)

Populated when this page failed to render (#294).
