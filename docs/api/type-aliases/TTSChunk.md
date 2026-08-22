[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSChunk

# Type Alias: TTSChunk

> **TTSChunk** = `object`

Defined in: [types/tts.ts:273](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L273)

TTS audio chunk for streaming Text-to-Speech output

Represents a chunk of audio data generated during streaming TTS.
Used in StreamChunk type to deliver audio alongside text content.

## Properties

### data

> **data**: `Buffer`

Defined in: [types/tts.ts:275](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L275)

Audio data chunk as Buffer

---

### format

> **format**: [`TTSAudioFormat`](TTSAudioFormat.md)

Defined in: [types/tts.ts:277](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L277)

Audio format of this chunk

---

### index

> **index**: `number`

Defined in: [types/tts.ts:279](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L279)

Chunk sequence number (0-indexed)

---

### isFinal

> **isFinal**: `boolean`

Defined in: [types/tts.ts:281](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L281)

Whether this is the final audio chunk

---

### cumulativeSize?

> `optional` **cumulativeSize?**: `number`

Defined in: [types/tts.ts:283](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L283)

Cumulative audio size in bytes so far

---

### estimatedDuration?

> `optional` **estimatedDuration?**: `number`

Defined in: [types/tts.ts:285](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L285)

Estimated total duration in seconds (if available)

---

### voice?

> `optional` **voice?**: `string`

Defined in: [types/tts.ts:287](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L287)

Voice used for generation

---

### sampleRate?

> `optional` **sampleRate?**: `number`

Defined in: [types/tts.ts:289](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L289)

Sample rate in Hz
