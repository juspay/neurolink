[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioStreamChunk

# Type Alias: AudioStreamChunk

> **AudioStreamChunk** = `object`

Audio stream chunk for streaming operations

## Properties

### data

> **data**: `Buffer`

Audio data

---

### index

> **index**: `number`

Chunk index

---

### isFinal

> **isFinal**: `boolean`

Whether this is the final chunk

---

### format

> **format**: [`TTSAudioFormat`](TTSAudioFormat.md)

Audio format

---

### sampleRate

> **sampleRate**: `number`

Sample rate

---

### timestampMs

> **timestampMs**: `number`

Timestamp offset in milliseconds

---

### durationMs

> **durationMs**: `number`

Duration of this chunk in milliseconds
