[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSChunk

# Type Alias: TTSChunk

> **TTSChunk** = `object`

Defined in: [types/tts.ts:290](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L290)

TTS audio chunk for streaming Text-to-Speech output

Represents a chunk of audio data generated during streaming TTS.
Used in StreamChunk type to deliver audio alongside text content.

## Properties

### data

> **data**: `Buffer`

Defined in: [types/tts.ts:292](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L292)

Audio data chunk as Buffer

---

### format

> **format**: [`TTSAudioFormat`](TTSAudioFormat.md)

Defined in: [types/tts.ts:294](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L294)

Audio format of this chunk

---

### index

> **index**: `number`

Defined in: [types/tts.ts:296](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L296)

Chunk sequence number (0-indexed)

---

### isFinal

> **isFinal**: `boolean`

Defined in: [types/tts.ts:298](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L298)

Whether this is the final audio chunk

---

### cumulativeSize?

> `optional` **cumulativeSize?**: `number`

Defined in: [types/tts.ts:300](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L300)

Cumulative audio size in bytes so far

---

### estimatedDuration?

> `optional` **estimatedDuration?**: `number`

Defined in: [types/tts.ts:302](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L302)

Estimated total duration in seconds (if available)

---

### voice?

> `optional` **voice?**: `string`

Defined in: [types/tts.ts:304](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L304)

Voice used for generation

---

### sampleRate?

> `optional` **sampleRate?**: `number`

Defined in: [types/tts.ts:306](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L306)

Sample rate in Hz
