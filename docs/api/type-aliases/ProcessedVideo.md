[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedVideo

# Type Alias: ProcessedVideo

> **ProcessedVideo** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:855](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L855)

Processed video result.
Extends ProcessedFileBase with video-specific fields including metadata,
extracted keyframes, subtitle text, and a pre-formatted textContent block
suitable for sending to an LLM.

## Type Declaration

### textContent

> **textContent**: `string`

### keyframes

> **keyframes**: `Buffer`[]

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

### hasKeyframes

> **hasKeyframes**: `boolean`

### frameCount

> **frameCount**: `number`
