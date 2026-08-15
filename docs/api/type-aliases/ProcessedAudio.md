[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedAudio

# Type Alias: ProcessedAudio

> **ProcessedAudio** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:810](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L810)

Processed audio file result.
Extends ProcessedFileBase with audio-specific metadata, tags, and transcript info.

## Type Declaration

### textContent

> **textContent**: `string`

LLM-friendly text representation of the audio file metadata and tags

### metadata

> **metadata**: `object`

Audio stream metadata (codec, duration, bitrate, etc.)

#### metadata.duration

> **duration**: `number`

#### metadata.durationFormatted

> **durationFormatted**: `string`

#### metadata.codec

> **codec**: `string`

#### metadata.codecProfile?

> `optional` **codecProfile?**: `string`

#### metadata.bitrate?

> `optional` **bitrate?**: `number`

#### metadata.sampleRate?

> `optional` **sampleRate?**: `number`

#### metadata.channels?

> `optional` **channels?**: `number`

#### metadata.bitsPerSample?

> `optional` **bitsPerSample?**: `number`

#### metadata.lossless

> **lossless**: `boolean`

#### metadata.fileSize

> **fileSize**: `number`

### tags

> **tags**: `object`

Extracted ID3/Vorbis/APE tags

#### tags.title?

> `optional` **title?**: `string`

#### tags.artist?

> `optional` **artist?**: `string`

#### tags.album?

> `optional` **album?**: `string`

#### tags.year?

> `optional` **year?**: `number`

#### tags.genre?

> `optional` **genre?**: `string`[]

#### tags.track?

> `optional` **track?**: `object`

#### tags.track.no

> **no**: `number` \| `null`

#### tags.track.of

> **of**: `number` \| `null`

#### tags.comment?

> `optional` **comment?**: `string`

#### tags.composer?

> `optional` **composer?**: `string`

### transcript?

> `optional` **transcript?**: `string`

### hasTranscript

> **hasTranscript**: `boolean`

### transcriptionProvider?

> `optional` **transcriptionProvider?**: `string`

### transcriptionSkippedReason?

> `optional` **transcriptionSkippedReason?**: `string`

Why transcription produced nothing, when it did (#416). Absent on success.
Lets a caller distinguish "this audio has no speech" from "the transcription
backend was never reachable", which previously looked identical.

### coverArt?

> `optional` **coverArt?**: `Buffer`
