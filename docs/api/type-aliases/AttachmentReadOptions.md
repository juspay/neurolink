[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AttachmentReadOptions

# Type Alias: AttachmentReadOptions

> **AttachmentReadOptions** = `object`

Options for `readAttachmentFile()`.

## Properties

### policy?

> `optional` **policy?**: [`AttachmentPolicy`](AttachmentPolicy.md)

Policy to apply; the environment-derived default when omitted.

---

### maxBytes

> **maxBytes**: `number`

Hard cap on the file size in bytes (the policy's `maxBytes` lowers it).

---

### label

> **label**: `string`

Short label for error messages, e.g. `"image file"`.
