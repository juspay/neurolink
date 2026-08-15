[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoTransitionOptions

# Type Alias: VideoTransitionOptions

> **VideoTransitionOptions** = `object`

Defined in: [types/video.ts:33](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/video.ts#L33)

Director-mode transition options.

Used by handlers that support first-and-last-frame interpolation
(e.g., Veo 3.1 Fast). Providers without transition support omit the
`generateTransition` method on `VideoHandler`.

## Properties

### aspectRatio?

> `optional` **aspectRatio?**: `"9:16"` \| `"16:9"` \| `"1:1"` \| `string`

Defined in: [types/video.ts:34](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/video.ts#L34)

---

### resolution?

> `optional` **resolution?**: `"720p"` \| `"1080p"`

Defined in: [types/video.ts:35](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/video.ts#L35)

---

### audio?

> `optional` **audio?**: `boolean`

Defined in: [types/video.ts:36](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/video.ts#L36)

---

### durationSeconds?

> `optional` **durationSeconds?**: `4` \| `6` \| `8`

Defined in: [types/video.ts:38](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/video.ts#L38)

Duration of the transition clip (Veo accepts 4, 6, or 8). Default 4.
