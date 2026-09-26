[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImagePage

# Type Alias: PDFImagePage

> **PDFImagePage** = `object`

Defined in: [types/file.ts:743](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L743)

A single streamed page result (#302). `error` is set when that page failed.

## Properties

### pageIndex

> **pageIndex**: `number`

Defined in: [types/file.ts:745](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L745)

1-based page index.

---

### image

> **image**: `string`

Defined in: [types/file.ts:747](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L747)

Base64-encoded PNG for the page (empty string when `error` is set).

---

### imageSizeBytes

> **imageSizeBytes**: `number`

Defined in: [types/file.ts:749](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L749)

Byte size of the rendered PNG (0 when `error` is set).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/file.ts:751](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L751)

Populated when this page failed to render (#294).
