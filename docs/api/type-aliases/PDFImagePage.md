[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImagePage

# Type Alias: PDFImagePage

> **PDFImagePage** = `object`

Defined in: [types/file.ts:724](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L724)

A single streamed page result (#302). `error` is set when that page failed.

## Properties

### pageIndex

> **pageIndex**: `number`

Defined in: [types/file.ts:726](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L726)

1-based page index.

---

### image

> **image**: `string`

Defined in: [types/file.ts:728](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L728)

Base64-encoded PNG for the page (empty string when `error` is set).

---

### imageSizeBytes

> **imageSizeBytes**: `number`

Defined in: [types/file.ts:730](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L730)

Byte size of the rendered PNG (0 when `error` is set).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/file.ts:732](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L732)

Populated when this page failed to render (#294).
