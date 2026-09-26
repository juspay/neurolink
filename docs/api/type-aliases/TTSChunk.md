[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSChunk

# Type Alias: TTSChunk

> **TTSChunk** = `object`

TTS audio chunk for streaming Text-to-Speech output

Represents a chunk of audio data generated during streaming TTS.
Used in StreamChunk type to deliver audio alongside text content.

## Properties

### data

> **data**: `Buffer`

Audio data chunk as Buffer

---

### format

> **format**: [`TTSAudioFormat`](TTSAudioFormat.md)

Audio format of this chunk

---

### index

> **index**: `number`

Chunk sequence number (0-indexed)

---

### isFinal

> **isFinal**: `boolean`

Whether this is the final audio chunk

---

### cumulativeSize?

> `optional` **cumulativeSize?**: `number`

Cumulative audio size in bytes so far

---

### estimatedDuration?

> `optional` **estimatedDuration?**: `number`

Estimated total duration in seconds (if available)

---

### voice?

> `optional` **voice?**: `string`

Voice used for generation

---

### sampleRate?

> `optional` **sampleRate?**: `number`

Sample rate in Hz
