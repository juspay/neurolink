[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoTransitionOptions

# Type Alias: VideoTransitionOptions

> **VideoTransitionOptions** = `object`

Defined in: [types/video.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/types/video.ts#L47)

Director-mode transition options.

Used by handlers that support first-and-last-frame interpolation
(e.g., Veo 3.1 Fast). Providers without transition support omit the
`generateTransition` method on `VideoHandler`.

## Properties

### aspectRatio?

> `optional` **aspectRatio?**: `"9:16"` \| `"16:9"` \| `"1:1"` \| `string`

Defined in: [types/video.ts:48](https://github.com/juspay/neurolink/blob/release/src/lib/types/video.ts#L48)

---

### resolution?

> `optional` **resolution?**: `"720p"` \| `"1080p"`

Defined in: [types/video.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/types/video.ts#L49)

---

### audio?

> `optional` **audio?**: `boolean`

Defined in: [types/video.ts:50](https://github.com/juspay/neurolink/blob/release/src/lib/types/video.ts#L50)

---

### durationSeconds?

> `optional` **durationSeconds?**: `4` \| `6` \| `8`

Defined in: [types/video.ts:52](https://github.com/juspay/neurolink/blob/release/src/lib/types/video.ts#L52)

Duration of the transition clip (Veo accepts 4, 6, or 8). Default 4.
