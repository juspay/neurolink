[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProcessorOptions

# Type Alias: PDFProcessorOptions

> **PDFProcessorOptions** = `object`

PDF processor options

## Properties

### provider?

> `optional` **provider?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### maxSizeMB?

> `optional` **maxSizeMB?**: `number`

---

### bedrockApiMode?

> `optional` **bedrockApiMode?**: `"converse"` \| `"invokeModel"`

---

### enforceLimits?

> `optional` **enforceLimits?**: `boolean`

Whether to enforce page limits by throwing an error (default: true)
Set to false to bypass limit enforcement (logs warning instead)

---

### password?

> `optional` **password?**: `string`

Password for an encrypted PDF (used on the image-conversion path) (#258).
