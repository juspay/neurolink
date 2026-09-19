[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImagePage

# Type Alias: PDFImagePage

> **PDFImagePage** = `object`

Defined in: [types/file.ts:644](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L644)

A single streamed page result (#302). `error` is set when that page failed.

## Properties

### pageIndex

> **pageIndex**: `number`

Defined in: [types/file.ts:646](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L646)

1-based page index.

---

### image

> **image**: `string`

Defined in: [types/file.ts:648](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L648)

Base64-encoded PNG for the page (empty string when `error` is set).

---

### imageSizeBytes

> **imageSizeBytes**: `number`

Defined in: [types/file.ts:650](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L650)

Byte size of the rendered PNG (0 when `error` is set).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/file.ts:652](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L652)

Populated when this page failed to render (#294).
