[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedAudio

# Type Alias: ProcessedAudio

> **ProcessedAudio** = [`ProcessedFileBase`](ProcessedFileBase.md) & `object`

Defined in: [types/processor.ts:810](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L810)

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

### transcriptionLanguage?

> `optional` **transcriptionLanguage?**: `string`

Language the transcription backend reported for the speech (#409), when
it reported one.

Not always a _detected_ language: when the backend's response carries no
language (Whisper's `verbose_json` usually does; Google/Azure responses
vary), this falls back to the caller-requested `options.language` instead
of going unset. A caller that must distinguish "the backend detected X"
from "X is just what was asked for" cannot do so from this field alone.

### transcriptionDuration?

> `optional` **transcriptionDuration?**: `number`

Audio duration in seconds as measured by the transcription backend (#409).

Kept apart from `metadata.duration`, which comes from the container
header: the two disagree on a file with a broken or absent header, and the
header is the one that is available without a transcription call.

### transcriptionSkippedReason?

> `optional` **transcriptionSkippedReason?**: `string`

Why transcription produced nothing, when it did (#416). Absent on success.
Lets a caller distinguish "this audio has no speech" from "the transcription
backend was never reachable", which previously looked identical.

### coverArt?

> `optional` **coverArt?**: `Buffer`
