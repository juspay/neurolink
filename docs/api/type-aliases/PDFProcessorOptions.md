[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProcessorOptions

# Type Alias: PDFProcessorOptions

> **PDFProcessorOptions** = `object`

Defined in: [types/file.ts:364](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L364)

PDF processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:365](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L365)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/file.ts:366](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L366)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:367](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L367)

---

### bedrockApiMode?

> `optional` **bedrockApiMode?**: `"converse"` \| `"invokeModel"`

Defined in: [types/file.ts:368](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L368)

---

### enforceLimits?

> `optional` **enforceLimits?**: `boolean`

Defined in: [types/file.ts:373](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L373)

Whether to enforce page limits by throwing an error (default: true)
Set to false to bypass limit enforcement (logs warning instead)

---

### password?

> `optional` **password?**: `string`

Defined in: [types/file.ts:375](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L375)

Password for an encrypted PDF (used on the image-conversion path) (#258).
