[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImagePage

# Type Alias: PDFImagePage

> **PDFImagePage** = `object`

Defined in: [types/file.ts:832](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L832)

A single streamed page result (#302). `error` is set when that page failed.

## Properties

### pageIndex

> **pageIndex**: `number`

Defined in: [types/file.ts:834](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L834)

1-based page index.

---

### image

> **image**: `string`

Defined in: [types/file.ts:836](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L836)

Base64-encoded PNG for the page (empty string when `error` is set).

---

### imageSizeBytes

> **imageSizeBytes**: `number`

Defined in: [types/file.ts:838](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L838)

Byte size of the rendered PNG (0 when `error` is set).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/file.ts:840](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L840)

Populated when this page failed to render (#294).
