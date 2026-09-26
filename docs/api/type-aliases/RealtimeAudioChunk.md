[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeAudioChunk

# Type Alias: RealtimeAudioChunk

> **RealtimeAudioChunk** = `object`

Realtime audio chunk

## Properties

### data

> **data**: `Buffer`

Audio data

---

### index

> **index**: `number`

Chunk sequence number

---

### isFinal

> **isFinal**: `boolean`

Whether this is the final chunk

---

### format

> **format**: [`TTSAudioFormat`](TTSAudioFormat.md)

Audio format

---

### sampleRate?

> `optional` **sampleRate?**: `number`

Sample rate

---

### durationMs?

> `optional` **durationMs?**: `number`

Duration of this chunk in milliseconds
