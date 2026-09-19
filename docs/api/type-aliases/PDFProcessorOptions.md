[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProcessorOptions

# Type Alias: PDFProcessorOptions

> **PDFProcessorOptions** = `object`

Defined in: [types/file.ts:462](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L462)

PDF processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:463](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L463)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/file.ts:464](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L464)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:465](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L465)

---

### bedrockApiMode?

> `optional` **bedrockApiMode?**: `"converse"` \| `"invokeModel"`

Defined in: [types/file.ts:466](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L466)

---

### enforceLimits?

> `optional` **enforceLimits?**: `boolean`

Defined in: [types/file.ts:471](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L471)

Whether to enforce page limits by throwing an error (default: true)
Set to false to bypass limit enforcement (logs warning instead)

---

### password?

> `optional` **password?**: `string`

Defined in: [types/file.ts:473](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L473)

Password for an encrypted PDF (used on the image-conversion path) (#258).
