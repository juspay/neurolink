[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SafeDownloadOptions

# Type Alias: SafeDownloadOptions

> **SafeDownloadOptions** = `object`

## Properties

### maxBytes

> **maxBytes**: `number`

Hard cap on response size in bytes. Pass MAX_VIDEO_BYTES/MAX_AUDIO_BYTES/MAX_IMAGE_BYTES from sizeGuard.

---

### label

> **label**: `string`

Human-readable identifier used in error messages (e.g. "HeyGen video").

---

### signal?

> `optional` **signal?**: `AbortSignal`

Optional abort signal for caller-driven cancellation.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Optional per-call request timeout (ms). Default: 60_000.
