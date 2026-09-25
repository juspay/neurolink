[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoProcessorOptions

# Type Alias: VideoProcessorOptions

> **VideoProcessorOptions** = `object`

Defined in: [types/file.ts:470](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L470)

Keyframe-extraction knobs for an attached video (#478).

These back the `--video-frames` / `--video-quality` / `--video-format` CLI
flags and `GenerateOptions.videoOptions`. Each is clamped to the processor's
own ceiling — a caller cannot raise `frames` above VIDEO_CONFIG.MAX_FRAMES.

## Properties

### frames?

> `optional` **frames?**: `number`

Defined in: [types/file.ts:472](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L472)

Max keyframes to extract. Clamped to the processor's MAX_FRAMES ceiling.

---

### quality?

> `optional` **quality?**: `number`

Defined in: [types/file.ts:474](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L474)

Encoder quality 1-100 for the extracted frames.

---

### format?

> `optional` **format?**: `"jpeg"` \| `"png"`

Defined in: [types/file.ts:476](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L476)

Frame encoding. Defaults to jpeg.

---

### transcribeAudio?

> `optional` **transcribeAudio?**: `boolean`

Defined in: [types/file.ts:486](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L486)

Transcribe the clip's spoken audio (#433). Off by default: it costs an
ffmpeg pass plus a Whisper call, and most attached video is silent
screen capture.

Best-effort — a clip with no audio track, no `OPENAI_API_KEY`, or a
failed call still processes, and the reason lands in
`ProcessedVideo.transcriptionSkippedReason`.
