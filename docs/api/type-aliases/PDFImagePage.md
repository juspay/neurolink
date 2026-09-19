[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImagePage

# Type Alias: PDFImagePage

> **PDFImagePage** = `object`

Defined in: [types/file.ts:617](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L617)

A single streamed page result (#302). `error` is set when that page failed.

## Properties

### pageIndex

> **pageIndex**: `number`

Defined in: [types/file.ts:619](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L619)

1-based page index.

---

### image

> **image**: `string`

Defined in: [types/file.ts:621](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L621)

Base64-encoded PNG for the page (empty string when `error` is set).

---

### imageSizeBytes

> **imageSizeBytes**: `number`

Defined in: [types/file.ts:623](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L623)

Byte size of the rendered PNG (0 when `error` is set).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/file.ts:625](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L625)

Populated when this page failed to render (#294).
