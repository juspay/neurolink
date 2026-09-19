[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProcessorOptions

# Type Alias: PDFProcessorOptions

> **PDFProcessorOptions** = `object`

Defined in: [types/file.ts:375](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L375)

PDF processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:376](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L376)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/file.ts:377](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L377)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:378](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L378)

---

### bedrockApiMode?

> `optional` **bedrockApiMode?**: `"converse"` \| `"invokeModel"`

Defined in: [types/file.ts:379](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L379)

---

### enforceLimits?

> `optional` **enforceLimits?**: `boolean`

Defined in: [types/file.ts:384](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L384)

Whether to enforce page limits by throwing an error (default: true)
Set to false to bypass limit enforcement (logs warning instead)

---

### password?

> `optional` **password?**: `string`

Defined in: [types/file.ts:386](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L386)

Password for an encrypted PDF (used on the image-conversion path) (#258).
