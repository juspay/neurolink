[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProcessorOptions

# Type Alias: PDFProcessorOptions

> **PDFProcessorOptions** = `object`

Defined in: [types/file.ts:491](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L491)

PDF processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:492](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L492)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/file.ts:493](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L493)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:494](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L494)

---

### bedrockApiMode?

> `optional` **bedrockApiMode?**: `"converse"` \| `"invokeModel"`

Defined in: [types/file.ts:495](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L495)

---

### enforceLimits?

> `optional` **enforceLimits?**: `boolean`

Defined in: [types/file.ts:500](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L500)

Whether to enforce page limits by throwing an error (default: true)
Set to false to bypass limit enforcement (logs warning instead)

---

### password?

> `optional` **password?**: `string`

Defined in: [types/file.ts:502](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L502)

Password for an encrypted PDF (used on the image-conversion path) (#258).
