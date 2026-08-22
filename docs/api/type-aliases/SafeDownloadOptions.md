[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SafeDownloadOptions

# Type Alias: SafeDownloadOptions

> **SafeDownloadOptions** = `object`

Defined in: [types/safeFetch.ts:17](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/safeFetch.ts#L17)

## Properties

### maxBytes

> **maxBytes**: `number`

Defined in: [types/safeFetch.ts:19](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/safeFetch.ts#L19)

Hard cap on response size in bytes. Pass MAX_VIDEO_BYTES/MAX_AUDIO_BYTES/MAX_IMAGE_BYTES from sizeGuard.

---

### label

> **label**: `string`

Defined in: [types/safeFetch.ts:21](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/safeFetch.ts#L21)

Human-readable identifier used in error messages (e.g. "HeyGen video").

---

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: [types/safeFetch.ts:23](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/safeFetch.ts#L23)

Optional abort signal for caller-driven cancellation.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/safeFetch.ts:25](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/safeFetch.ts#L25)

Optional per-call request timeout (ms). Default: 60_000.
