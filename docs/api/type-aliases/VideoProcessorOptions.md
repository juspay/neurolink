[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoProcessorOptions

# Type Alias: VideoProcessorOptions

> **VideoProcessorOptions** = `object`

Keyframe-extraction knobs for an attached video (#478).

These back the `--video-frames` / `--video-quality` / `--video-format` CLI
flags and `GenerateOptions.videoOptions`. Each is clamped to the processor's
own ceiling — a caller cannot raise `frames` above VIDEO_CONFIG.MAX_FRAMES.

## Properties

### frames?

> `optional` **frames?**: `number`

Max keyframes to extract. Clamped to the processor's MAX_FRAMES ceiling.

---

### quality?

> `optional` **quality?**: `number`

Encoder quality 1-100 for the extracted frames.

---

### format?

> `optional` **format?**: `"jpeg"` \| `"png"`

Frame encoding. Defaults to jpeg.
