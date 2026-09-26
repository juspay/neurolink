[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedVideo

# Type Alias: ProcessedVideo

> **ProcessedVideo** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:870](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L870)

Processed video result.
Extends ProcessedFileBase with video-specific fields including metadata,
extracted keyframes, subtitle text, and a pre-formatted textContent block
suitable for sending to an LLM.

## Type Declaration

### textContent

> **textContent**: `string`

### keyframes

> **keyframes**: `Buffer`[]

### keyframeTimestampsSec

> **keyframeTimestampsSec**: `number`[]

When each entry of `keyframes` was sampled, in seconds from the start of
the clip. Same length, same order, ascending.

A parallel array rather than a richer `keyframes` element type: that
field is read by `fileReferenceRegistry` and by the detector as a plain
`Buffer[]`, and reshaping it would break them for a value they do not
need. Extraction can also drop an individual frame when its encode
fails, so the timestamps are recorded as frames are kept — never
reconstructed from an interval, which would silently mislabel every
frame after a dropped one.

### metadata

> **metadata**: `object`

#### metadata.duration

> **duration**: `number`

#### metadata.durationFormatted

> **durationFormatted**: `string`

#### metadata.width

> **width**: `number`

#### metadata.height

> **height**: `number`

#### metadata.codec

> **codec**: `string`

#### metadata.fps

> **fps**: `number`

#### metadata.bitrate

> **bitrate**: `number`

#### metadata.audioCodec?

> `optional` **audioCodec?**: `string`

#### metadata.audioChannels?

> `optional` **audioChannels?**: `number`

#### metadata.audioSampleRate?

> `optional` **audioSampleRate?**: `number`

#### metadata.subtitleTracks

> **subtitleTracks**: `number`

#### metadata.fileSize

> **fileSize**: `number`

### subtitleText?

> `optional` **subtitleText?**: `string`

### transcript?

> `optional` **transcript?**: `string`

Speech transcribed from the clip's audio track, when
`VideoProcessorOptions.transcribeAudio` asked for it and it worked.

Distinct from `subtitleText`, which is an embedded subtitle stream the
file already carried. A recording can have one, both or neither.

### hasTranscript

> **hasTranscript**: `boolean`

### transcriptionSkippedReason?

> `optional` **transcriptionSkippedReason?**: `string`

Why no transcript was produced. Follows `ProcessedAudio`'s precedent:
"nobody asked", "there is no audio track", "no API key", "the call
failed" and "nobody was speaking" are five different situations that
otherwise all present as an absent transcript.

### hasKeyframes

> **hasKeyframes**: `boolean`

### frameCount

> **frameCount**: `number`
