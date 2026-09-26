[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProcessorOptions

# Type Alias: PDFProcessorOptions

> **PDFProcessorOptions** = `object`

Defined in: [types/file.ts:482](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L482)

PDF processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:483](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L483)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/file.ts:484](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L484)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:485](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L485)

---

### bedrockApiMode?

> `optional` **bedrockApiMode?**: `"converse"` \| `"invokeModel"`

Defined in: [types/file.ts:486](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L486)

---

### enforceLimits?

> `optional` **enforceLimits?**: `boolean`

Defined in: [types/file.ts:491](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L491)

Whether to enforce page limits by throwing an error (default: true)
Set to false to bypass limit enforcement (logs warning instead)

---

### password?

> `optional` **password?**: `string`

Defined in: [types/file.ts:493](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L493)

Password for an encrypted PDF (used on the image-conversion path) (#258).
