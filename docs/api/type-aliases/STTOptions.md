[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTOptions

# Type Alias: STTOptions

> **STTOptions** = `object`

Defined in: [types/stt.ts:19](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L19)

STT configuration options

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/stt.ts:21](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L21)

Enable STT processing

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/stt.ts:23](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L23)

Override STT provider

---

### language?

> `optional` **language?**: `string`

Defined in: [types/stt.ts:25](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L25)

Language code for transcription (e.g., "en-US")

---

### format?

> `optional` **format?**: [`TTSAudioFormat`](TTSAudioFormat.md)

Defined in: [types/stt.ts:27](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L27)

Audio format of input

---

### sampleRate?

> `optional` **sampleRate?**: `number`

Defined in: [types/stt.ts:29](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L29)

Sample rate in Hz

---

### punctuation?

> `optional` **punctuation?**: `boolean`

Defined in: [types/stt.ts:31](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L31)

Enable punctuation in transcription

---

### punctuate?

> `optional` **punctuate?**: `boolean`

Defined in: [types/stt.ts:33](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L33)

Enable punctuation (alias)

---

### profanityFilter?

> `optional` **profanityFilter?**: `boolean`

Defined in: [types/stt.ts:35](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L35)

Enable profanity filter

---

### speakerDiarization?

> `optional` **speakerDiarization?**: `boolean`

Defined in: [types/stt.ts:37](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L37)

Enable speaker diarization

---

### diarization?

> `optional` **diarization?**: `boolean`

Defined in: [types/stt.ts:39](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L39)

Enable speaker diarization (alias)

---

### speakerCount?

> `optional` **speakerCount?**: `number`

Defined in: [types/stt.ts:41](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L41)

Number of speakers (for diarization)

---

### wordTimestamps?

> `optional` **wordTimestamps?**: `boolean`

Defined in: [types/stt.ts:43](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L43)

Enable word-level timestamps

---

### model?

> `optional` **model?**: `string`

Defined in: [types/stt.ts:45](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L45)

Model variant to use

---

### vocabulary?

> `optional` **vocabulary?**: `string`[]

Defined in: [types/stt.ts:47](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L47)

Custom vocabulary/phrases

---

### confidenceThreshold?

> `optional` **confidenceThreshold?**: `number`

Defined in: [types/stt.ts:49](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L49)

Minimum confidence threshold

---

### maxAudioBytes?

> `optional` **maxAudioBytes?**: `number`

Defined in: [types/stt.ts:55](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L55)

Maximum audio buffer size in bytes. STTProcessor rejects buffers over
this limit before any provider call, preventing OOM on multi-GB inputs.
Default: 25_000_000 (matches Whisper's documented 25MB ceiling).
