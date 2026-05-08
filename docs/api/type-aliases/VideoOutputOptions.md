[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoOutputOptions

# Type Alias: VideoOutputOptions

> **VideoOutputOptions** = `object`

Defined in: [types/multimodal.ts:163](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L163)

Video output configuration options for video generation

Used with `output.video` in GenerateOptions when `output.mode` is "video".
Controls resolution, duration, aspect ratio, and audio settings for generated videos.

## Example

```typescript
const videoOptions: VideoOutputOptions = {
  resolution: "1080p",
  length: 8,
  aspectRatio: "16:9",
  audio: true,
};
```

## Properties

### resolution?

> `optional` **resolution?**: `"720p"` \| `"1080p"`

Defined in: [types/multimodal.ts:165](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L165)

Output resolution - "720p" (1280x720) or "1080p" (1920x1080)

---

### length?

> `optional` **length?**: `4` \| `6` \| `8`

Defined in: [types/multimodal.ts:167](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L167)

Video duration in seconds (4, 6, or 8 seconds supported)

---

### aspectRatio?

> `optional` **aspectRatio?**: `"9:16"` \| `"16:9"`

Defined in: [types/multimodal.ts:169](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L169)

Aspect ratio - "9:16" for portrait or "16:9" for landscape

---

### audio?

> `optional` **audio?**: `boolean`

Defined in: [types/multimodal.ts:171](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L171)

Enable audio generation (default: true)
