[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProcessorOptions

# Type Alias: PDFProcessorOptions

> **PDFProcessorOptions** = `object`

Defined in: [types/file.ts:524](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L524)

PDF processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:525](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L525)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/file.ts:526](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L526)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:527](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L527)

---

### bedrockApiMode?

> `optional` **bedrockApiMode?**: `"converse"` \| `"invokeModel"`

Defined in: [types/file.ts:528](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L528)

---

### enforceLimits?

> `optional` **enforceLimits?**: `boolean`

Defined in: [types/file.ts:533](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L533)

Whether to enforce page limits by throwing an error (default: true)
Set to false to bypass limit enforcement (logs warning instead)

---

### password?

> `optional` **password?**: `string`

Defined in: [types/file.ts:535](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L535)

Password for an encrypted PDF (used on the image-conversion path) (#258).
