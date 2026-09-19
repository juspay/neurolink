[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImagePage

# Type Alias: PDFImagePage

> **PDFImagePage** = `object`

Defined in: [types/file.ts:704](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L704)

A single streamed page result (#302). `error` is set when that page failed.

## Properties

### pageIndex

> **pageIndex**: `number`

Defined in: [types/file.ts:706](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L706)

1-based page index.

---

### image

> **image**: `string`

Defined in: [types/file.ts:708](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L708)

Base64-encoded PNG for the page (empty string when `error` is set).

---

### imageSizeBytes

> **imageSizeBytes**: `number`

Defined in: [types/file.ts:710](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L710)

Byte size of the rendered PNG (0 when `error` is set).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/file.ts:712](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L712)

Populated when this page failed to render (#294).
