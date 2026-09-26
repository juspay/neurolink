[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoProcessorOptions

# Type Alias: VideoProcessorOptions

> **VideoProcessorOptions** = `object`

Defined in: [types/file.ts:676](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L676)

Keyframe-extraction knobs for an attached video (#478).

These back the `--video-frames` / `--video-quality` / `--video-format` CLI
flags and `GenerateOptions.videoOptions`. Each is clamped to the processor's
own ceiling — a caller cannot raise `frames` above VIDEO_CONFIG.MAX_FRAMES.

## Properties

### frames?

> `optional` **frames?**: `number`

Defined in: [types/file.ts:678](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L678)

Max keyframes to extract. Clamped to the processor's MAX_FRAMES ceiling.

---

### quality?

> `optional` **quality?**: `number`

Defined in: [types/file.ts:680](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L680)

Encoder quality 1-100 for the extracted frames.

---

### format?

> `optional` **format?**: `"jpeg"` \| `"png"`

Defined in: [types/file.ts:682](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L682)

Frame encoding. Defaults to jpeg.
