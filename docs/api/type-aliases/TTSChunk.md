[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSChunk

# Type Alias: TTSChunk

> **TTSChunk** = `object`

Defined in: [types/tts.ts:255](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L255)

TTS audio chunk for streaming Text-to-Speech output

Represents a chunk of audio data generated during streaming TTS.
Used in StreamChunk type to deliver audio alongside text content.

## Properties

### data

> **data**: `Buffer`

Defined in: [types/tts.ts:257](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L257)

Audio data chunk as Buffer

---

### format

> **format**: [`TTSAudioFormat`](TTSAudioFormat.md)

Defined in: [types/tts.ts:259](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L259)

Audio format of this chunk

---

### index

> **index**: `number`

Defined in: [types/tts.ts:261](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L261)

Chunk sequence number (0-indexed)

---

### isFinal

> **isFinal**: `boolean`

Defined in: [types/tts.ts:263](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L263)

Whether this is the final audio chunk

---

### cumulativeSize?

> `optional` **cumulativeSize?**: `number`

Defined in: [types/tts.ts:265](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L265)

Cumulative audio size in bytes so far

---

### estimatedDuration?

> `optional` **estimatedDuration?**: `number`

Defined in: [types/tts.ts:267](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L267)

Estimated total duration in seconds (if available)

---

### voice?

> `optional` **voice?**: `string`

Defined in: [types/tts.ts:269](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L269)

Voice used for generation

---

### sampleRate?

> `optional` **sampleRate?**: `number`

Defined in: [types/tts.ts:271](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L271)

Sample rate in Hz
