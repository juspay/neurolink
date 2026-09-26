[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoTransitionOptions

# Type Alias: VideoTransitionOptions

> **VideoTransitionOptions** = `object`

Director-mode transition options.

Used by handlers that support first-and-last-frame interpolation
(e.g., Veo 3.1 Fast). Providers without transition support omit the
`generateTransition` method on `VideoHandler`.

## Properties

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Per-call cancellation signal forwarded to provider requests and polling
loops — same contract as `VideoOutputOptions.abortSignal`.

---

### aspectRatio?

> `optional` **aspectRatio?**: `"9:16"` \| `"16:9"` \| `"1:1"` \| `string`

---

### resolution?

> `optional` **resolution?**: `"720p"` \| `"1080p"`

---

### audio?

> `optional` **audio?**: `boolean`

---

### durationSeconds?

> `optional` **durationSeconds?**: `4` \| `6` \| `8`

Duration of the transition clip (Veo accepts 4, 6, or 8). Default 4.
