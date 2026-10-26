[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AttachmentDownloadOptions

# Type Alias: AttachmentDownloadOptions

> **AttachmentDownloadOptions** = `object`

Options for `downloadAttachment()`.

## Properties

### policy?

> `optional` **policy?**: [`AttachmentPolicy`](AttachmentPolicy.md)

Policy to apply; the environment-derived default when omitted.

---

### maxBytes

> **maxBytes**: `number`

Hard cap on the response body in bytes (the policy's `maxBytes` lowers it).

---

### label

> **label**: `string`

Short label for error messages, e.g. `"image URL"`.

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Headers for the first request only. They are dropped on every redirect
hop so a credential meant for one host never reaches another.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Transfer timeout in milliseconds.

---

### signal?

> `optional` **signal?**: `AbortSignal`

Caller cancellation.

---

### method?

> `optional` **method?**: `"GET"` \| `"HEAD"`

`HEAD` fetches headers only and returns an empty body.
