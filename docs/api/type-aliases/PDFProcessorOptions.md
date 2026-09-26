[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProcessorOptions

# Type Alias: PDFProcessorOptions

> **PDFProcessorOptions** = `object`

Defined in: [types/file.ts:384](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L384)

PDF processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L385)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/file.ts:386](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L386)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:387](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L387)

---

### bedrockApiMode?

> `optional` **bedrockApiMode?**: `"converse"` \| `"invokeModel"`

Defined in: [types/file.ts:388](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L388)

---

### enforceLimits?

> `optional` **enforceLimits?**: `boolean`

Defined in: [types/file.ts:393](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L393)

Whether to enforce page limits by throwing an error (default: true)
Set to false to bypass limit enforcement (logs warning instead)

---

### password?

> `optional` **password?**: `string`

Defined in: [types/file.ts:395](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L395)

Password for an encrypted PDF (used on the image-conversion path) (#258).
