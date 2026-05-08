[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProcessorOptions

# Type Alias: PDFProcessorOptions

> **PDFProcessorOptions** = `object`

Defined in: [types/file.ts:224](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L224)

PDF processor options

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/file.ts:225](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L225)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/file.ts:226](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L226)

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

Defined in: [types/file.ts:227](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L227)

---

### bedrockApiMode?

> `optional` **bedrockApiMode?**: `"converse"` \| `"invokeModel"`

Defined in: [types/file.ts:228](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L228)

---

### enforceLimits?

> `optional` **enforceLimits?**: `boolean`

Defined in: [types/file.ts:233](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/file.ts#L233)

Whether to enforce page limits by throwing an error (default: true)
Set to false to bypass limit enforcement (logs warning instead)
