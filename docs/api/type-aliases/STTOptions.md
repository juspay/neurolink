[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTOptions

# Type Alias: STTOptions

> **STTOptions** = `object`

STT configuration options

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Enable STT processing

---

### provider?

> `optional` **provider?**: `string`

Override STT provider

---

### language?

> `optional` **language?**: `string`

Language code for transcription (e.g., "en-US")

---

### format?

> `optional` **format?**: [`TTSAudioFormat`](TTSAudioFormat.md)

Audio format of input

---

### sampleRate?

> `optional` **sampleRate?**: `number`

Sample rate in Hz

---

### punctuation?

> `optional` **punctuation?**: `boolean`

Enable punctuation in transcription

---

### punctuate?

> `optional` **punctuate?**: `boolean`

Enable punctuation (alias)

---

### profanityFilter?

> `optional` **profanityFilter?**: `boolean`

Enable profanity filter

---

### speakerDiarization?

> `optional` **speakerDiarization?**: `boolean`

Enable speaker diarization

---

### diarization?

> `optional` **diarization?**: `boolean`

Enable speaker diarization (alias)

---

### speakerCount?

> `optional` **speakerCount?**: `number`

Number of speakers (for diarization)

---

### wordTimestamps?

> `optional` **wordTimestamps?**: `boolean`

Enable word-level timestamps

---

### model?

> `optional` **model?**: `string`

Model variant to use

---

### vocabulary?

> `optional` **vocabulary?**: `string`[]

Custom vocabulary/phrases

---

### confidenceThreshold?

> `optional` **confidenceThreshold?**: `number`

Minimum confidence threshold

---

### maxAudioBytes?

> `optional` **maxAudioBytes?**: `number`

Maximum audio buffer size in bytes. STTProcessor rejects buffers over
this limit before any provider call, preventing OOM on multi-GB inputs.
Default: 25_000_000 (matches Whisper's documented 25MB ceiling).
