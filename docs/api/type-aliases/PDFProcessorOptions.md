[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProcessorOptions

# Type Alias: PDFProcessorOptions

> **PDFProcessorOptions** = `object`

Defined in: [types/file.ts:402](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L402)

PDF processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:403](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L403)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/file.ts:404](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L404)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:405](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L405)

---

### bedrockApiMode?

> `optional` **bedrockApiMode?**: `"converse"` \| `"invokeModel"`

Defined in: [types/file.ts:406](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L406)

---

### enforceLimits?

> `optional` **enforceLimits?**: `boolean`

Defined in: [types/file.ts:411](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L411)

Whether to enforce page limits by throwing an error (default: true)
Set to false to bypass limit enforcement (logs warning instead)

---

### password?

> `optional` **password?**: `string`

Defined in: [types/file.ts:413](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L413)

Password for an encrypted PDF (used on the image-conversion path) (#258).
