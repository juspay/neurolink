[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProcessorOptions

# Type Alias: PDFProcessorOptions

> **PDFProcessorOptions** = `object`

Defined in: [types/file.ts:552](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L552)

PDF processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:553](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L553)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/file.ts:554](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L554)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:555](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L555)

---

### bedrockApiMode?

> `optional` **bedrockApiMode?**: `"converse"` \| `"invokeModel"`

Defined in: [types/file.ts:556](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L556)

---

### enforceLimits?

> `optional` **enforceLimits?**: `boolean`

Defined in: [types/file.ts:561](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L561)

Whether to enforce page limits by throwing an error (default: true)
Set to false to bypass limit enforcement (logs warning instead)

---

### password?

> `optional` **password?**: `string`

Defined in: [types/file.ts:563](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L563)

Password for an encrypted PDF (used on the image-conversion path) (#258).
