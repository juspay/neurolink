[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFImagePage

# Type Alias: PDFImagePage

> **PDFImagePage** = `object`

Defined in: [types/file.ts:672](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L672)

A single streamed page result (#302). `error` is set when that page failed.

## Properties

### pageIndex

> **pageIndex**: `number`

Defined in: [types/file.ts:674](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L674)

1-based page index.

---

### image

> **image**: `string`

Defined in: [types/file.ts:676](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L676)

Base64-encoded PNG for the page (empty string when `error` is set).

---

### imageSizeBytes

> **imageSizeBytes**: `number`

Defined in: [types/file.ts:678](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L678)

Byte size of the rendered PNG (0 when `error` is set).

---

### error?

> `optional` **error?**: `string`

Defined in: [types/file.ts:680](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L680)

Populated when this page failed to render (#294).
