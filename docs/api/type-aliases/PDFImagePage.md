[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImagePage

# Type Alias: PDFImagePage

> **PDFImagePage** = `object`

Defined in: [types/file.ts:781](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L781)

A single streamed page result (#302). `error` is set when that page failed.

## Properties

### pageIndex

> **pageIndex**: `number`

Defined in: [types/file.ts:783](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L783)

1-based page index.

---

### image

> **image**: `string`

Defined in: [types/file.ts:785](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L785)

Base64-encoded PNG for the page (empty string when `error` is set).

---

### imageSizeBytes

> **imageSizeBytes**: `number`

Defined in: [types/file.ts:787](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L787)

Byte size of the rendered PNG (0 when `error` is set).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/file.ts:789](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L789)

Populated when this page failed to render (#294).
