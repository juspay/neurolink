[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSChunk

# Type Alias: TTSChunk

> **TTSChunk** = `object`

Defined in: [types/tts.ts:301](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L301)

TTS audio chunk for streaming Text-to-Speech output

Represents a chunk of audio data generated during streaming TTS.
Used in StreamChunk type to deliver audio alongside text content.

## Properties

### data

> **data**: `Buffer`

Defined in: [types/tts.ts:303](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L303)

Audio data chunk as Buffer

---

### format

> **format**: [`TTSAudioFormat`](TTSAudioFormat.md)

Defined in: [types/tts.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L305)

Audio format of this chunk

---

### index

> **index**: `number`

Defined in: [types/tts.ts:307](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L307)

Chunk sequence number (0-indexed)

---

### isFinal

> **isFinal**: `boolean`

Defined in: [types/tts.ts:309](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L309)

Whether this is the final audio chunk

---

### cumulativeSize?

> `optional` **cumulativeSize?**: `number`

Defined in: [types/tts.ts:311](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L311)

Cumulative audio size in bytes so far

---

### estimatedDuration?

> `optional` **estimatedDuration?**: `number`

Defined in: [types/tts.ts:313](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L313)

Estimated total duration in seconds (if available)

---

### voice?

> `optional` **voice?**: `string`

Defined in: [types/tts.ts:315](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L315)

Voice used for generation

---

### sampleRate?

> `optional` **sampleRate?**: `number`

Defined in: [types/tts.ts:317](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L317)

Sample rate in Hz
